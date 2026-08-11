const prisma = require("../../config/prisma");
const moment = require("moment-timezone");
const { DateTime } = require("luxon"); // or import { DateTime } from 'luxon';
/* ---------------------------------- */
/* Helper: Get Start & End of Week */
/* ---------------------------------- */
const getWeekRange = () => {
  const now = new Date();
  const first = now.getDate() - now.getDay();
  const start = new Date(now.setDate(first));
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

/* ---------------------------------- */
/* ADMIN DASHBOARD */
/* ---------------------------------- */
const getAdminDashboard = async (req, res) => {
  const organizationId = req.user?.orgId; // assuming this is set correctly (was req.user.orgId earlier?)

  try {
    // ────────────────────────────────────────────────
    //  Fetch organization to get timezone
    // ────────────────────────────────────────────────
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { orgTimeZone: true },
    });

    const orgTimeZone = organization?.orgTimeZone || "Asia/Karachi";

    // ────────────────────────────────────────────────
    // 1️⃣ Selected Date – interpret in org timezone
    // ────────────────────────────────────────────────
    let selectedDateQuery = req.query.date
      ? DateTime.fromISO(req.query.date, { zone: orgTimeZone })
      : DateTime.now().setZone(orgTimeZone);

    // Start of the selected day in org timezone (00:00:00)
    const localStartOfDay = selectedDateQuery.startOf("day");
    const localEndOfDay = localStartOfDay.endOf("day"); // 23:59:59.999

    // For Prisma (which expects UTC Date objects)
    const startOfDayUTC = localStartOfDay.toJSDate();
    const endOfDayUTC = localEndOfDay.toJSDate();

    // ────────────────────────────────────────────────
    // Week range – start of week (Monday) to end of week (Sunday)
    // ────────────────────────────────────────────────
    const { start: localWeekStart, end: localWeekEnd } = getWeekRangeLuxon(
      localStartOfDay,
      orgTimeZone
    );

    const weekStartUTC = localWeekStart.toJSDate();
    const weekEndUTC = localWeekEnd.toJSDate();

    // ────────────────────────────────────────────────
    // 2️⃣ Location Filter
    // ────────────────────────────────────────────────
    const location = req.query.location;

    // ────────────────────────────────────────────────
    // 3️⃣ Employee Where Clause
    // ────────────────────────────────────────────────
    const employeeWhere = {
      organizationId,
      deletedAt: null,
    };

    if (location && location !== "ALL") {
      employeeWhere.companyId = Number(location); // assuming location = companyId
      // If your field is actually called locationId → keep as-is
    }

    // ────────────────────────────────────────────────
    // 4️⃣ Employees with today's Attendance (in org tz)
    // ────────────────────────────────────────────────
    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      include: {
        Attendance: {
          where: {
            date: {
              gte: startOfDayUTC,
              lt: endOfDayUTC, // exclusive end → covers full day
            },
          },
          include: {
            activities: true,
          },
        },
      },
    });

    const employeeIds = employees.map((e) => e.id);

    // ────────────────────────────────────────────────
    // 5️⃣ Approved Leaves overlapping selected day
    // ────────────────────────────────────────────────
    const leavesToday = await prisma.leaveRequest.findMany({
      where: {
        organizationId,
        status: "APPROVED",
        startDate: { lte: endOfDayUTC },
        endDate: { gte: startOfDayUTC },
        employeeId: { in: employeeIds },
      },
    });

    const leaveEmployeeIds = leavesToday.map((l) => l.employeeId);

    // ────────────────────────────────────────────────
    // 6️⃣ Attendance Widget
    // ────────────────────────────────────────────────
    const attendanceWidget = employees.map((emp) => {
      const attendance = emp.Attendance[0];

      let status = "ABSENT";

      if (leaveEmployeeIds.includes(emp.id)) {
        status = "LEAVE";
      } else if (attendance) {
        if (attendance.status === "BREAK") {
          status = "BREAK";
        } else if (attendance.checkInTime) {
          status = attendance.isLate ? "LATE" : "PRESENT";
        }
      }

      return {
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        status,
        checkInTime: attendance?.checkInTime || null,
        checkOutTime: attendance?.checkOutTime || null,
        isLate: attendance?.isLate || false,
        activities: attendance?.activities ? attendance?.activities : [],
      };
    });

    // ────────────────────────────────────────────────
    // 7️⃣ Stats Calculation
    // ────────────────────────────────────────────────
    const totalEmployees = employees.length;

    const presentToday = attendanceWidget.filter((e) =>
      ["PRESENT", "LATE", "BREAK"].includes(e.status)
    ).length;

    const onLeave = leaveEmployeeIds.length;
    const absentToday = totalEmployees - presentToday - onLeave;

    // ────────────────────────────────────────────────
    // 8️⃣ Weekly Attendance Trend
    // ────────────────────────────────────────────────
    const weeklyAttendance = await prisma.attendance.groupBy({
      by: ["date", "status"],
      where: {
        date: { gte: weekStartUTC, lte: weekEndUTC },
        employee: {
          organizationId,
          deletedAt: null,
          ...(location && location !== "ALL"
            ? { companyId: Number(location) }
            : {}),
        },
      },
      _count: true,
    });

    // ────────────────────────────────────────────────
    // 9️⃣ Project Status
    // ────────────────────────────────────────────────
    const projectStatus = await prisma.project.groupBy({
      by: ["status"],
      where: {
        organizationId,
        deletedAt: null,
        ...(location && location !== "ALL"
          ? {
              /* add if Project has companyId */
            }
          : {}),
      },
      _count: true,
    });

    // ────────────────────────────────────────────────
    // 🔟 Monthly Task Trend (example – current month)
    // You may want to adjust to use selectedDate's month
    // ────────────────────────────────────────────────
    const monthlyTasks = await prisma.task.groupBy({
      by: ["status"],
      where: {
        deletedAt: null,
        project: {
          organizationId,
          ...(location && location !== "ALL"
            ? {
                /* companyId if exists */
              }
            : {}),
        },
      },
      _count: true,
    });

    // ────────────────────────────────────────────────
    // 1️⃣1️⃣ Other Stats (Parallel)
    // ────────────────────────────────────────────────
    const [activeProjects, completedTasks, pendingTasks] = await Promise.all([
      prisma.project.count({
        where: {
          organizationId,
          status: "IN_PROGRESS",
          deletedAt: null,
          ...(location && location !== "ALL"
            ? {
                /* companyId */
              }
            : {}),
        },
      }),
      prisma.task.count({
        where: {
          deletedAt: null,
          status: "COMPLETED",
          project: {
            organizationId,
            ...(location && location !== "ALL"
              ? {
                
                  /* companyId */
                }
              : {}),
          },
        },
      }),
      prisma.task.count({
        where: {
          deletedAt: null,
          status: { in: ["TODO", "IN_PROGRESS"] },
          deadline: { lt: new Date() }, // ← consider timezone adjustment if needed
          project: {
            organizationId,
            ...(location && location !== "ALL"
              ? {
                  /* companyId */
                }
              : {}),
          },
        },
      }),
    ]);

    // ────────────────────────────────────────────────
    // Final Response
    // ────────────────────────────────────────────────
    return res.json({
      selectedDate: localStartOfDay.toISODate(), // return in org tz (YYYY-MM-DD)
      timeZone: orgTimeZone,
      location: location || "ALL",
      stats: {
        totalEmployees,
        presentToday,
        onLeave,
        absentToday,
        activeProjects,
        completedTasks,
        pendingTasks,
      },
      leaveEmployees: leavesToday,
      attendanceWidget,
      charts: {
        weeklyAttendance,
        projectStatus,
        monthlyTasks,
      },
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    return res
      .status(500)
      .json({ message: "Dashboard error", error: error.message });
  }
};

