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

    const searchStartUTC = localStartOfDay.minus({ days: 1 }).toJSDate();
    const searchEndUTC = localEndOfDay.plus({ days: 1 }).toJSDate();

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
    const isLocationFiltered = location && String(location).toUpperCase() !== "ALL" && !isNaN(Number(location));
    const locationIdNum = isLocationFiltered ? Number(location) : null;

    // ────────────────────────────────────────────────
    // 3️⃣ Employee Where Clause
    // ────────────────────────────────────────────────
    const employeeWhere = {
      organizationId,
      deletedAt: null,
      NOT: { role: "ADMIN" },
    };

    if (isLocationFiltered) {
      employeeWhere.companyId = locationIdNum;
    }

    // ────────────────────────────────────────────────
    // 4️⃣ Employees with today's Attendance (in org tz)
    // ────────────────────────────────────────────────
    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      include: {
        Attendance: {
          where: {
            OR: [
              {
                date: {
                  gte: searchStartUTC,
                  lte: searchEndUTC,
                },
              },
              {
                checkInTime: {
                  gte: searchStartUTC,
                  lte: searchEndUTC,
                },
              },
            ],
          },
          orderBy: { createdAt: "desc" },
          include: {
            activities: {
              orderBy: { startTime: "asc" },
            },
          },
        },
      },
      orderBy: { firstName: "asc" },
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
    const targetDateStr = selectedDateQuery.toFormat("yyyy-MM-dd");
    const attendanceWidget = employees.map((emp) => {
      const attendance = emp.Attendance.find((att) => {
        const keys = new Set();
        if (att.date) {
          keys.add(DateTime.fromJSDate(new Date(att.date)).toFormat("yyyy-MM-dd"));
          keys.add(DateTime.fromJSDate(new Date(att.date), { zone: orgTimeZone }).toFormat("yyyy-MM-dd"));
          keys.add(DateTime.fromJSDate(new Date(att.date), { zone: "utc" }).toFormat("yyyy-MM-dd"));
        }
        if (att.checkInTime) {
          keys.add(DateTime.fromJSDate(new Date(att.checkInTime)).toFormat("yyyy-MM-dd"));
          keys.add(DateTime.fromJSDate(new Date(att.checkInTime), { zone: orgTimeZone }).toFormat("yyyy-MM-dd"));
          keys.add(DateTime.fromJSDate(new Date(att.checkInTime), { zone: "utc" }).toFormat("yyyy-MM-dd"));
        }
        return keys.has(targetDateStr);
      }) || emp.Attendance[0];

      let status = "ABSENT";

      if (leaveEmployeeIds.includes(emp.id)) {
        status = "LEAVE";
      } else if (attendance && attendance.checkInTime) {
        const hasOpenBreak = attendance.activities?.some(
          (a) => a.type === "BREAK" && !a.endTime
        );
        if (attendance.status === "BREAK" || hasOpenBreak) {
          status = "BREAK";
        } else if (attendance.isLate || attendance.status === "LATE") {
          status = "LATE";
        } else {
          status = "PRESENT";
        }
      }

      return {
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        email: emp.email || "N/A",
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

    const lateToday = attendanceWidget.filter(
      (e) => e.isLate || e.status === "LATE"
    ).length;

    const overtimeRequests = await prisma.overtime.count({
      where: {
        OR: [
          { date: { gte: startOfDayUTC, lte: endOfDayUTC } },
          { createdAt: { gte: startOfDayUTC, lte: endOfDayUTC } },
        ],
        employee: {
          organizationId,
          deletedAt: null,
          NOT: { role: "ADMIN" },
          ...(isLocationFiltered ? { companyId: locationIdNum } : {}),
        },
      },
    });

    const onLeave = leaveEmployeeIds.length;
    const absentToday = Math.max(0, totalEmployees - presentToday - onLeave);

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
          ...(isLocationFiltered ? { companyId: locationIdNum } : {}),
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
        lateToday,
        overtimeRequests,
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

    if (location && String(location).toUpperCase() !== "ALL") {
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
    const { date } = req.query;

    const employee = await prisma.employee.findUnique({
      where: { id: userId },
      include: {
        company: true,
        organization: true,
        payroll: true,
      },
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const companyName = employee?.company?.name || employee?.organization?.name || "Frontpin";
    const timezone = employee?.company?.timezone || "UTC";

    let start, end;
    if (date) {
      const mDate = moment.tz(date, timezone);
      start = mDate.clone().startOf("month").subtract(1, "day").startOf("day").utc().toDate();
      end = mDate.clone().endOf("month").add(1, "day").endOf("day").utc().toDate();
    } else {
      const mDate = moment.tz(timezone);
      start = mDate.clone().startOf("month").subtract(1, "day").startOf("day").utc().toDate();
      end = mDate.clone().endOf("month").add(1, "day").endOf("day").utc().toDate();
    }

    // 🔥 Fetch only this user's assignee records
    const weeklyAssignees = await prisma.taskAssignee.findMany({
      where: {
        employeeId: userId,
        task: {
          deletedAt: null,
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
          t.deadline && new Date(t.deadline) < new Date() && t.myStatus !== "COMPLETED"
      ).length,
    };

    // 🔥 Attendance same as before, including punches
    const weeklyAttendance = await prisma.attendance.findMany({
      where: {
        employeeId: userId,
        date: { gte: start, lte: end },
      },
      include: {
        punches: {
          orderBy: { punchTime: "asc" },
        },
      },
      orderBy: { date: "asc" },
    });

    // 🔥 Fetch user's leave requests
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        employeeId: userId,
      },
      include: {
        leaveType: true,
      },
      orderBy: {
        startDate: "desc",
      },
      take: 5,
    });

    // 🔥 Fetch user's overtime logs
    const overtimes = await prisma.overtime.findMany({
      where: {
        employeeId: userId,
      },
      orderBy: {
        date: "desc",
      },
      take: 5,
    });

    // 🔥 User Schedule & Today's Working/Off Status
    const userSchedule = await prisma.schedule.findFirst({
      where: { employeeId: userId, deletedAt: null },
    });

    const todayMoment = moment.tz(timezone);
    const todayDayShort = todayMoment.format("ddd"); // "Mon", "Tue", etc.
    let isTodayOff = false;

    if (userSchedule && userSchedule.days) {
      let scheduleDays = [];
      if (Array.isArray(userSchedule.days)) {
        scheduleDays = userSchedule.days;
      } else if (typeof userSchedule.days === "string") {
        try { scheduleDays = JSON.parse(userSchedule.days); } catch(e) {}
      }
      if (scheduleDays.length > 0) {
        isTodayOff = !scheduleDays.some((d) => {
          const str = typeof d === "object" && d !== null ? (d.day || d.dayFull || d.name || "") : String(d || "");
          return str.toLowerCase().startsWith(todayDayShort.toLowerCase());
        });
      }
    } else {
      // Default weekend check (Saturday / Sunday)
      const dayNum = todayMoment.day();
      if (dayNum === 0 || dayNum === 6) {
        isTodayOff = true;
      }
    }

    // 🔥 Real-Time Upcoming Holiday Calculation
    const todayStart = todayMoment.clone().startOf("day");
    const cYear = todayStart.year();

    const annualHolidays = [
      { title: "Kashmir Day", date: `${cYear}-02-05` },
      { title: "Pakistan Day", date: `${cYear}-03-23` },
      { title: "Labor Day", date: `${cYear}-05-01` },
      { title: "Youm-e-Ashur", date: `${cYear}-07-14` },
      { title: "Independence Day", date: `${cYear}-08-14` },
      { title: "Defense Day", date: `${cYear}-09-06` },
      { title: "Milad-un-Nabi", date: `${cYear}-09-16` },
      { title: "Iqbal Day", date: `${cYear}-11-09` },
      { title: "Quaid-e-Azam Day", date: `${cYear}-12-25` },
      { title: "New Year's Day", date: `${cYear + 1}-01-01` },
    ];

    let nextHoliday = annualHolidays
      .map((h) => ({ ...h, mDate: moment.tz(h.date, "YYYY-MM-DD", timezone) }))
      .filter((h) => h.mDate.isSameOrAfter(todayStart))
      .sort((a, b) => a.mDate.diff(b.mDate))[0];

    if (!nextHoliday) {
      nextHoliday = {
        title: "New Year's Day",
        date: `${cYear + 1}-01-01`,
        mDate: moment.tz(`${cYear + 1}-01-01`, "YYYY-MM-DD", timezone),
      };
    }

    const daysLeftNum = nextHoliday.mDate.diff(todayStart, "days");
    const upcomingHoliday = {
      title: nextHoliday.title,
      date: nextHoliday.mDate.format("MMM D, YYYY"),
      daysLeft:
        daysLeftNum === 0
          ? "Today"
          : daysLeftNum === 1
          ? "1 Day Left"
          : `${daysLeftNum} Days Left`,
    };

    // 🔥 Leave Balances – per leave type for current year
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    const leaveTypes = await prisma.leaveType.findMany({
      where: {
        organizationId: employee.organizationId,
        isActive: true,
      },
    });

    const approvedLeaves = await prisma.leaveRequest.groupBy({
      by: ["leaveTypeId"],
      where: {
        employeeId: userId,
        status: "APPROVED",
        startDate: { gte: yearStart, lte: yearEnd },
      },
      _sum: { days: true },
    });

    const usedMap = {};
    for (const item of approvedLeaves) {
      usedMap[item.leaveTypeId] = item._sum.days || 0;
    }

    const getQuota = (lt) => {
      const code = String(lt.code || "").toUpperCase();
      const name = String(lt.name || "").toUpperCase();

      if (code.includes("ANNUAL") || name.includes("ANNUAL")) {
        return employee?.payroll?.annualLeaves ?? 17;
      }
      if (code.includes("CASUAL") || name.includes("CASUAL")) {
        return employee?.payroll?.casualLeaves ?? 10;
      }
      if (code.includes("SUDDEN") || name.includes("SUDDEN") || name.includes("SICK")) {
        return employee?.payroll?.suddenLeaves ?? 12;
      }
      if (code.includes("MONTHLY") || name.includes("MONTHLY")) {
        return employee?.payroll?.monthlyLeaves ?? 3;
      }
      return 15;
    };

    const leaveBalances = leaveTypes.map((lt) => {
      const used = usedMap[lt.id] || 0;
      const total = getQuota(lt);
      return {
        id: lt.id,
        name: lt.name,
        code: lt.code,
        used,
        total,
        available: Math.max(0, total - used),
      };
    });

    // 🔥 Real-Time Payroll Summary for Specific Logged-in User
    const latestPayrollRecord = await prisma.payroll.findFirst({
      where: { employeeId: userId },
      include: { components: true },
      orderBy: { createdAt: "desc" },
    });

    let payrollSummary = null;
    if (latestPayrollRecord) {
      const currency = latestPayrollRecord.currency || employee?.payroll?.currency || "PKR";

      const baseSalary = Number(latestPayrollRecord.rate || latestPayrollRecord.grossSalary || 0);

      const extraEarnings = (latestPayrollRecord.components || [])
        .filter(c => ["BASIC","ALLOWANCE","BONUS","COMMISSION","OVERTIME","INCREMENT","KPIS","BOUNTY","ARREARS"].includes(String(c.type || "").toUpperCase()))
        .reduce((s, c) => s + Number(c.amount || 0), 0);

      const extraDeductions = (latestPayrollRecord.components || [])
        .filter(c => ["TAX","LOAN","DEDUCTION","TARDIES","UNPAID","FOOD","CT","GYM","ADVANCE"].includes(String(c.type || "").toUpperCase()))
        .reduce((s, c) => s + Number(c.amount || 0), 0);

      const computedNet = Math.max(0, baseSalary + extraEarnings - extraDeductions);

      payrollSummary = {
        id: latestPayrollRecord.id,
        amount: `${currency} ${computedNet.toLocaleString()}`,
        month: moment(latestPayrollRecord.periodStart || latestPayrollRecord.month).format("MMMM YYYY"),
        paidDate: latestPayrollRecord.paidDate
          ? moment(latestPayrollRecord.paidDate).format("MMM D, YYYY")
          : "Paid",
        status: latestPayrollRecord.status || "PAID",
        hasRecord: true,
        hasGeneratedPayroll: true,
      };
    } else if (employee?.payroll) {
      const currency = employee.payroll.currency || "PKR";
      payrollSummary = {
        amount: `${currency} ${Number(employee.payroll.rate || 0).toLocaleString()}`,
        month: `Base Salary (${employee.payroll.payoutType || 'monthly'})`,
        paidDate: "Active Payroll",
        status: "ACTIVE",
        hasRecord: true,
      };
    } else {
      payrollSummary = {
        amount: "No Payroll Record",
        month: "Pending Setup",
        paidDate: "Contact Admin",
        status: "UNSET",
        hasRecord: false,
      };
    }

    return res.json({
      taskStats,
      weeklyTasks,
      weeklyAttendance,
      companyName,
      leaves,
      overtimes,
      leaveBalances,
      payrollSummary,
      upcomingHoliday,
      isTodayOff,
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
          NOT: { role: "ADMIN" },
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

    // Fetch organization timezone for date handling
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { orgTimeZone: true },
    });
    const orgTimeZone = organization?.orgTimeZone || "Asia/Karachi";

    let selectedDateQuery = queryDate
      ? DateTime.fromISO(queryDate, { zone: orgTimeZone })
      : DateTime.now().setZone(orgTimeZone);

    if (!selectedDateQuery.isValid) {
      selectedDateQuery = DateTime.now().setZone(orgTimeZone);
    }

    const localStartOfDay = selectedDateQuery.startOf("day");
    const localEndOfDay = localStartOfDay.endOf("day");

    const startOfDayUTC = localStartOfDay.toJSDate();
    const endOfDayUTC = localEndOfDay.toJSDate();

    const searchStartUTC = localStartOfDay.minus({ days: 1 }).toJSDate();
    const searchEndUTC = localEndOfDay.plus({ days: 1 }).toJSDate();
    const targetDateStr = selectedDateQuery.toFormat("yyyy-MM-dd");

    // Location filter (companyId)
    const isLocFiltered = queryLocation && String(queryLocation).toUpperCase() !== "ALL" && !isNaN(Number(queryLocation));
    const locationFilter = isLocFiltered ? { companyId: Number(queryLocation) } : {};

    let list = [];

    // Fetch all employees in org/location along with today's Attendance and approved leaves
    const allEmployees = await prisma.employee.findMany({
      where: {
        organizationId,
        deletedAt: null,
        NOT: { role: "ADMIN" },
        ...(role === "SUPERVISOR" ? { supervisorId: userId } : {}),
        ...(role === "USER" ? { id: userId } : {}),
        ...locationFilter,
      },
      include: {
        department: { select: { title: true } },
        jobInfo: true,
        Attendance: {
          where: {
            OR: [
              {
                date: {
                  gte: searchStartUTC,
                  lte: searchEndUTC,
                },
              },
              {
                checkInTime: {
                  gte: searchStartUTC,
                  lte: searchEndUTC,
                },
              },
            ],
          },
          orderBy: { createdAt: "desc" },
          include: {
            activities: {
              orderBy: { startTime: "asc" },
            },
          },
        },
      },
      orderBy: { firstName: "asc" },
    });

    const empIds = allEmployees.map((e) => e.id);

    const approvedLeaves = await prisma.leaveRequest.findMany({
      where: {
        organizationId,
        status: "APPROVED",
        startDate: { lte: endOfDayUTC },
        endDate: { gte: startOfDayUTC },
        employeeId: { in: empIds },
      },
      include: {
        leaveType: { select: { name: true } },
      },
    });

    const leaveMap = new Map(approvedLeaves.map((l) => [l.employeeId, l]));

    // Construct full unified employee attendance status list
    const unifiedEmployeeList = allEmployees.map((emp) => {
      const att = emp.Attendance.find((a) => {
        const keys = new Set();
        if (a.date) {
          keys.add(DateTime.fromJSDate(new Date(a.date)).toFormat("yyyy-MM-dd"));
          keys.add(DateTime.fromJSDate(new Date(a.date), { zone: orgTimeZone }).toFormat("yyyy-MM-dd"));
          keys.add(DateTime.fromJSDate(new Date(a.date), { zone: "utc" }).toFormat("yyyy-MM-dd"));
        }
        if (a.checkInTime) {
          keys.add(DateTime.fromJSDate(new Date(a.checkInTime)).toFormat("yyyy-MM-dd"));
          keys.add(DateTime.fromJSDate(new Date(a.checkInTime), { zone: orgTimeZone }).toFormat("yyyy-MM-dd"));
          keys.add(DateTime.fromJSDate(new Date(a.checkInTime), { zone: "utc" }).toFormat("yyyy-MM-dd"));
        }
        return keys.has(targetDateStr);
      }) || emp.Attendance[0];
      const leave = leaveMap.get(emp.id);

      let status = "absent";
      let clockIn = "—";
      let clockOut = "—";
      let isLate = false;
      let lateMinutes = 0;

      if (leave) {
        status = "on_leave";
      } else if (att && att.checkInTime) {
        clockIn = moment(att.checkInTime).format("hh:mm A");
        if (att.checkOutTime) {
          clockOut = moment(att.checkOutTime).format("hh:mm A");
        }
        isLate = Boolean(att.isLate || att.status === "LATE");
        lateMinutes = att.lateMinutes || 0;

        const hasOpenBreak = att.activities?.some(
          (a) => a.type === "BREAK" && !a.endTime
        );
        if (att.status === "BREAK" || hasOpenBreak) {
          status = "break";
        } else if (isLate) {
          status = "late";
        } else {
          status = "present";
        }
      }

      return {
        id: emp.id,
        attendanceId: att?.id,
        name: `${emp.firstName} ${emp.lastName}`,
        email: emp.email || "N/A",
        department: emp.department?.title || "N/A",
        role: emp.role,
        status,
        clockIn,
        clockOut,
        isLate,
        lateMinutes,
        late: isLate ? `${lateMinutes} min late` : "On time",
        activities: att?.activities || [],
        jobInfo: emp.jobInfo || {},
        leaveType: leave?.leaveType?.name,
        leaveDates: leave
          ? `${moment(leave.startDate).format("DD MMM")} - ${moment(leave.endDate).format("DD MMM")}`
          : null,
      };
    });

    switch (category) {
      // ────────────────────────────────────────────────
      // total-employees
      // ────────────────────────────────────────────────
      case "total-employees":
        list = unifiedEmployeeList;
        break;

      // ────────────────────────────────────────────────
      // present-today
      // ────────────────────────────────────────────────
      case "present-today":
        list = unifiedEmployeeList.filter((e) =>
          ["present", "late", "break", "working"].includes(e.status)
        );
        break;

      // ────────────────────────────────────────────────
      // absent-today
      // ────────────────────────────────────────────────
      case "absent-today":
        list = unifiedEmployeeList.filter((e) => e.status === "absent");
        break;

      // ────────────────────────────────────────────────
      // on-leave
      // ────────────────────────────────────────────────
      case "on-leave":
        list = unifiedEmployeeList.filter((e) => e.status === "on_leave");
        break;

      // ────────────────────────────────────────────────
      // late-tardy & late-today
      // ────────────────────────────────────────────────
      case "late-tardy":
      case "late-today":
        list = unifiedEmployeeList.filter((e) => e.isLate || e.status === "late");
        break;

      case "overtime-requests":
      case "overtime":
        const overtimeWhere = {
          OR: [
            { date: { gte: startOfDayUTC, lte: endOfDayUTC } },
            { createdAt: { gte: startOfDayUTC, lte: endOfDayUTC } },
          ],
          employee: {
            organizationId,
            deletedAt: null,
            NOT: { role: "ADMIN" },
            ...(role === "SUPERVISOR" ? { supervisorId: userId } : {}),
            ...(role === "USER" ? { id: userId } : {}),
            ...locationFilter,
          },
        };

        const overtimes = await prisma.overtime.findMany({
          where: overtimeWhere,
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        list = overtimes.map((o) => ({
          id: o.id,
          employeeId: o.employeeId,
          name: `${o.employee.firstName} ${o.employee.lastName}`,
          email: o.employee.email || "N/A",
          status: o.status ? o.status.toLowerCase() : "pending",
          hours: o.hours || 0,
          date: o.date ? moment(o.date).format("MMM DD, YYYY") : "N/A",
          reason: o.reason || "N/A",
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
