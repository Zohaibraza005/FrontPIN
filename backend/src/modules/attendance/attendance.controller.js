// attendance.controller.js

const prisma = require("../../config/prisma");
const moment = require("moment-timezone");

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // meters
  const toRad = (value) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function isOffDay(schedules, date) {
  if (!schedules) return false;
  const scheduleList = Array.isArray(schedules) ? schedules : [schedules];
  const activeSchedule = scheduleList.find((s) => s && !s.deletedAt);
  if (
    !activeSchedule ||
    !activeSchedule.days ||
    !Array.isArray(activeSchedule.days) ||
    activeSchedule.days.length === 0
  ) {
    return false;
  }

  const mDate = typeof date === "string" ? moment(date, "YYYY-MM-DD") : moment(date);
  const shortDay = mDate.format("ddd").toLowerCase();
  const fullDay = mDate.format("dddd").toLowerCase();

  const daysArr = activeSchedule.days.map((d) => String(d).trim().toLowerCase());

  const isWorkingDay = daysArr.includes(shortDay) || daysArr.includes(fullDay);
  return !isWorkingDay;
}


async function getEmployeeTodayRange(employeeId) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { company: true },
  });

  if (!employee) throw new Error("Employee not found");

  const timezone = employee.company?.timezone || "UTC";

  const todayStart = moment().tz(timezone).startOf("day").utc();
  const todayEnd = moment().tz(timezone).endOf("day").utc();

  return {
    timezone,
    todayStart: todayStart.toDate(),
    todayEnd: todayEnd.toDate(),
    todayFormatted: moment().tz(timezone).format("YYYY-MM-DD"),
    todayDay: moment().tz(timezone).format("ddd"),
  };
}


async function getEmployeeTodayRangeOther(employeeId) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { company: true },
  });

  if (!employee) throw new Error("Employee not found");

  const timezone = employee.company?.timezone || "UTC";

  const todayStart = moment().tz(timezone).startOf("day").utc();
  const todayEnd = moment().tz(timezone).endOf("day").utc();

  const todayDay = moment().tz(timezone).format("ddd");
  const todayDateString = moment().tz(timezone).format("YYYY-MM-DD");

  return {
    employee,
    timezone,
    todayStart: todayStart.toDate(),
    todayEnd: todayEnd.toDate(),
    todayDay,
    todayDateString,
  };
}

function getBreakStats(schedules, attendanceActivities) {
  const scheduleList = Array.isArray(schedules) ? schedules : [schedules];
  const activeSchedule = scheduleList.find((s) => s && !s.deletedAt);

  let breaksAllowed = false;
  let breakDurations = [];

  if (activeSchedule) {
    breaksAllowed = Boolean(activeSchedule.breaksAllowed);
    if (Array.isArray(activeSchedule.breakDurations)) {
      breakDurations = activeSchedule.breakDurations.map(Number).filter((n) => !isNaN(n));
    } else if (typeof activeSchedule.breakDurations === "string") {
      try {
        const parsed = JSON.parse(activeSchedule.breakDurations);
        if (Array.isArray(parsed)) breakDurations = parsed.map(Number).filter((n) => !isNaN(n));
      } catch (e) {}
    }
  }

  if (!breaksAllowed) {
    breakDurations = [];
  }

  const allowedBreakCount = breakDurations.length;
  const totalAllowedBreakMinutes = breakDurations.reduce((sum, d) => sum + d, 0);

  const breakActivities = (attendanceActivities || [])
    .filter((a) => a.type === "BREAK")
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  const completedBreaks = [];
  let totalUsedBreakMinutes = 0;
  let breakSeconds = 0;
  let isOnBreak = false;
  let breakStartTime = null;
  let activeBreakIndex = -1;

  breakActivities.forEach((b, idx) => {
    if (b.endTime) {
      const durationMins =
        b.durationMinutes ??
        Math.max(0, Math.floor((new Date(b.endTime) - new Date(b.startTime)) / 60000));
      totalUsedBreakMinutes += durationMins;
      breakSeconds += durationMins * 60;
      completedBreaks.push({
        id: b.id,
        breakNumber: idx + 1,
        startTime: b.startTime,
        endTime: b.endTime,
        durationMinutes: durationMins,
      });
    } else {
      isOnBreak = true;
      breakStartTime = b.startTime;
      activeBreakIndex = idx;
    }
  });

  const completedBreakCount = completedBreaks.length;
  const currentBreakNumber = isOnBreak
    ? activeBreakIndex + 1
    : completedBreakCount + 1;

  return {
    breaksAllowed,
    allowedBreakCount,
    breakDurations,
    totalAllowedBreakMinutes,
    completedBreakCount,
    totalUsedBreakMinutes,
    currentBreakNumber,
    completedBreaks,
    isOnBreak,
    breakSeconds,
    breakStartTime,
  };
}