// src/controllers/dashboard.controller.js



/**
 * GET /api/dashboard/weekly-timesheet
 * Query: ?date=2025-02-24&location=5  or location=ALL
 */
const getWeeklyTimesheet = async (req, res) => {
  try {
    const organizationId = req.user.orgId;
    const role = req.user.role;

    // ── 1. Organization timezone ──
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { orgTimeZone: true },
    });
    const tz = org?.orgTimeZone || "Asia/Karachi";

    // ── 2. Reference date (in org timezone) ──
    let refDate = req.query.date
      ? DateTime.fromISO(req.query.date, { zone: tz })
      : DateTime.now().setZone(tz);

    if (!refDate.isValid) {
      refDate = DateTime.now().setZone(tz);
    }

    // ── 3. Week range: Monday 00:00 → Sunday 23:59:59 (org tz) ──
    const weekStart = refDate.startOf('week');     // Luxon → Monday by default
    const weekEnd   = refDate.endOf('week');

    const weekStartUTC = weekStart.toJSDate();
    const weekEndUTC   = weekEnd.toJSDate();

    // ── 4. Location / company filter ──
    let companyWhere = {};
    const location = req.query.location;

    if (location && location !== "ALL") {
      const companyId = Number(location);
      if (!isNaN(companyId)) {
        companyWhere = { companyId };
      }
    }

    // ── 5. Get relevant employee IDs ──
    const employees = await prisma.employee.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...companyWhere,
        // Optional: restrict supervisors to their team
        ...(role === "SUPERVISOR" ? { OR: [{ id: req.user.id }, { supervisorId: req.user.id }] } : {}),
      },
      select: { id: true },
    });

    const employeeIds = employees.map(e => e.id);

    if (employeeIds.length === 0) {
      return res.json({
        weekStart: weekStart.toISODate(),
        weekEnd: weekEnd.toISODate(),
        timezone: tz,
        data: [],
        message: "No employees found for this filter",
      });
    }

    // ── A. Activity-based breakdown (most accurate) ──
    const activities = await prisma.activityLog.groupBy({
      by: ['type'],
      where: {
        employeeId: { in: employeeIds },
        startTime: { gte: weekStartUTC, lte: weekEndUTC },
      },
      _sum: { durationMinutes: true },
    });

    // ── B. Approved overtime ──
    const ot = await prisma.overtime.groupBy({
      by: ['date'],
      where: {
        employeeId: { in: employeeIds },
        status: "APPROVED",
        date: { gte: weekStartUTC, lte: weekEndUTC },
      },
      _sum: { hours: true },
    });

    // ── C. Attendance fallback (if needed) ──
    const attendanceSummary = await prisma.attendance.groupBy({
      by: ['date'],
      where: {
        employeeId: { in: employeeIds },
        date: { gte: weekStartUTC, lte: weekEndUTC },
      },
      _sum: {
        totalWorkedMinutes: true,
        totalBreakMinutes: true,
      },
    });

    // ── Build 7-day array ──
    const data = [];
    for (let i = 0; i < 7; i++) {
      const day = weekStart.plus({ days: i });
      const dayUTC = day.toJSDate();
      const dayName = day.toFormat('EEE'); // Mon, Tue, ...

      // Find matching records
      const dayActivities = activities.filter(a => {
        // You may need to group activities by date first if you want per-day precision
        // For simplicity we sum whole week here → adjust if needed
        return true; // ← improve later
      });

      // Better: query per day if volume is high
      const dayWorkingMin = await prisma.activityLog.aggregate({
        where: {
          employeeId: { in: employeeIds },
          type: { not: "BREAK" },
          startTime: { gte: dayUTC, lt: day.plus({ days: 1 }).toJSDate() },
        },
        _sum: { durationMinutes: true },
      });

      const dayBreakMin = await prisma.activityLog.aggregate({
        where: {
          employeeId: { in: employeeIds },
          type: "BREAK",
          startTime: { gte: dayUTC, lt: day.plus({ days: 1 }).toJSDate() },
        },
        _sum: { durationMinutes: true },
      });

      const dayOvertime = ot.find(o => 
        DateTime.fromJSDate(o.date).toISODate() === day.toISODate()
      )?._sum?.hours || 0;

      data.push({
        day: dayName,
        date: day.toISODate(),
        workingHours:  Number((dayWorkingMin._sum.durationMinutes || 0) / 60).toFixed(2),
        breakHours:    Number((dayBreakMin._sum.durationMinutes   || 0) / 60).toFixed(2),
        overtimeHours: Number(dayOvertime).toFixed(2),
      });
    }

    return res.json({
      success: true,
      weekStart: weekStart.toISODate(),
      weekEnd: weekEnd.toISODate(),
      timezone: tz,
      location: location || "ALL",
      data,
    });
  } catch (err) {
    console.error("weekly-timesheet error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load weekly timesheet",
      error: err.message,
    });
  }
};