exports.getTodayStatus = async (req, res) => {
  try {
    const employeeId = req.user.id;

    // 1️⃣ Get employee with company timezone and schedule
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        company: true,
        Schedule: { where: { deletedAt: null } },
      },
    });

    if (!employee) {
      return res.status(404).json({ success: false });
    }

    const timezone = employee.company?.timezone || "UTC";

    // 2️⃣ Get start of today in company timezone
    const todayStart = moment()
      .tz(timezone)
      .startOf("day")
      .utc()
      .toDate();

    const isTodayOff = isOffDay(employee.Schedule, todayStart);

    // 3️⃣ Fetch attendance
    const attendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: todayStart,
        },
      },
      include: {
        activities: {
          orderBy: { startTime: "asc" },
          include: { task: true },
        },
      },
    });

    const breakStats = getBreakStats(employee.Schedule, attendance?.activities);

    if (!attendance || !attendance.checkInTime) {
      return res.json({
        success: true,
        isOffDay: isTodayOff,
        clockedIn: false,
        clockedOut: false,
        ...breakStats,
      });
    }

    if (attendance.checkOutTime) {
      return res.json({
        success: true,
        isOffDay: isTodayOff,
        clockedIn: false,
        clockedOut: true,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        totalWorkedMinutes: attendance.totalWorkedMinutes,
        ...breakStats,
      });
    }

    const activeActivity = attendance.activities.find(
      (a) => !a.endTime
    );

    return res.json({
      success: true,
      isOffDay: isTodayOff,
      clockedIn: true,
      clockedOut: false,
      checkInTime: attendance.checkInTime,
      currentActivity: activeActivity
        ? {
            type: activeActivity.type,
            title: activeActivity.task
              ? activeActivity.task.title
              : activeActivity.type,
            startTime: activeActivity.startTime,
          }
        : null,
      ...breakStats,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};
  

exports.verifyPin = async (req, res) => {
  try {
    const { pin } = req.body;
    const employeeId = req.user.id;

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee || employee.pin !== pin) {
      return res.status(401).json({
        success: false,
        message: "Invalid PIN",
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};


exports.clockOut = async (req, res) => {
  try {
    const { summary, lat, lng } = req.body;
    const employeeId = req.user.id;

    const { todayStart, todayEnd } =
      await getEmployeeTodayRange(employeeId);

    const attendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    if (!attendance) {
      return res.status(400).json({ message: "No attendance found" });
    }

    const now = new Date(); // Always UTC

    await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOutTime: now,
        checkOutIP: req.ip,
        checkOutMethod: "PIN",
        checkOutLat: lat,
        checkOutLong: lng,
        summary,
      },
    });

    await prisma.attendancePunch.create({
      data: {
        type: "CHECK_OUT",
        punchTime: now,
        ip: req.ip,
        method: "PIN",
        employeeId,
        attendanceId: attendance.id,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Clock Out Failed" });
  }
};
exports.clockIn = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { lat, lng, activityType, taskId } = req.body;

    if (!activityType) {
      return res.status(400).json({ message: "Activity type required" });
    }

    /////////////////////////////////////////////////////////
    // 1️⃣ Get Timezone Safe Today Range
    /////////////////////////////////////////////////////////

    const {
      employee,
      timezone,
      todayStart,
      todayEnd,
      todayDay,
      todayDateString,
    } = await getEmployeeTodayRangeOther(employeeId);

    /////////////////////////////////////////////////////////
    // 2️⃣ Check Existing Attendance (Timezone Safe)
    /////////////////////////////////////////////////////////

    const existing = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ message: "Already clocked in today" });
    }

    /////////////////////////////////////////////////////////
    // 3️⃣ Get Schedule
    /////////////////////////////////////////////////////////

    const fullEmployee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        Schedule: { where: { deletedAt: null } },
        company: true,
        jobInfo: true,
      },
    });

    if (!fullEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    if (isOffDay(fullEmployee.Schedule, todayStart)) {
      return res.status(400).json({ message: "This is an Off Day. There is no schedule for this day." });
    }

    const schedule = fullEmployee.Schedule.find(
      (s) => !s.deletedAt
    ) || { startTime: "09:00", endTime: "18:00" };

    /////////////////////////////////////////////////////////
    // 4️⃣ GEOFENCING CHECK
    /////////////////////////////////////////////////////////

    const isRemote = fullEmployee.jobInfo?.workMode === "Remote";

    if (!isRemote && fullEmployee.company.enableGeofence) {
      if (!lat || !lng) {
        return res
          .status(400)
          .json({ message: "Location required for clock in" });
      }

      const companyLat = fullEmployee.company.latitude;
      const companyLng = fullEmployee.company.longitude;
      const radius = fullEmployee.company.radius || 0;

      const distance = calculateDistance(
        lat,
        lng,
        companyLat,
        companyLng
      );

      if (distance > radius) {
        return res.status(400).json({
          message: "You are outside allowed zone",
          distance: Math.round(distance),
          allowedRadius: radius,
        });
      }
    }

    /////////////////////////////////////////////////////////
    // 5️⃣ LATE CALCULATION (Timezone Safe)
    /////////////////////////////////////////////////////////

    const shiftStartLocal = moment.tz(
      `${todayDateString} ${schedule.startTime}`,
      "YYYY-MM-DD HH:mm",
      timezone
    );

    const shiftStartUTC = shiftStartLocal.clone().utc();
    const nowUTC = moment.utc();

    let isLate = false;
    let lateMinutes = 0;
    let status = "PRESENT";

    if (nowUTC.isAfter(shiftStartUTC)) {
      lateMinutes = nowUTC.diff(shiftStartUTC, "minutes");
      if (lateMinutes > 0) {
        isLate = true;
        status = "LATE";
      }
    }

    /////////////////////////////////////////////////////////
    // 6️⃣ TRANSACTION
    /////////////////////////////////////////////////////////

    const result = await prisma.$transaction(async (tx) => {
      const attendance = await tx.attendance.create({
        data: {
          employeeId,
          date: todayStart, // 🔥 store UTC start of company day

          shiftStartTime: schedule.startTime,
          shiftEndTime: schedule.endTime,

          checkInTime: new Date(), // UTC
          checkInLat: lat,
          checkInLong: lng,
          checkInIP: req.ip,
          checkInMethod: "PIN",

          isLate,
          lateMinutes,
          status,
        },
      });

      const activity = await tx.activityLog.create({
        data: {
          attendanceId: attendance.id,
          employeeId,
          taskId: taskId || null,
          type: activityType,
          startTime: new Date(), // UTC
        },
        include: { task: true },
      });

      await tx.attendancePunch.create({
        data: {
          attendanceId: attendance.id,
          employeeId,
          type: "CHECK_IN",
          punchTime: new Date(),
          lat,
          lng,
          ip: req.ip,
          method: "PIN",
        },
      });

      return { attendance, activity };
    });

    /////////////////////////////////////////////////////////
    // 7️⃣ RESPONSE
    /////////////////////////////////////////////////////////

    return res.json({
      success: true,
      shiftStart: result.attendance.shiftStartTime,
      shiftEnd: result.attendance.shiftEndTime,
      activityStartTime: result.activity.startTime,
      activityType: result.activity.type,
      activityTitle: result.activity.task
        ? result.activity.task.title
        : result.activity.type,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Clock In Failed" });
  }
};

exports.startBreak = async (req, res) => {
  try {
    const employeeId = req.user.id;

    const { todayStart, todayEnd } =
      await getEmployeeTodayRange(employeeId);

    const attendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: {
        activities: {
          orderBy: { startTime: "asc" },
        },
      },
    });

    if (!attendance) {
      return res.status(400).json({ message: "No active attendance found" });
    }

    const newBreak = await prisma.activityLog.create({
      data: {
        attendanceId: attendance.id,
        employeeId,
        type: "BREAK",
        startTime: new Date(), // UTC
      },
    });

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { Schedule: { where: { deletedAt: null } } },
    });

    const updatedActivities = [...(attendance.activities || []), newBreak];
    const breakStats = getBreakStats(employee?.Schedule, updatedActivities);

    res.json({ success: true, ...breakStats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Start Break Failed" });
  }
};

exports.endBreak = async (req, res) => {
  try {
    const employeeId = req.user.id;

    const { todayStart, todayEnd } =
      await getEmployeeTodayRange(employeeId);

    const breakActivity = await prisma.activityLog.findFirst({
      where: {
        employeeId,
        type: "BREAK",
        endTime: null,
        attendance: {
          date: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      },
      orderBy: { startTime: "desc" },
    });

    if (!breakActivity) {
      return res.status(400).json({ message: "No active break found" });
    }

    const now = new Date();
    const duration = Math.max(
      0,
      Math.floor((now.getTime() - new Date(breakActivity.startTime).getTime()) / 60000)
    );

    await prisma.activityLog.update({
      where: { id: breakActivity.id },
      data: {
        endTime: now,
        durationMinutes: duration,
      },
    });

    const attendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: {
        activities: {
          orderBy: { startTime: "asc" },
        },
      },
    });

    if (attendance) {
      const allBreaks = (attendance.activities || []).filter((a) => a.type === "BREAK");
      const totalBreakMins = allBreaks.reduce((sum, b) => {
        if (b.id === breakActivity.id) return sum + duration;
        return sum + (b.durationMinutes || 0);
      }, 0);

      await prisma.attendance.update({
        where: { id: attendance.id },
        data: { totalBreakMinutes: totalBreakMins },
      });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { Schedule: { where: { deletedAt: null } } },
    });

    const updatedActivities = (attendance?.activities || []).map((a) =>
      a.id === breakActivity.id ? { ...a, endTime: now, durationMinutes: duration } : a
    );
    const breakStats = getBreakStats(employee?.Schedule, updatedActivities);

    res.json({ success: true, ...breakStats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "End Break Failed" });
  }
};
exports.verifyPin = async (req, res) => {
  try {
    const { pin } = req.body;
    const employeeId = req.user.id;

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee || employee.pin !== pin) {
      return res.status(401).json({
        success: false,
        message: "Invalid PIN",
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};


exports.changeActivity = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { taskId, activityType } = req.body;

    const current = await prisma.activityLog.findFirst({
      where: { employeeId, endTime: null },
    });

    if (!current) {
      return res.status(400).json({ message: "No active activity" });
    }

    const duration = Math.floor(
      (Date.now() - new Date(current.startTime).getTime()) / 60000
    );

    await prisma.activityLog.update({
      where: { id: current.id },
      data: {
        endTime: new Date(),
        durationMinutes: duration,
      },
    });

    const newActivity = await prisma.activityLog.create({
      data: {
        employeeId,
        attendanceId: current.attendanceId,
        taskId: taskId || null,
        type: activityType,
        startTime: new Date(),
      },
      include: { task: true },
    });

    return res.json({
      success: true,
      startTime: newActivity.startTime,
      type: newActivity.type,
      title: newActivity.task ? newActivity.task.title : newActivity.type,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

  
  
exports.getAttendanceReport = async (req, res) => {
  try {
    const user = req.user;
    const {
      view = "daily",
      date,
      departmentId,
      companyId,
      employeeId
    } = req.query;

    const baseDate = moment(date || new Date());

    let startDate;
    let endDate;

    if (view === "daily") {
      startDate = baseDate.clone().startOf("day").toDate();
      endDate = baseDate.clone().endOf("day").toDate();
    }

    if (view === "weekly") {
      startDate = baseDate.clone().startOf("isoWeek").toDate();
      endDate = baseDate.clone().endOf("isoWeek").toDate();
    }

    if (view === "monthly") {
      startDate = baseDate.clone().startOf("month").toDate();
      endDate = baseDate.clone().endOf("month").toDate();
    }

    /* ðŸ”Ž Employee Filtering */
    let employeeWhere = {
      deletedAt: null
    };

    if (user.role === "USER") {
      employeeWhere.id = user.id;
    }

    if (user.role === "SUPERVISOR") {
      employeeWhere.OR = [
        { id: user.id },
        { supervisorId: user.id }
      ];
    }

    if (user.role === "ADMIN") {
      if (employeeId) employeeWhere.id = Number(employeeId);
      if (departmentId) employeeWhere.departmentId = Number(departmentId);
      if (companyId) employeeWhere.companyId = Number(companyId);
    }

    /* ðŸ‘¥ Employees */
    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      include: {
        Schedule: {
          where: { deletedAt: null }
        },
        Attendance: {
          where: {
            date: { gte: startDate, lte: endDate },
            deletedAt: null
          },
          include: {
            activities: true
          }
        }
      }
    });

    /* ðŸ”¥ Approved Overtimes */
    const approvedOvertimes = await prisma.overtime.findMany({
      where: {
        status: "APPROVED",
        date: {
          gte: moment(startDate).startOf("day").toDate(),
          lte: moment(endDate).endOf("day").toDate()
        },
        employee: { deletedAt: null }
      }
    });

    /* ðŸ”¥ Approved Leaves */
    const approvedLeaves = await prisma.leaveRequest.findMany({
      where: {
        status: "APPROVED",
        startDate: { lte: endDate },
        endDate: { gte: startDate },
        employee: { deletedAt: null }
      },
      include: {
        leaveType: true
      }
    });

    /* 🟢 Overtime Map */
    const overtimeMap = {};
    approvedOvertimes.forEach(ot => {
      const keyUtc = `${ot.employeeId}_${moment.utc(ot.date).format("YYYY-MM-DD")}`;
      const keyLocal = `${ot.employeeId}_${moment(ot.date).format("YYYY-MM-DD")}`;
      const keyStart = `${ot.employeeId}_${moment(ot.date).startOf("day").format("YYYY-MM-DD")}`;
      const otVal = {
        hours: ot.hours,
        amount: ot.amount
      };
      overtimeMap[keyUtc] = otVal;
      overtimeMap[keyLocal] = otVal;
      overtimeMap[keyStart] = otVal;
    });

    /* ðŸŸ¡ Leave Map */
    const leaveMap = {};
    approvedLeaves.forEach(lv => {
      let cursor = moment(lv.startDate).startOf("day");
      const end = moment(lv.endDate).startOf("day");

      while (cursor.isSameOrBefore(end)) {
        const key = `${lv.employeeId}_${cursor.format("YYYY-MM-DD")}`;
        leaveMap[key] = lv;
        cursor.add(1, "day");
      }
    });

    /* ðŸ“… Generate All Dates */
    const allDates = [];
    let cursor = moment(startDate).startOf("day");
    const endCursor = moment(endDate).startOf("day");

    while (cursor.isSameOrBefore(endCursor)) {
      allDates.push(cursor.format("YYYY-MM-DD"));
      cursor.add(1, "day");
    }

    const now = new Date();

    /* ðŸ§  Final Formatting */
    const formattedEmployees = employees.map(emp => {

      const attendanceMap = {};
      emp.Attendance.forEach(att => {
        const dLocal = moment(att.date).format("YYYY-MM-DD");
        const dUtc = moment.utc(att.date).format("YYYY-MM-DD");
        attendanceMap[dLocal] = att;
        attendanceMap[dUtc] = att;
      });

      const fullAttendance = allDates.map(dateStr => {

        const leaveKey = `${emp.id}_${dateStr}`;
        const overtimeKey = `${emp.id}_${dateStr}`;

        const leave = leaveMap[leaveKey];
        const overtime = overtimeMap[overtimeKey];

        const approvedOtHours = Number(overtime?.hours) || 0;
        const approvedOtMinutes = Math.round(approvedOtHours * 60);

        /* 🟡 If Leave Exists */
        if (leave) {
          return {
            id: null,
            date: new Date(dateStr),
            status: "LEAVE",
            leave: {
              type: leave.leaveType?.name,
              startDate: leave.startDate,
              endDate: leave.endDate
            },
            overtimeHours: approvedOtHours,
            overtimeMinutes: approvedOtMinutes,
            overtimeAmount: overtime?.amount || 0,
            totalWorkedMinutes: 0,
            totalBreakMinutes: 0,
            tasks: []
          };
        }

        const existing = attendanceMap[dateStr];

        /* 🔴 No Attendance */
        if (!existing) {
          const dayOff = isOffDay(emp.Schedule, dateStr);
          const isFutureDay = moment(dateStr, "YYYY-MM-DD").isAfter(moment().startOf("day"));

          let defaultStatus = "ABSENT";
          if (dayOff) {
            defaultStatus = "OFF_DAY";
          } else if (isFutureDay) {
            defaultStatus = "UPCOMING_DAY";
          }

          return {
            id: null,
            date: new Date(dateStr),
            status: defaultStatus,
            overtimeHours: approvedOtHours,
            overtimeMinutes: approvedOtMinutes,
            overtimeAmount: overtime?.amount || 0,
            totalWorkedMinutes: 0,
            totalBreakMinutes: 0,
            tasks: []
          };
        }

        /* 🟢 Attendance Exists */
        let totalWorkedMinutes = existing.totalWorkedMinutes || 0;
        let totalBreakMinutes = existing.totalBreakMinutes || 0;

        let calculatedBreak = 0;
        if (existing.activities && existing.activities.length > 0) {
          existing.activities.forEach(log => {
            if (log.type === "BREAK") {
              const breakEnd = log.endTime ? new Date(log.endTime) : now;
              calculatedBreak += (breakEnd - new Date(log.startTime)) / 1000 / 60;
            }
          });
          totalBreakMinutes = Math.floor(calculatedBreak);
        }

        const isDayOff = isOffDay(emp.Schedule, dateStr);
        let finalStatus = existing.status;

        if (isDayOff && !existing.checkInTime && existing.status !== "PRESENT" && existing.status !== "LATE" && existing.status !== "TARDY") {
          finalStatus = "OFF_DAY";
          totalWorkedMinutes = 0;
        } else if (!existing.checkInTime && existing.status !== "PRESENT" && existing.status !== "LATE" && existing.status !== "TARDY") {
          totalWorkedMinutes = 0;
        } else if (existing.checkInTime && existing.checkOutTime) {
          const inT = new Date(existing.checkInTime).getTime();
          const outT = new Date(existing.checkOutTime).getTime();
          if (outT > inT) {
            const totalMinutes = (outT - inT) / 1000 / 60;
            totalWorkedMinutes = Math.max(Math.floor(totalMinutes - totalBreakMinutes), 0);
          }
        } else if (existing.checkInTime && !existing.checkOutTime && moment(existing.date).isSame(moment(), "day")) {
          const inT = new Date(existing.checkInTime).getTime();
          const totalMinutes = (now.getTime() - inT) / 1000 / 60;
          totalWorkedMinutes = Math.max(Math.floor(totalMinutes - totalBreakMinutes), 0);
        } else if ((existing.status === "PRESENT" || existing.status === "LATE") && (!totalWorkedMinutes || totalWorkedMinutes === 0)) {
          const activeSched = emp.Schedule?.find(s => !s.deletedAt);
          const sTime = activeSched?.startTime || "09:00";
          const eTime = activeSched?.endTime || "17:00";
          const [sh, sm] = sTime.split(":").map(Number);
          const [eh, em] = eTime.split(":").map(Number);
          const startMins = (sh || 9) * 60 + (sm || 0);
          const endMins = (eh || 17) * 60 + (em || 0);
          if (endMins > startMins) {
            totalWorkedMinutes = Math.max(endMins - startMins - totalBreakMinutes, 0);
          } else {
            totalWorkedMinutes = 480;
          }
        }

        const tasks = existing.activities
          .filter(log => log.type === "TASK")
          .map(log => log.title);

        const finalOtMinutes = approvedOtMinutes || (existing.overtimeMinutes || 0);
        const finalOtHours = approvedOtHours || (finalOtMinutes / 60);

        return {
          ...existing,
          status: finalStatus,
          overtimeHours: finalOtHours,
          overtimeMinutes: finalOtMinutes,
          overtimeAmount: overtime?.amount || 0,
          totalWorkedMinutes,
          totalBreakMinutes,
          tasks
        };
      });

      return {
        ...emp,
        Attendance: fullAttendance
      };
    });

    return res.json({
      success: true,
      employees: formattedEmployees
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false });
  }
};


  exports.createAttendance = async (req, res) => {
    try {
      const {
        employeeId,
        date,
        checkInTime,
        checkOutTime,
        status
      } = req.body;
    
      const attendanceDate = moment(date).startOf("day").toDate();

      if (moment(attendanceDate).isAfter(moment().startOf("day"))) {
        return res.status(400).json({
          success: false,
          message: "There is no schedule for this day yet."
        });
      }

      const employee = await prisma.employee.findUnique({
        where: { id: Number(employeeId) },
        include: {
          Schedule: { where: { deletedAt: null } }
        }
      });

      if (employee && isOffDay(employee.Schedule, attendanceDate)) {
        if (status !== "OFF_DAY" && status !== "OFF") {
          return res.status(400).json({
            success: false,
            message: "This is an Off Day. Attendance cannot be marked for this day."
          });
        }
      }

      let finalCheckIn = checkInTime ? new Date(checkInTime) : null;
      let finalCheckOut = checkOutTime ? new Date(checkOutTime) : null;

      if ((status === "PRESENT" || status === "LATE") && (!finalCheckIn || !finalCheckOut)) {
        const activeSched = employee?.Schedule?.find(s => !s.deletedAt);
        const sTime = activeSched?.startTime || "09:00";
        const eTime = activeSched?.endTime || "17:00";

        if (!finalCheckIn) {
          const [sh, sm] = sTime.split(":").map(Number);
          finalCheckIn = moment(attendanceDate).hours(sh || 9).minutes(sm || 0).seconds(0).toDate();
        }
        if (!finalCheckOut) {
          const [eh, em] = eTime.split(":").map(Number);
          finalCheckOut = moment(attendanceDate).hours(eh || 17).minutes(em || 0).seconds(0).toDate();
        }
      } else if (status === "ABSENT" || status === "OFF_DAY" || status === "OFF" || status === "LEAVE") {
        finalCheckIn = null;
        finalCheckOut = null;
      }

      let totalWorkedMinutes = 0;
      if (finalCheckIn && finalCheckOut) {
        const inT = finalCheckIn.getTime();
        const outT = finalCheckOut.getTime();
        if (outT > inT) {
          totalWorkedMinutes = Math.floor((outT - inT) / 60000);
        }
      }
  
      const targetDateStr = typeof date === "string" ? date.slice(0, 10) : moment(date).format("YYYY-MM-DD");

      // Check if already exists
      let existing = await prisma.attendance.findUnique({
        where: {
          employeeId_date: {
            employeeId: Number(employeeId),
            date: attendanceDate
          }
        }
      });

      if (!existing) {
        const candidates = await prisma.attendance.findMany({
          where: {
            employeeId: Number(employeeId)
          }
        });
        existing = candidates.find(c => {
          return moment(c.date).format("YYYY-MM-DD") === targetDateStr || moment.utc(c.date).format("YYYY-MM-DD") === targetDateStr;
        }) || null;
      }
  
      if (existing) {
        const attendance = await prisma.attendance.update({
          where: { id: existing.id },
          data: {
            checkInTime: finalCheckIn,
            checkOutTime: finalCheckOut,
            totalWorkedMinutes,
            status: status || existing.status || "PRESENT"
          }
        });

        return res.json({
          success: true,
          attendance,
          message: "Attendance updated successfully"
        });
      }
  
      const attendance = await prisma.attendance.create({
        data: {
          employeeId: Number(employeeId),
          date: attendanceDate,
          checkInTime: finalCheckIn,
          checkOutTime: finalCheckOut,
          totalWorkedMinutes,
          status: status || "PRESENT"
        }
      });
  
      res.json({
        success: true,
        attendance
      });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Error creating or updating attendance" });
    }
  };
  
  exports.updateAttendance = async (req, res) => {
    try {
      const { id } = req.params;
      const {
        employeeId,
        date,
        checkInTime,
        checkOutTime,
        status
      } = req.body;

      let existingRecord = null;
      if (id && !isNaN(Number(id))) {
        existingRecord = await prisma.attendance.findUnique({
          where: { id: Number(id) }
        });
      }

      const targetEmpId = existingRecord ? existingRecord.employeeId : Number(employeeId);
      const targetDate = existingRecord ? existingRecord.date : moment(date).startOf("day").toDate();
      const updateDateStr = typeof date === "string" ? date.slice(0, 10) : moment(targetDate).format("YYYY-MM-DD");

      if (moment(targetDate).isAfter(moment().startOf("day"))) {
        return res.status(400).json({
          success: false,
          message: "There is no schedule for this day yet."
        });
      }

      if (!existingRecord && targetEmpId && targetDate) {
        existingRecord = await prisma.attendance.findUnique({
          where: {
            employeeId_date: {
              employeeId: targetEmpId,
              date: targetDate
            }
          }
        });
        if (!existingRecord) {
          const candidates = await prisma.attendance.findMany({
            where: {
              employeeId: targetEmpId
            }
          });
          existingRecord = candidates.find(c => {
            return moment(c.date).format("YYYY-MM-DD") === updateDateStr || moment.utc(c.date).format("YYYY-MM-DD") === updateDateStr;
          }) || null;
        }
      }

      const employee = await prisma.employee.findUnique({
        where: { id: targetEmpId },
        include: { Schedule: { where: { deletedAt: null } } }
      });

      if (employee && isOffDay(employee.Schedule, targetDate)) {
        if (status !== "OFF_DAY" && status !== "OFF") {
          return res.status(400).json({
            success: false,
            message: "This is an Off Day. Attendance cannot be marked for this day."
          });
        }
      }

      let finalCheckIn = checkInTime ? new Date(checkInTime) : (existingRecord ? existingRecord.checkInTime : null);
      let finalCheckOut = checkOutTime ? new Date(checkOutTime) : (existingRecord ? existingRecord.checkOutTime : null);

      if (status === "ABSENT" || status === "OFF_DAY" || status === "OFF" || status === "LEAVE") {
        finalCheckIn = null;
        finalCheckOut = null;
      } else if ((status === "PRESENT" || status === "LATE") && (!finalCheckIn || !finalCheckOut)) {
        const activeSched = employee?.Schedule?.find(s => !s.deletedAt);
        const sTime = activeSched?.startTime || "09:00";
        const eTime = activeSched?.endTime || "17:00";

        if (!finalCheckIn) {
          const [sh, sm] = sTime.split(":").map(Number);
          finalCheckIn = moment(targetDate).hours(sh || 9).minutes(sm || 0).seconds(0).toDate();
        }
        if (!finalCheckOut) {
          const [eh, em] = eTime.split(":").map(Number);
          finalCheckOut = moment(targetDate).hours(eh || 17).minutes(em || 0).seconds(0).toDate();
        }
      }

      let totalWorkedMinutes = 0;
      if (finalCheckIn && finalCheckOut) {
        const inT = finalCheckIn.getTime();
        const outT = finalCheckOut.getTime();
        if (outT > inT) {
          totalWorkedMinutes = Math.floor((outT - inT) / 60000);
        }
      }

      if (existingRecord) {
        const attendance = await prisma.attendance.update({
          where: { id: existingRecord.id },
          data: {
            checkInTime: finalCheckIn,
            checkOutTime: finalCheckOut,
            totalWorkedMinutes,
            status: status || existingRecord.status
          }
        });

        return res.json({
          success: true,
          attendance
        });
      }

      if (targetEmpId && targetDate) {
        const attendance = await prisma.attendance.create({
          data: {
            employeeId: targetEmpId,
            date: targetDate,
            checkInTime: finalCheckIn,
            checkOutTime: finalCheckOut,
            totalWorkedMinutes,
            status: status || "PRESENT"
          }
        });

        return res.json({
          success: true,
          attendance
        });
      }

      return res.status(404).json({ success: false, message: "Attendance record not found" });

    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Error updating attendance" });
    }
  };

// ðŸ”¥ ADMIN ATTENDANCE DASHBOARD (TODAY)
exports.getAdminAttendanceDashboard = async (req, res) => {
  try {
    const { companyId } = req.query;
    const organizationId = req.user.organizationId;

    const todayStart = moment().startOf("day").toDate();
    const todayEnd = moment().endOf("day").toDate();

    // ðŸ”Ž Employees filter (Org + Optional Company)
    const employeeWhere = {
      organizationId,
      deletedAt: null,
    };

    if (companyId) {
      employeeWhere.companyId = Number(companyId);
    }

    // ðŸ‘¥ Get Employees
    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      include: {
        company: true,
        Attendance: {
          where: {
            date: {
              gte: todayStart,
              lte: todayEnd,
            },
            deletedAt: null,
          },
        },
      },
    });

    // ðŸŸ¡ Approved Leaves Today
    const approvedLeaves = await prisma.leaveRequest.findMany({
      where: {
        organizationId,
        status: "APPROVED",
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart },
      },
    });

    const leaveMap = {};
    approvedLeaves.forEach((leave) => {
      leaveMap[leave.employeeId] = leave;
    });

    // ðŸ“Š Prepare Response
    let present = [];
    let absent = [];
    let onLeave = [];

    employees.forEach((emp) => {
      const attendance = emp.Attendance[0];

      // ðŸŸ¡ On Leave
      if (leaveMap[emp.id]) {
        onLeave.push({
          id: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          companyId: emp.companyId,
          status: "on_leave",
        });
        return;
      }

      // ðŸŸ¢ Present
      if (attendance && attendance.checkInTime) {
        present.push({
          id: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          companyId: emp.companyId,
          status: "present",
          lat: attendance.checkInLat,
          lng: attendance.checkInLong,
          checkIn: attendance.checkInTime,
          checkOut: attendance.checkOutTime,
          checkInMethod:attendance.checkInMethod,
          checkOutMethod: attendance.checkOutMethod,
        });
        return;
      }

      // ðŸ”´ Absent
      absent.push({
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        companyId: emp.companyId,
        status: "absent",
      });
    });

    return res.json({
      success: true,
      summary: {
        totalEmployees: employees.length,
        presentCount: present.length,
        absentCount: absent.length,
        onLeaveCount: onLeave.length,
      },
      data: {
        present,
        absent,
        onLeave,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false });
  }
};