// ────────────────────────────────────────────────
// Helper: Week range in given timezone (Monday → Sunday)
// ────────────────────────────────────────────────
function getWeekRangeLuxon(dateTime, timeZone) {
  // dateTime is already in correct zone
  const start = dateTime.startOf("week"); // luxon startOf('week') → Monday by default
  const end = dateTime.endOf("week");
  return { start, end };
}

/* ---------------------------------- */
/* SUPERVISOR DASHBOARD */
/* ---------------------------------- */
const getSupervisorDashboard = async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const organizationId = req.user.orgId;

    const selectedDate = new Date();
    selectedDate.setHours(0, 0, 0, 0);

    /* ---------------------------------- */
    /* 1️⃣ Supervisor + Team Employees */
    /* ---------------------------------- */

    const employees = await prisma.employee.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [{ id: supervisorId }, { supervisorId: supervisorId }],
      },
      include: {
        Attendance: {
          where: { date: selectedDate },
        },
      },
    });

    const employeeIds = employees.map((e) => e.id);

    /* ---------------------------------- */
    /* 2️⃣ Leaves Today */
    /* ---------------------------------- */

    const leavesToday = await prisma.leaveRequest.findMany({
      where: {
        status: "APPROVED",
        startDate: { lte: selectedDate },
        endDate: { gte: selectedDate },
        employeeId: { in: employeeIds },
      },
    });

    const leaveEmployeeIds = leavesToday.map((l) => l.employeeId);

    /* ---------------------------------- */
    /* 3️⃣ Attendance Categorization */
    /* ---------------------------------- */

    const attendanceWidget = employees.map((emp) => {
      const attendance = emp.Attendance[0];

      let status = "ABSENT";

      if (leaveEmployeeIds.includes(emp.id)) {
        status = "LEAVE";
      } else if (attendance) {
        if (attendance.status === "BREAK") {
          status = "BREAK";
        } else if (attendance.checkInTime) {
          status = attendance.isLate ? "LATE" : "PRESENT";
        }
      }

      return {
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        status,
        checkInTime: attendance?.checkInTime || null,
        checkOutTime: attendance?.checkOutTime || null,
      };
    });

    /* ---------------------------------- */
    /* 4️⃣ Stats Calculation */
    /* ---------------------------------- */

    const totalEmployees = employees.length;

    const presentToday = attendanceWidget.filter((e) =>
      ["PRESENT", "LATE", "BREAK"].includes(e.status)
    ).length;

    const onLeave = leaveEmployeeIds.length;

    const absentToday = attendanceWidget.filter(
      (e) => e.status === "ABSENT"
    ).length;

    /* ---------------------------------- */
    /* 5️⃣ Team Tasks */
    /* ---------------------------------- */

    const teamTasks = await prisma.task.findMany({
      where: {
        deletedAt: null,
        assignees: {
          some: {
            employeeId: { in: employeeIds },
          },
        },
      },
      include: {
        project: true,
      },
    });

    const completedTasks = teamTasks.filter((t) =>
      ["DONE", "COMPLETED"].includes(t.status)
    ).length;

    const pendingTasks = teamTasks.filter(
      (t) =>
        t.deadline &&
        t.deadline < new Date() &&
        !["DONE", "COMPLETED"].includes(t.status)
    ).length;

    /* ---------------------------------- */
    /* 6️⃣ Active Projects (Team Based) */
    /* ---------------------------------- */

    const projectIds = [
      ...new Set(teamTasks.map((t) => t.projectId).filter(Boolean)),
    ];

    const activeProjects = await prisma.project.count({
      where: {
        id: { in: projectIds },
        status: { in: ["PLANNING", "IN_PROGRESS"] },
        deletedAt: null,
      },
    });

    /* ---------------------------------- */
    /* RESPONSE */
    /* ---------------------------------- */

    return res.json({
      stats: {
        totalEmployees,
        presentToday,
        onLeave,
        absentToday,
        activeProjects,
        completedTasks,
        pendingTasks,
      },
      attendanceWidget,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Supervisor dashboard error" });
  }
};
const getUserDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const { start, end } = getWeekRange();

    // 🔥 Fetch only this user's assignee records
    const weeklyAssignees = await prisma.taskAssignee.findMany({
      where: {
        employeeId: userId,
        task: {
          deletedAt: null,
          // createdAt: { gte: start, lte: end },
        },
      },
      include: {
        task: {
          include: {
            project: {
              select: { id: true, title: true, status: true },
            },
            createdBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: {
        task: { deadline: "asc" },
      },
    });

    // 🔥 Transform tasks with user's own status
    const weeklyTasks = weeklyAssignees.map((assignee) => ({
      id: assignee.task.id,
      title: assignee.task.title,
      deadline: assignee.task.deadline,
      priority: assignee.task.priority,
      project: assignee.task.project,
      createdBy: assignee.task.createdBy,

      // 🔥 USER SPECIFIC STATUS
      myStatus: assignee.status,
      myProgress: assignee.progress,
      startedAt: assignee.startedAt,
      completedAt: assignee.completedAt,
    }));

    // 🔥 Stats based on USER status (not global task.status)
    const taskStats = {
      total: weeklyTasks.length,
      active: weeklyTasks.filter((t) =>
        ["TODO", "IN_PROGRESS"].includes(t.myStatus)
      ).length,
      completed: weeklyTasks.filter((t) => t.myStatus === "COMPLETED").length,
      overdue: weeklyTasks.filter(
        (t) =>
          t.deadline && t.deadline < new Date() && t.myStatus !== "COMPLETED"
      ).length,
    };

    // 🔥 Attendance same as before
    const weeklyAttendance = await prisma.attendance.findMany({
      where: {
        employeeId: userId,
        date: { gte: start, lte: end },
      },
      orderBy: { date: "asc" },
    });

    return res.json({
      taskStats,
      weeklyTasks,
      weeklyAttendance,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "User dashboard error",
      error: error.message,
    });
  }
};
const getAdminDashboardGraphs = async (req, res) => {
  try {
    const { role, id: userId, orgId: organizationId } = req.user;

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const startOfWeek = new Date();
    startOfWeek.setDate(today.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);

    let teamEmployeeIds = [];

    /* ---------------------------------- */
    /* 1️⃣ Role Based Employee Scope */
    /* ---------------------------------- */

    if (role === "ADMIN") {
      const employees = await prisma.employee.findMany({
        where: {
          organizationId,
          deletedAt: null,
        },
        select: { id: true },
      });

      teamEmployeeIds = employees.map((e) => e.id);
    } else if (role === "SUPERVISOR") {
      const employees = await prisma.employee.findMany({
        where: {
          organizationId,
          deletedAt: null,
          OR: [{ id: userId }, { supervisorId: userId }],
        },
        select: { id: true },
      });

      teamEmployeeIds = employees.map((e) => e.id);
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    /* ---------------------------------- */
    /* 2️⃣ Weekly Attendance Trend */
    /* ---------------------------------- */

    const attendance = await prisma.attendance.findMany({
      where: {
        employeeId: { in: teamEmployeeIds },
        date: {
          gte: startOfWeek,
          lte: today,
        },
      },
    });

    const weeklyAttendance = [];

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);

      const dayName = day.toLocaleDateString("en-US", { weekday: "short" });

      const present = attendance.filter(
        (a) =>
          new Date(a.date).toDateString() === day.toDateString() &&
          ["PRESENT", "LATE", "BREAK"].includes(a.status)
      ).length;

      const absent = attendance.filter(
        (a) =>
          new Date(a.date).toDateString() === day.toDateString() &&
          a.status === "ABSENT"
      ).length;

      weeklyAttendance.push({
        name: dayName,
        present,
        absent,
      });
    }

    /* ---------------------------------- */
    /* 3️⃣ Project Status Distribution */
    /* ---------------------------------- */

    const teamTasks = await prisma.task.findMany({
      where: {
        deletedAt: null,
        assignees: {
          some: {
            employeeId: { in: teamEmployeeIds },
          },
        },
      },
      select: {
        projectId: true,
      },
    });

    const projectIds = [
      ...new Set(teamTasks.map((t) => t.projectId).filter(Boolean)),
    ];

    const projectStatuses = await prisma.project.groupBy({
      by: ["status"],
      where: {
        id: { in: projectIds },
        deletedAt: null,
      },
      _count: true,
    });

    const projectStatusData = projectStatuses.map((p) => ({
      name: p.status,
      value: p._count,
    }));

    /* ---------------------------------- */
    /* 4️⃣ Task Completion Trend (6 Months) */
    /* ---------------------------------- */

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 5);

    const tasks = await prisma.task.findMany({
      where: {
        deletedAt: null,
        createdAt: { gte: sixMonthsAgo },
        assignees: {
          some: {
            employeeId: { in: teamEmployeeIds },
          },
        },
      },
    });

    const taskTrend = [];

    for (let i = 0; i < 6; i++) {
      const month = new Date();
      month.setMonth(today.getMonth() - i);

      const monthName = month.toLocaleString("default", { month: "short" });

      const completed = tasks.filter(
        (t) =>
          new Date(t.createdAt).getMonth() === month.getMonth() &&
          ["DONE", "COMPLETED"].includes(t.status)
      ).length;

      const pending = tasks.filter(
        (t) =>
          new Date(t.createdAt).getMonth() === month.getMonth() &&
          ["TODO", "IN_PROGRESS"].includes(t.status)
      ).length;

      taskTrend.unshift({
        name: monthName,
        completed,
        pending,
      });
    }

    /* ---------------------------------- */
    /* 5️⃣ Employees by Department */
    /* ---------------------------------- */

    const departments = await prisma.department.findMany({
      where: {
        organizationId,
        deletedAt: null,
      },
      include: {
        Employee: {
          where: {
            id: { in: teamEmployeeIds },
            deletedAt: null,
          },
        },
      },
    });

    const departmentData = departments.map((d) => ({
      name: d.title,
      value: d.Employee.length,
    }));

    /* ---------------------------------- */
    /* RESPONSE */
    /* ---------------------------------- */

    res.json({
      weeklyAttendance,
      projectStatusData,
      taskTrend,
      departmentData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error loading graph data" });
  }
};
// src/controllers/dashboard.controller.js

const getStatsDetails = async (req, res) => {
  try {
    const { category } = req.params;
    const { date: queryDate, location: queryLocation } = req.query;
    const user = req.user;
    const userId = user.id;
    const organizationId = user.orgId;
    const role = user.role;

    // Date handling
    const selectedDate = queryDate
      ? moment(queryDate).startOf("day").toDate()
      : moment().startOf("day").toDate();

    // Location filter (companyId)
    const locationFilter =
      queryLocation && queryLocation !== "ALL"
        ? { companyId: Number(queryLocation) }
        : {};

    let list = [];

    switch (category) {
      // ────────────────────────────────────────────────
      // total-employees → same rakh sakte ho
      // ────────────────────────────────────────────────

      case "total-employees":
        if (role === "USER") {
          // User ko sirf apna record dikhana chahiye (optional: ya empty bhi kar sakte ho)
          list = await prisma.employee.findMany({
            where: { id: userId, deletedAt: null },
            include:{
              jobInfo:true,
            },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          });
        } else {
          list = await prisma.employee.findMany({
            where: {
              organizationId,
              deletedAt: null,
              ...(role === "SUPERVISOR" ? { supervisorId: userId } : {}),
            },
          
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              department: { select: { title: true } },
              jobInfo:true
            },
          
            orderBy: { firstName: "asc" },
          });
        }
        list = list.map((e) => ({
          id: e.id,
          name: `${e.firstName} ${e.lastName}`,
          email: e.email,
          role: e.role,
          department: e.department?.title || "N/A",
          jobInfo:e.jobInfo || {}
        }));
        break;

      // ────────────────────────────────────────────────
      // present-today → yeh already sahi kaam kar raha hai
      // (sirf woh jo check-in kiye hain)
      // ────────────────────────────────────────────────
      case "present-today":
        const presentWhere = {
          date: selectedDate,
          checkInTime: { not: null },
          status: { not: "ABSENT" },
          employee: {
            organizationId,
            deletedAt: null,
            ...(role === "SUPERVISOR" ? { supervisorId: userId } : {}),
            ...(role === "USER" ? { id: userId } : {}),
            ...locationFilter,
          },
        };

        const presentAttendances = await prisma.attendance.findMany({
          where: presentWhere,
          include: {
            activities: true,
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { checkInTime: "asc" },
        });

        list = presentAttendances.map((a) => ({
          id: a.employee.id,
          name: `${a.employee.firstName} ${a.employee.lastName}`,
          email: a.employee.email || "N/A",
          status: a.status.toLowerCase(),
          clockIn: a.checkInTime
            ? moment(a.checkInTime).format("hh:mm A")
            : null,
          clockOut: a.checkOutTime
            ? moment(a.checkOutTime).format("hh:mm A")
            : null,
          late: a.isLate ? `${a.lateMinutes} min late` : "On time",
          activities: a.activities,
        }));
        break;

      // ────────────────────────────────────────────────
      // absent-today → **Yeh important change hai**
      // ────────────────────────────────────────────────
      case "absent-today": {
        // 1. Saare possible employees nikaalo
        const employees = await prisma.employee.findMany({
          where: {
            organizationId,
            deletedAt: null,
            ...(role === "SUPERVISOR" ? { supervisorId: userId } : {}),
            ...(role === "USER" ? { id: userId } : {}),
            ...locationFilter,
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
          orderBy: { firstName: "asc" },
        });

        if (employees.length === 0) {
          list = [];
          break;
        }

        const employeeIds = employees.map((e) => e.id);

        // 2. Aaj ke saare attendances (jo bane hain)
        const attendances = await prisma.attendance.findMany({
          where: {
            date: selectedDate,
            employeeId: { in: employeeIds },
          },
          select: {
            employeeId: true,
            checkInTime: true,
            checkOutTime: true,
            status: true,
            isLate: true,
            lateMinutes: true,
          },
        });

        // 3. Aaj ke approved leaves
        const leaves = await prisma.leaveRequest.findMany({
          where: {
            organizationId,
            status: "APPROVED",
            startDate: { lte: selectedDate },
            endDate: { gte: selectedDate },
            employeeId: { in: employeeIds },
          },
          select: { employeeId: true },
        });

        const leaveSet = new Set(leaves.map((l) => l.employeeId));

        // 4. Attendance ko Map mein daalo taaki fast lookup ho
        const attendanceMap = new Map(
          attendances.map((att) => [att.employeeId, att])
        );

        // 5. Absent employees filter karo
        const absentList = employees.filter((emp) => {
          // Leave par hai? → absent nahi
          if (leaveSet.has(emp.id)) return false;

          const att = attendanceMap.get(emp.id);

          // No attendance record → absent
          if (!att) return true;

          // Attendance hai lekin check-in nahi hua → absent
          if (!att.checkInTime) return true;

          // Check-in hua lekin status ABSENT marked → absent
          if (att.status === "ABSENT") return true;

          // Baaki sab present ya break etc. maane jayenge
          return false;
        });

        // 6. Final formatted list
        list = absentList.map((emp) => {
          const att = attendanceMap.get(emp.id);

          return {
            id: emp.id,
            name: `${emp.firstName} ${emp.lastName}`,
            email: emp.email || "N/A",
            status: "absent",
            clockIn: null,
            clockOut: att?.checkOutTime
              ? moment(att.checkOutTime).format("hh:mm A")
              : null,
            late: "N/A",
            note: att ? "No check-in recorded" : "No attendance record today",
          };
        });

        break;
      }

      // on-leave case same rahega
           case "on-leave":
                const leaveWhere = {
                  organizationId,
                  status: "APPROVED",
                  startDate: { lte: today },
                  endDate: { gte: today },
                  employee: {
                    deletedAt: null,
                    ...(role === "SUPERVISOR" ? { supervisorId: userId } : {}),
                    ...(role === "USER" ? { id: userId } : {}),
                  },
                };
                const leaves = await prisma.leaveRequest.findMany({
                  where: leaveWhere,
                  include: {
                    employee: { select: { firstName: true, lastName: true, email: true } },
                    leaveType: { select: { name: true } },
                  },
                });
                list = leaves.map(l => ({
                  id: l.employeeId,
                  name: `${l.employee.firstName} ${l.employee.lastName}`,
                  email: l.employee.email || "N/A",
                  leaveType: l.leaveType.name,
                  dates: `${moment(l.startDate).format("DD MMM")} - ${moment(l.endDate).format("DD MMM")}`,
                  status: "On Leave",
                }));
                break;
              // ── Project Related (sirf admin/supervisor) ──
              case "active-projects":
                if (role === "USER") {
                  // User ko projects nahi dikhane chahiye ya sirf unke assigned projects
                  return res.json({ success: true, list: [], message: "Projects visible to admin/supervisor only" });
                }
                list = await prisma.project.findMany({
                  where: {
                    organizationId,
                    status: { in: ["PLANNING", "IN_PROGRESS"] },
                    deletedAt: null,
                  },
                  select: {
                    id: true,
                    title: true,
                    status: true,
                    progress: true,
                    endDate: true,
                    client: { select: { name: true } },
                  },
                  orderBy: { endDate: "asc" },
                });
                list = list.map(p => ({
                  id: p.id,
                  title: p.title,
                  status: p.status,
                  progress: `${p.progress}%`,
                  deadline: p.endDate ? moment(p.endDate).format("DD MMM YYYY") : "Ongoing",
                  client: p.client?.name || "Internal",
                }));
                break;
              // ── Task Related ── (sab roles ke liye, lekin filter alag)
              case "completed-tasks":
              case "pending-tasks":
              case "total-tasks":
              case "active-tasks":
              case "overdue-tasks":
                const taskWhere = {
                  deletedAt: null,
                  organizationId, // safety ke liye
                };
                // Role-based task filtering
                if (role === "USER") {
                  // Sirf jismein ye employee assignee hai
                  taskWhere.assignees = { some: { employeeId: userId } };
                }
                // Supervisor & Admin → poore organization ke (supervisor team limit kar sakta hai agar chaho)
                // Category-specific filters
                if (category === "completed-tasks") {
                  taskWhere.status = { in: ["DONE", "COMPLETED"] };
                } else if (category === "active-tasks") {
                  taskWhere.status = { in: ["TODO", "IN_PROGRESS"] };
                } else if (category === "overdue-tasks" || category === "pending-tasks" )  {
                  taskWhere.AND = [
                    { deadline: { lt: new Date() } },
                    
                    { status: { notIn: ["DONE", "COMPLETED"] } },
                  ];
                }
                // "total-tasks" → koi extra filter nahi
                const tasks = await prisma.task.findMany({
                  where: taskWhere,
                  include: {
                    project: { select: { title: true } },
                    assignees: {
                      include: { employee: { select: { firstName: true, lastName: true } } },
                    },
                  },
                  orderBy: [
                    { deadline: "asc" },
                    { priority: "desc" },
                  ],
                });
                list = tasks.map(t => ({
                  id: t.id,
                  title: t.title,
                  status: t.status,
                  priority: t.priority,
                  deadline: t.deadline ? moment(t.deadline).format("DD MMM YYYY") : "No deadline",
                  project: t.project?.title || "Standalone",
                  assignees: t.assignees
                    .map(a => `${a.employee.firstName} ${a.employee.lastName}`)
                    .join(", ") || "Unassigned",
                }));
                break;
        default:
          return res.status(400).json({ success: false, message: `Invalid category: ${category}` });
      }
    

    return res.json({
      success: true,
      category,
      list,
      count: list.length,
    });
  } catch (error) {
    console.error("getStatsDetails error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load details",
      error: error.message,
    });
  }
};

module.exports = {
  getAdminDashboard,
  getSupervisorDashboard,
  getUserDashboard,
  getAdminDashboardGraphs,
  getStatsDetails,
  getWeeklyTimesheet,
};
