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

function isOffDay(schedules, date, timezone = null) {
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

  let mDate;
  if (typeof date === "string") {
    const cleanStr = date.slice(0, 10);
    mDate = timezone ? moment.tz(cleanStr, "YYYY-MM-DD", timezone) : moment(cleanStr, "YYYY-MM-DD");
  } else if (moment.isMoment(date)) {
    mDate = timezone ? date.clone().tz(timezone) : date;
  } else if (date instanceof Date) {
    mDate = timezone ? moment(date).tz(timezone) : moment(date);
  } else {
    mDate = timezone ? moment().tz(timezone) : moment();
  }

  const shortDay = mDate.format("ddd").toLowerCase();
  const fullDay = mDate.format("dddd").toLowerCase();

  const daysArr = activeSchedule.days.map((d) => {
    if (typeof d === "object" && d !== null) {
      return String(d.day || d.dayFull || d.name || d.short || "").trim().toLowerCase();
    }
    return String(d).trim().toLowerCase();
  });

  const isWorkingDay = daysArr.includes(shortDay) || daysArr.includes(fullDay);
  return !isWorkingDay;
}

function getScheduleShiftForDay(schedule, date, timezone = null) {
  let startTime = schedule?.startTime || "09:00";
  let endTime = schedule?.endTime || "18:00";

  if (!schedule || !schedule.days || !Array.isArray(schedule.days)) {
    return { startTime, endTime };
  }

  let mDate;
  if (typeof date === "string") {
    const cleanStr = date.slice(0, 10);
    mDate = timezone ? moment.tz(cleanStr, "YYYY-MM-DD", timezone) : moment(cleanStr, "YYYY-MM-DD");
  } else if (moment.isMoment(date)) {
    mDate = timezone ? date.clone().tz(timezone) : date;
  } else if (date instanceof Date) {
    mDate = timezone ? moment(date).tz(timezone) : moment(date);
  } else {
    mDate = timezone ? moment().tz(timezone) : moment();
  }

  const shortDay = mDate.format("ddd").toLowerCase();
  const fullDay = mDate.format("dddd").toLowerCase();

  const dayObj = schedule.days.find((d) => {
    if (typeof d === "object" && d !== null) {
      const name = String(d.day || d.dayFull || d.name || d.short || "").trim().toLowerCase();
      return name === shortDay || name === fullDay;
    }
    return false;
  });

  if (dayObj && typeof dayObj === "object") {
    if (dayObj.startTime) startTime = dayObj.startTime;
    if (dayObj.endTime) endTime = dayObj.endTime;
  }

  return { startTime, endTime };
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
    if (req.user.role === "ADMIN") {
      return res.json({
        success: true,
        clockedIn: false,
        clockedOut: false,
        isAdmin: true,
      });
    }

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

    const todayDateString = moment().tz(timezone).format("YYYY-MM-DD");
    const isTodayOff = isOffDay(employee.Schedule, todayDateString, timezone);

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
        punches: {
          orderBy: { punchTime: "asc" },
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
        punches: [],
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
        punches: attendance.punches || [],
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
      punches: attendance.punches || [],
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
    if (req.user.role === "ADMIN") {
      return res.status(400).json({ success: false, message: "Super Admin accounts do not record attendance." });
    }
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
    const inTime = attendance.checkInTime ? new Date(attendance.checkInTime) : now;
    const totalWorkedMinutes = Math.max(0, Math.floor((now - inTime) / 60000));

    let scheduledDurationMinutes = 540;
    if (attendance.shiftStartTime && attendance.shiftEndTime) {
      const [sh, sm] = attendance.shiftStartTime.split(":").map(Number);
      const [eh, em] = attendance.shiftEndTime.split(":").map(Number);
      const sMins = (sh || 9) * 60 + (sm || 0);
      const eMins = (eh || 18) * 60 + (em || 0);
      if (eMins > sMins) scheduledDurationMinutes = eMins - sMins;
    }
    const overtimeMinutes = totalWorkedMinutes > scheduledDurationMinutes ? totalWorkedMinutes - scheduledDurationMinutes : 0;

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        company: true,
        Schedule: { where: { deletedAt: null } }
      }
    });

    const timezone = employee?.company?.timezone || "Asia/Karachi";
    const activeSchedule = employee?.Schedule?.find((s) => !s.deletedAt);
    const shiftStartTime = attendance.shiftStartTime || activeSchedule?.startTime || "09:00";
    const shiftEndTime = attendance.shiftEndTime || activeSchedule?.endTime || "18:00";

    let isEarlyOut = false;
    let earlyOutMinutes = 0;

    if (shiftStartTime && shiftEndTime) {
      const todayDateStr = moment(now).tz(timezone).format("YYYY-MM-DD");
      const shiftStartLocal = moment.tz(`${todayDateStr} ${shiftStartTime}`, "YYYY-MM-DD HH:mm", timezone);
      let shiftEndLocal = moment.tz(`${todayDateStr} ${shiftEndTime}`, "YYYY-MM-DD HH:mm", timezone);
      if (shiftEndLocal.isBefore(shiftStartLocal)) {
        shiftEndLocal.add(1, "day");
      }

      const shiftEndUTC = shiftEndLocal.clone().utc();
      const nowMomentUTC = moment.utc(now);

      const allowEarlyOut = activeSchedule ? activeSchedule.allowEarlyOut : false;
      const allowedEarlyOutMins = allowEarlyOut ? (Number(activeSchedule.earlyOutMinutes) || 0) : 0;
      const earlyOutThresholdUTC = shiftEndUTC.clone().subtract(allowedEarlyOutMins, "minutes");

      if (nowMomentUTC.isBefore(earlyOutThresholdUTC)) {
        earlyOutMinutes = Math.max(0, shiftEndUTC.diff(nowMomentUTC, "minutes"));
        if (earlyOutMinutes > 0) {
          isEarlyOut = true;
        }
      }
    }

    await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOutTime: now,
        checkOutIP: req.ip,
        checkOutMethod: "PIN",
        checkOutLat: lat,
        checkOutLong: lng,
        totalWorkedMinutes,
        overtimeMinutes,
        isEarlyOut,
        earlyOutMinutes,
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
    if (req.user.role === "ADMIN") {
      return res.status(400).json({ success: false, message: "Super Admin accounts do not record attendance." });
    }
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

    if (isOffDay(fullEmployee.Schedule, todayDateString, timezone)) {
      return res.status(400).json({ message: "This is an Off Day. There is no schedule for this day." });
    }

    const rawSchedule = fullEmployee.Schedule.find(
      (s) => !s.deletedAt
    ) || { startTime: "09:00", endTime: "18:00" };

    const dayShift = getScheduleShiftForDay(rawSchedule, todayDateString, timezone);
    const schedule = {
      ...rawSchedule,
      startTime: dayShift.startTime,
      endTime: dayShift.endTime
    };

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

    const graceMinutes = schedule.allowEarlyIn ? (Number(schedule.earlyInMinutes) || 0) : 0;
    const lateThresholdUTC = shiftStartUTC.clone().add(graceMinutes, "minutes");

    let isLate = false;
    let lateMinutes = 0;
    let status = "PRESENT";

    if (nowUTC.isAfter(lateThresholdUTC)) {
      lateMinutes = nowUTC.diff(shiftStartUTC, "minutes");
      if (lateMinutes > 0) {
        isLate = true;
        status = "TARDY";
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

    await prisma.attendancePunch.create({
      data: {
        attendanceId: attendance.id,
        employeeId,
        type: "BREAK_START",
        punchTime: new Date(),
        ip: req.ip,
        method: "PIN",
      },
    });

    // Update attendance record status to BREAK in database
    await prisma.attendance.update({
      where: { id: attendance.id },
      data: { status: "BREAK" },
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

    await prisma.attendancePunch.create({
      data: {
        attendanceId: breakActivity.attendanceId,
        employeeId,
        type: "BREAK_END",
        punchTime: now,
        ip: req.ip,
        method: "PIN",
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

      const restoredStatus = attendance.isLate ? "TARDY" : "PRESENT";

      await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          totalBreakMinutes: totalBreakMins,
          status: restoredStatus,
        },
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
      locationId,
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

    /* 🔍 Employee Filtering */
    let employeeWhere = {
      deletedAt: null,
      NOT: { role: "ADMIN" }
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
      if (employeeId && String(employeeId).toLowerCase() !== "all") {
        employeeWhere.id = Number(employeeId);
      }
      if (departmentId && String(departmentId).toLowerCase() !== "all") {
        employeeWhere.departmentId = Number(departmentId);
      }
      const targetLoc = companyId || locationId;
      if (targetLoc && String(targetLoc).toLowerCase() !== "all") {
        employeeWhere.companyId = Number(targetLoc);
      }
    }

    const queryStartDate = moment(startDate).subtract(1, "day").startOf("day").toDate();
    const queryEndDate = moment(endDate).add(1, "day").endOf("day").toDate();

    /* 👥 Employees */
    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      include: {
        department: { select: { title: true } },
        supervisor: { select: { firstName: true, lastName: true } },
        jobInfo: true,
        company: true,
        Schedule: {
          where: { deletedAt: null }
        },
        Attendance: {
          where: {
            OR: [
              { date: { gte: queryStartDate, lte: queryEndDate } },
              { checkInTime: { gte: queryStartDate, lte: queryEndDate } },
              { checkOutTime: { gte: queryStartDate, lte: queryEndDate } }
            ],
            deletedAt: null
          },
          include: {
            activities: true,
            punches: {
              orderBy: { punchTime: "asc" }
            }
          }
        }
      }
    });

    /* 🔥 Approved Overtimes */
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

    /* 🔥 Approved Leaves */
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

    /* 🟡 Leave Map */
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

    /* 📅 Generate All Dates */
    const allDates = [];
    let cursor = moment(startDate).startOf("day");
    const endCursor = moment(endDate).startOf("day");

    while (cursor.isSameOrBefore(endCursor)) {
      allDates.push(cursor.format("YYYY-MM-DD"));
      cursor.add(1, "day");
    }

    const now = new Date();

    /* 🧠 Final Formatting */
    const formattedEmployees = employees.map(emp => {

      const empTz = emp.company?.timezone || "Asia/Karachi";
      const attendanceMap = {};
      const sortedAttendance = [...emp.Attendance].sort(
        (a, b) => new Date(a.date || a.checkInTime) - new Date(b.date || b.checkInTime)
      );

      sortedAttendance.forEach(att => {
        let key = null;
        if (att.date) {
          key = moment(att.date).tz(empTz).format("YYYY-MM-DD");
        } else if (att.checkInTime) {
          key = moment(att.checkInTime).tz(empTz).format("YYYY-MM-DD");
        }
        if (!key) return;

        const prev = attendanceMap[key];
        if (!prev) {
          attendanceMap[key] = att;
          return;
        }

        // 🛡️ Never let a record with actual check-in be overwritten by an empty/absent one
        const prevHasIn = Boolean(prev.checkInTime);
        const currHasIn = Boolean(att.checkInTime);

        if (!prevHasIn && currHasIn) {
          attendanceMap[key] = att;
          return;
        }
        if (prevHasIn && !currHasIn) {
          return;
        }

        const prevNotAbsent = prev.status && prev.status !== "ABSENT" && prev.status !== "OFF_DAY";
        const currNotAbsent = att.status && att.status !== "ABSENT" && att.status !== "OFF_DAY";
        if (!prevNotAbsent && currNotAbsent) {
          attendanceMap[key] = att;
          return;
        }
        if (prevNotAbsent && !currNotAbsent) {
          return;
        }

        const prevWorked = Number(prev.totalWorkedMinutes) || 0;
        const currWorked = Number(att.totalWorkedMinutes) || 0;
        if (currWorked > prevWorked) {
          attendanceMap[key] = att;
          return;
        }
        if (prevWorked > currWorked) {
          return;
        }

        if (att.id > prev.id) {
          attendanceMap[key] = att;
        }
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
            date: dateStr,
            reportDate: dateStr,
            dateStr: dateStr,
            status: "LEAVE",
            leave: {
              type: leave.leaveType?.name,
              startDate: leave.startDate,
              endDate: leave.endDate
            },
            checkInTime: null,
            checkOutTime: null,
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
            date: dateStr,
            reportDate: dateStr,
            dateStr: dateStr,
            status: defaultStatus,
            checkInTime: null,
            checkOutTime: null,
            overtimeHours: approvedOtHours,
            overtimeMinutes: approvedOtMinutes,
            overtimeAmount: overtime?.amount || 0,
            totalWorkedMinutes: 0,
            totalBreakMinutes: 0,
            tasks: []
          };
        }

        /* 🟢 Attendance Exists */
        const isDayOff = isOffDay(emp.Schedule, dateStr);

        // Verify check-in and check-out actually belong to this date in company timezone
        const checkInDateMatch = existing.checkInTime
          ? moment(existing.checkInTime).tz(empTz).format("YYYY-MM-DD") === dateStr
          : false;
        const checkOutDateMatch = existing.checkOutTime
          ? moment(existing.checkOutTime).tz(empTz).format("YYYY-MM-DD") === dateStr
          : false;

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

        const activeSched = emp.Schedule?.find(s => !s.deletedAt) || emp.Schedule?.[0];
        const dayShift = getScheduleShiftForDay(activeSched, dateStr, empTz);
        const sTime = dayShift.startTime || activeSched?.startTime || "09:00";
        const eTime = dayShift.endTime || activeSched?.endTime || "18:00";
        const graceMinutes = activeSched?.allowEarlyIn ? (Number(activeSched.earlyInMinutes) || 0) : 0;
        const allowedEarlyOutMins = activeSched?.allowEarlyOut ? (Number(activeSched.earlyOutMinutes) || 0) : 0;

        let finalStatus = existing.status;
        if (finalStatus === "LATE") finalStatus = "TARDY";

        let finalCheckIn = checkInDateMatch ? existing.checkInTime : null;
        let finalCheckOut = (checkOutDateMatch || (checkInDateMatch && existing.checkOutTime)) ? existing.checkOutTime : null;

        const hasWorkedShift = Boolean(checkInDateMatch && (totalWorkedMinutes > 0 || finalCheckOut));

        let isLate = false;
        let lateMinutes = 0;
        let isEarlyOut = false;
        let earlyOutMinutes = 0;

        if (finalCheckIn && finalStatus !== "LEAVE" && finalStatus !== "OFF_DAY") {
          const checkInMoment = moment(finalCheckIn).tz(empTz);
          const shiftStartLocal = moment.tz(`${dateStr} ${sTime}`, "YYYY-MM-DD HH:mm", empTz);
          const lateThreshold = shiftStartLocal.clone().add(graceMinutes, "minutes");

          if (checkInMoment.isAfter(lateThreshold)) {
            isLate = true;
            lateMinutes = checkInMoment.diff(shiftStartLocal, "minutes");
            finalStatus = "TARDY";
          } else {
            isLate = false;
            lateMinutes = 0;
            if (finalStatus === "TARDY" || finalStatus === "LATE" || !finalStatus || finalStatus === "ABSENT") {
              finalStatus = "PRESENT";
            }
          }
        }

        if (finalCheckIn && finalCheckOut && finalStatus !== "LEAVE" && finalStatus !== "OFF_DAY") {
          const checkOutMoment = moment(finalCheckOut).tz(empTz);
          const shiftStartLocal = moment.tz(`${dateStr} ${sTime}`, "YYYY-MM-DD HH:mm", empTz);
          let shiftEndLocal = moment.tz(`${dateStr} ${eTime}`, "YYYY-MM-DD HH:mm", empTz);
          if (shiftEndLocal.isBefore(shiftStartLocal)) {
            shiftEndLocal.add(1, "day");
          }
          const earlyOutThreshold = shiftEndLocal.clone().subtract(allowedEarlyOutMins, "minutes");

          if (checkOutMoment.isBefore(earlyOutThreshold) && checkOutMoment.isAfter(shiftStartLocal)) {
            earlyOutMinutes = Math.max(0, shiftEndLocal.diff(checkOutMoment, "minutes"));
            if (earlyOutMinutes > 0) isEarlyOut = true;
          }
        }

        if (isDayOff && !hasWorkedShift && existing.status !== "LEAVE") {
          finalStatus = "OFF_DAY";
          totalWorkedMinutes = 0;
          finalCheckIn = null;
          finalCheckOut = null;
        } else if (!finalCheckIn && existing.status !== "PRESENT" && existing.status !== "LATE" && existing.status !== "TARDY") {
          totalWorkedMinutes = 0;
        } else if (finalCheckIn && finalCheckOut) {
          const inT = new Date(finalCheckIn).getTime();
          const outT = new Date(finalCheckOut).getTime();
          if (outT > inT) {
            const totalMinutes = (outT - inT) / 1000 / 60;
            totalWorkedMinutes = Math.max(Math.floor(totalMinutes - totalBreakMinutes), 0);
          }
        } else if (finalCheckIn && !finalCheckOut) {
          const inT = new Date(finalCheckIn).getTime();
          const diffHours = (now.getTime() - inT) / 1000 / 3600;
          if (diffHours >= 15) {
            totalWorkedMinutes = 15 * 60;
          } else {
            const totalMinutes = (now.getTime() - inT) / 1000 / 60;
            totalWorkedMinutes = Math.max(Math.floor(totalMinutes - totalBreakMinutes), 0);
          }
        } else if (!finalCheckIn && (existing.status === "PRESENT" || existing.status === "LATE" || existing.status === "TARDY") && (!totalWorkedMinutes || totalWorkedMinutes === 0)) {
          const [sh, sm] = sTime.split(":").map(Number);
          const [eh, em] = eTime.split(":").map(Number);
          const startMins = (sh || 9) * 60 + (sm || 0);
          const endMins = (eh || 18) * 60 + (em || 0);
          if (endMins > startMins) {
            totalWorkedMinutes = Math.max(endMins - startMins - totalBreakMinutes, 0);
          } else {
            totalWorkedMinutes = 540;
          }
        }

        // Asynchronously persist any corrected schedule/lateness fields to the DB
        if (existing?.id && finalCheckIn && (
          existing.isLate !== isLate ||
          existing.lateMinutes !== lateMinutes ||
          existing.status !== finalStatus ||
          existing.shiftStartTime !== sTime ||
          existing.shiftEndTime !== eTime
        )) {
          prisma.attendance.update({
            where: { id: existing.id },
            data: {
              isLate,
              lateMinutes,
              status: finalStatus,
              shiftStartTime: sTime,
              shiftEndTime: eTime,
              isEarlyOut,
              earlyOutMinutes,
            }
          }).catch(err => console.error("[Report Sync Attendance Error]", err.message));
        }

        const tasks = existing.activities
          ? existing.activities
              .filter(log => log.type === "TASK")
              .map(log => log.title)
          : [];

        // Scheduled shift duration
        const [sh, sm] = sTime.split(":").map(Number);
        const [eh, em] = eTime.split(":").map(Number);
        const startMins = (sh || 9) * 60 + (sm || 0);
        const endMins = (eh || 18) * 60 + (em || 0);
        const scheduledMins = endMins > startMins ? endMins - startMins : 540;

        let calculatedOtMinutes = 0;
        if (totalWorkedMinutes > scheduledMins) {
          calculatedOtMinutes = totalWorkedMinutes - scheduledMins;
        }

        const finalOtMinutes = approvedOtMinutes || existing.overtimeMinutes || calculatedOtMinutes;
        const finalOtHours = approvedOtHours || (finalOtMinutes / 60);

        return {
          ...existing,
          reportDate: dateStr,
          dateStr: dateStr,
          date: dateStr,
          checkInTime: finalCheckIn,
          checkOutTime: finalCheckOut,
          status: finalStatus,
          isLate: (finalStatus === "OFF_DAY" ? false : isLate),
          lateMinutes: (finalStatus === "OFF_DAY" ? 0 : lateMinutes),
          isEarlyOut,
          earlyOutMinutes,
          shiftStartTime: sTime,
          shiftEndTime: eTime,
          overtimeHours: finalOtHours,
          overtimeMinutes: finalOtMinutes,
          overtimeAmount: overtime?.amount || 0,
          totalWorkedMinutes,
          totalBreakMinutes,
          punches: existing.punches || [],
          tasks
        };
      });

      return {
        ...emp,
        Attendance: fullAttendance,
        attendance: fullAttendance
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
          Schedule: { where: { deletedAt: null } },
          company: true,
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

      if (status === "ABSENT" || status === "OFF_DAY" || status === "OFF" || status === "LEAVE") {
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

      const activeSched = employee?.Schedule?.find(s => !s.deletedAt);
      const timezone = employee?.company?.timezone || "Asia/Karachi";
      const sTime = activeSched?.startTime || "09:00";
      const eTime = activeSched?.endTime || "18:00";

      let isLate = false;
      let lateMinutes = 0;
      let isEarlyOut = false;
      let earlyOutMinutes = 0;

      if (finalCheckIn) {
        const checkInMoment = moment(finalCheckIn).tz(timezone);
        const shiftStartLocal = moment.tz(`${targetDateStr} ${sTime}`, "YYYY-MM-DD HH:mm", timezone);
        const graceMins = activeSched?.allowEarlyIn ? (Number(activeSched.earlyInMinutes) || 0) : 0;
        const lateThreshold = shiftStartLocal.clone().add(graceMins, "minutes");

        if (checkInMoment.isAfter(lateThreshold)) {
          isLate = true;
          lateMinutes = checkInMoment.diff(shiftStartLocal, "minutes");
        }
      }

      if (finalCheckOut) {
        const checkOutMoment = moment(finalCheckOut).tz(timezone);
        const shiftStartLocal = moment.tz(`${targetDateStr} ${sTime}`, "YYYY-MM-DD HH:mm", timezone);
        let shiftEndLocal = moment.tz(`${targetDateStr} ${eTime}`, "YYYY-MM-DD HH:mm", timezone);
        if (shiftEndLocal.isBefore(shiftStartLocal)) {
          shiftEndLocal.add(1, "day");
        }
        const allowedEarlyOutMins = activeSched?.allowEarlyOut ? (Number(activeSched.earlyOutMinutes) || 0) : 0;
        const earlyOutThreshold = shiftEndLocal.clone().subtract(allowedEarlyOutMins, "minutes");

        if (checkOutMoment.isBefore(earlyOutThreshold)) {
          earlyOutMinutes = Math.max(0, shiftEndLocal.diff(checkOutMoment, "minutes"));
          if (earlyOutMinutes > 0) isEarlyOut = true;
        }
      }

      let finalStatus = status;
      if (finalStatus === "LATE") finalStatus = "TARDY";
      if (!finalStatus || finalStatus === "PRESENT" || finalStatus === "TARDY") {
        if (finalCheckIn) {
          finalStatus = isLate ? "TARDY" : "PRESENT";
        }
      }

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
            isLate,
            lateMinutes,
            isEarlyOut,
            earlyOutMinutes,
            status: finalStatus || existing.status || "PRESENT"
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
          isLate,
          lateMinutes,
          isEarlyOut,
          earlyOutMinutes,
          status: finalStatus || "PRESENT"
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
        include: {
          Schedule: { where: { deletedAt: null } },
          company: true,
        }
      });

      if (employee && isOffDay(employee.Schedule, targetDate)) {
        if (status !== "OFF_DAY" && status !== "OFF") {
          return res.status(400).json({
            success: false,
            message: "This is an Off Day. Attendance cannot be marked for this day."
          });
        }
      }

      let finalCheckIn = checkInTime !== undefined 
        ? (checkInTime ? new Date(checkInTime) : null) 
        : (existingRecord ? existingRecord.checkInTime : null);

      let finalCheckOut = checkOutTime !== undefined 
        ? (checkOutTime ? new Date(checkOutTime) : null) 
        : (existingRecord ? existingRecord.checkOutTime : null);

      if (status === "ABSENT" || status === "OFF_DAY" || status === "OFF" || status === "LEAVE") {
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

      const activeSched = employee?.Schedule?.find(s => !s.deletedAt);
      const timezone = employee?.company?.timezone || "Asia/Karachi";
      const sTime = activeSched?.startTime || "09:00";
      const eTime = activeSched?.endTime || "18:00";

      let isLate = false;
      let lateMinutes = 0;
      let isEarlyOut = false;
      let earlyOutMinutes = 0;

      if (finalCheckIn) {
        const checkInMoment = moment(finalCheckIn).tz(timezone);
        const shiftStartLocal = moment.tz(`${updateDateStr} ${sTime}`, "YYYY-MM-DD HH:mm", timezone);
        const graceMins = activeSched?.allowEarlyIn ? (Number(activeSched.earlyInMinutes) || 0) : 0;
        const lateThreshold = shiftStartLocal.clone().add(graceMins, "minutes");

        if (checkInMoment.isAfter(lateThreshold)) {
          isLate = true;
          lateMinutes = checkInMoment.diff(shiftStartLocal, "minutes");
        }
      }

      if (finalCheckOut) {
        const checkOutMoment = moment(finalCheckOut).tz(timezone);
        const shiftStartLocal = moment.tz(`${updateDateStr} ${sTime}`, "YYYY-MM-DD HH:mm", timezone);
        let shiftEndLocal = moment.tz(`${updateDateStr} ${eTime}`, "YYYY-MM-DD HH:mm", timezone);
        if (shiftEndLocal.isBefore(shiftStartLocal)) {
          shiftEndLocal.add(1, "day");
        }
        const allowedEarlyOutMins = activeSched?.allowEarlyOut ? (Number(activeSched.earlyOutMinutes) || 0) : 0;
        const earlyOutThreshold = shiftEndLocal.clone().subtract(allowedEarlyOutMins, "minutes");

        if (checkOutMoment.isBefore(earlyOutThreshold)) {
          earlyOutMinutes = Math.max(0, shiftEndLocal.diff(checkOutMoment, "minutes"));
          if (earlyOutMinutes > 0) isEarlyOut = true;
        }
      }

      let finalStatus = status;
      if (finalStatus === "LATE") finalStatus = "TARDY";
      if (!finalStatus || finalStatus === "PRESENT" || finalStatus === "TARDY") {
        if (finalCheckIn) {
          finalStatus = isLate ? "TARDY" : "PRESENT";
        }
      }

      if (existingRecord) {
        const attendance = await prisma.attendance.update({
          where: { id: existingRecord.id },
          data: {
            checkInTime: finalCheckIn,
            checkOutTime: finalCheckOut,
            totalWorkedMinutes,
            isLate,
            lateMinutes,
            isEarlyOut,
            earlyOutMinutes,
            status: finalStatus || existingRecord.status
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
            isLate,
            lateMinutes,
            isEarlyOut,
            earlyOutMinutes,
            status: finalStatus || "PRESENT"
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

// 🔥 ADMIN ATTENDANCE DASHBOARD (TODAY)
exports.getAdminAttendanceDashboard = async (req, res) => {
  try {
    const { companyId } = req.query;
    const organizationId = req.user.organizationId;

    const queryStartDate = moment().subtract(1, "day").startOf("day").toDate();
    const queryEndDate = moment().add(1, "day").endOf("day").toDate();
    const todayStr = moment().format("YYYY-MM-DD");

    // 🔍 Employees filter (Org + Optional Company)
    const employeeWhere = {
      organizationId,
      deletedAt: null,
      NOT: { role: "ADMIN" },
    };

    if (companyId) {
      employeeWhere.companyId = Number(companyId);
    }

    // 👥 Get Employees
    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      include: {
        company: true,
        Attendance: {
          where: {
            OR: [
              { date: { gte: queryStartDate, lte: queryEndDate } },
              { checkInTime: { gte: queryStartDate, lte: queryEndDate } }
            ],
            deletedAt: null,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // 🟡 Approved Leaves Today
    const todayStart = moment().startOf("day").toDate();
    const todayEnd = moment().endOf("day").toDate();
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

    // 📊 Prepare Response
    let present = [];
    let absent = [];
    let onLeave = [];

    employees.forEach((emp) => {
      const attendance = emp.Attendance.find((att) => {
        const keys = new Set();
        if (att.date) {
          keys.add(moment(att.date).format("YYYY-MM-DD"));
          keys.add(moment.utc(att.date).format("YYYY-MM-DD"));
          if (emp.company?.timezone) {
            try { keys.add(moment(att.date).tz(emp.company.timezone).format("YYYY-MM-DD")); } catch (e) {}
          }
        }
        if (att.checkInTime) {
          keys.add(moment(att.checkInTime).format("YYYY-MM-DD"));
          keys.add(moment.utc(att.checkInTime).format("YYYY-MM-DD"));
          if (emp.company?.timezone) {
            try { keys.add(moment(att.checkInTime).tz(emp.company.timezone).format("YYYY-MM-DD")); } catch (e) {}
          }
        }
        return keys.has(todayStr);
      }) || emp.Attendance[0];

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

exports.exportAttendanceExcel = async (req, res) => {
  try {
    const user = req.user;
    const {
      date,
      departmentId,
      companyId,
      locationId,
      employeeId,
      filter,
      view,
      startDate: qStartDate,
      endDate: qEndDate,
      from,
      to,
    } = req.query;

    const baseDate = moment(date || new Date());

    let startDate;
    let endDate;

    const startQuery = qStartDate || from;
    const endQuery = qEndDate || to;

    if (startQuery && endQuery) {
      startDate = moment(startQuery).startOf("day").toDate();
      endDate = moment(endQuery).endOf("day").toDate();
    } else if (view === "weekly" || filter === "thisWeek") {
      startDate = baseDate.clone().startOf("isoWeek").toDate();
      endDate = baseDate.clone().endOf("isoWeek").toDate();
    } else if (view === "yearly" || filter === "thisYear") {
      startDate = baseDate.clone().startOf("year").toDate();
      endDate = baseDate.clone().endOf("year").toDate();
    } else {
      startDate = baseDate.clone().startOf("month").toDate();
      endDate = baseDate.clone().endOf("month").toDate();
    }

    let titleText = `Daily Attendance Tracker ${moment(startDate).format("MMMM YYYY")}`;
    if (view === "weekly" || filter === "thisWeek") {
      titleText = `Weekly Attendance Tracker (${moment(startDate).format("DD MMM YYYY")} - ${moment(endDate).format("DD MMM YYYY")})`;
    } else if (view === "yearly" || filter === "thisYear") {
      titleText = `Annual Attendance Tracker ${moment(startDate).format("YYYY")}`;
    } else if (startQuery && endQuery) {
      titleText = `Attendance Tracker (${moment(startDate).format("DD MMM YYYY")} - ${moment(endDate).format("DD MMM YYYY")})`;
    }

    let employeeWhere = { deletedAt: null, NOT: { role: "ADMIN" } };

    if (user.role === "USER") {
      employeeWhere.id = user.id;
    } else if (user.role === "SUPERVISOR") {
      employeeWhere.OR = [{ id: user.id }, { supervisorId: user.id }];
    } else if (user.role === "ADMIN") {
      if (employeeId && String(employeeId).toLowerCase() !== "all") {
        employeeWhere.id = Number(employeeId);
      }
      if (departmentId && String(departmentId).toLowerCase() !== "all") {
        employeeWhere.departmentId = Number(departmentId);
      }
      const targetLoc = companyId || locationId;
      if (targetLoc && String(targetLoc).toLowerCase() !== "all") {
        employeeWhere.companyId = Number(targetLoc);
      }
    }

    const excelQueryStart = moment(startDate).subtract(1, "day").startOf("day").toDate();
    const excelQueryEnd = moment(endDate).add(1, "day").endOf("day").toDate();

    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      include: {
        department: { select: { title: true } },
        supervisor: { select: { firstName: true, lastName: true } },
        jobInfo: true,
        company: true,
        Schedule: { where: { deletedAt: null } },
        Attendance: {
          where: {
            OR: [
              { date: { gte: excelQueryStart, lte: excelQueryEnd } },
              { checkInTime: { gte: excelQueryStart, lte: excelQueryEnd } }
            ],
            deletedAt: null,
          },
          include: { activities: true },
        },
      },
      orderBy: { id: "asc" },
    });

    const approvedLeaves = await prisma.leaveRequest.findMany({
      where: {
        status: "APPROVED",
        startDate: { lte: endDate },
        endDate: { gte: startDate },
        employee: { deletedAt: null },
      },
      include: { leaveType: true },
    });

    const leaveMap = {};
    approvedLeaves.forEach((lv) => {
      let cursor = moment(lv.startDate).startOf("day");
      const end = moment(lv.endDate).startOf("day");
      while (cursor.isSameOrBefore(end)) {
        const key = `${lv.employeeId}_${cursor.format("YYYY-MM-DD")}`;
        leaveMap[key] = lv;
        cursor.add(1, "day");
      }
    });

    const dateStrings = [];
    const dateMoments = [];
    let currentDay = moment(startDate).startOf("day");
    const lastDay = moment(endDate).startOf("day");
    while (currentDay.isSameOrBefore(lastDay)) {
      dateStrings.push(currentDay.format("YYYY-MM-DD"));
      dateMoments.push(currentDay.clone());
      currentDay.add(1, "day");
    }
    const daysCount = dateStrings.length;

    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Attendance Tracker");

    const totalCols = 20 + daysCount;

    // 1. Red Banner Title Row
    worksheet.mergeCells(1, 1, 1, totalCols);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = titleText;
    titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC00000" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(1).height = 38;

    // 2. Table Headers
    const headers = [
      "Emp IDs",
      "Agent / Employee Name",
      "Departments",
      "Sup Names",
      "Designation",
      "Status",
      "Total No. Of Days",
      "Schedule",
      "Present",
      "Annual Leaves",
      "Off Days",
      "Post-Acquired Leaves",
      "Paid Leaves (SL/Abs/CL)",
      "Early Leave",
      "Pre-Acquired Leaves",
      "Unpaid Days",
      "T",
      "MU",
      "ML",
      "Overall Leave",
    ];

    dateMoments.forEach((m) => {
      headers.push(m.format("dddd, MMMM D, YYYY"));
    });

    worksheet.getRow(2).values = headers;
    worksheet.getRow(2).height = 65;

    // Style Header Row (Row 2)
    for (let c = 1; c <= totalCols; c++) {
      const cell = worksheet.getCell(2, c);
      cell.font = { name: "Arial", size: 9, bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FF002060" } },
        left: { style: "thin", color: { argb: "FF002060" } },
        bottom: { style: "thin", color: { argb: "FF002060" } },
        right: { style: "thin", color: { argb: "FF002060" } },
      };

      if (c === 10 || c === 13 || c === 20) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } }; // Yellow header
        cell.font.color = { argb: "FF000000" };
      } else if (c > 20) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }; // Dark Navy
        cell.font.color = { argb: "FFFFFFFF" };
        cell.alignment.textRotation = 90;
      } else {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } };
        cell.font.color = { argb: "FF002060" };
      }
    }

    // 3. Employee Data Rows - ONE CLEAN ROW PER EMPLOYEE
    employees.forEach((emp, empIdx) => {
      const rowIndex = 3 + empIdx;
      const row = worksheet.getRow(rowIndex);

      const attendanceMap = {};
      emp.Attendance.forEach((att) => {
        const keys = new Set();
        if (att.date) {
          keys.add(moment(att.date).format("YYYY-MM-DD"));
          keys.add(moment.utc(att.date).format("YYYY-MM-DD"));
          if (emp.company?.timezone) {
            try { keys.add(moment(att.date).tz(emp.company.timezone).format("YYYY-MM-DD")); } catch (e) {}
          }
        }
        if (att.checkInTime) {
          keys.add(moment(att.checkInTime).format("YYYY-MM-DD"));
          keys.add(moment.utc(att.checkInTime).format("YYYY-MM-DD"));
          if (emp.company?.timezone) {
            try { keys.add(moment(att.checkInTime).tz(emp.company.timezone).format("YYYY-MM-DD")); } catch (e) {}
          }
        }
        keys.forEach(k => {
          if (!attendanceMap[k]) {
            attendanceMap[k] = att;
          }
        });
      });

      let presentCount = 0;
      let tardyCount = 0;
      let offDaysCount = 0;
      let annualLeavesCount = 0;
      let paidLeavesCount = 0;
      let unpaidDaysCount = 0;
      let missingPunchCount = 0;
      let medicalLeaveCount = 0;
      let scheduledWorkDays = 0;

      const dailyStatuses = dateStrings.map((dateStr) => {
        const leaveKey = `${emp.id}_${dateStr}`;
        const leave = leaveMap[leaveKey];

        const dayOff = isOffDay(emp.Schedule, dateStr);
        const isFutureDay = moment(dateStr, "YYYY-MM-DD").isAfter(moment().startOf("day"));

        if (!dayOff) {
          scheduledWorkDays++;
        } else {
          offDaysCount++;
        }

        if (leave) {
          const lType = (leave.leaveType?.name || "").toLowerCase();
          if (lType.includes("annual")) annualLeavesCount++;
          else if (lType.includes("unpaid")) unpaidDaysCount++;
          else if (lType.includes("medical") || lType.includes("sick")) medicalLeaveCount++;
          else paidLeavesCount++;
          return { code: "L", type: "LEAVE" };
        }

        const existing = attendanceMap[dateStr];
        if (!existing) {
          if (dayOff) return { code: "OFF", type: "OFF_DAY" };
          if (isFutureDay) return { code: "", type: "FUTURE" };
          unpaidDaysCount++;
          return { code: "A", type: "ABSENT" };
        }

        let st = (existing.status || "").toUpperCase();
        if (existing.checkInTime && st !== "LEAVE" && st !== "OFF_DAY") {
          const activeSched = emp.Schedule?.find(s => !s.deletedAt) || emp.Schedule?.[0];
          const empTz = emp.company?.timezone || "Asia/Karachi";
          const dayShift = getScheduleShiftForDay(activeSched, dateStr, empTz);
          const sTime = dayShift.startTime || activeSched?.startTime || "09:00";
          const graceMinutes = activeSched?.allowEarlyIn ? (Number(activeSched.earlyInMinutes) || 0) : 0;
          const checkInMoment = moment(existing.checkInTime).tz(empTz);
          const shiftStartLocal = moment.tz(`${dateStr} ${sTime}`, "YYYY-MM-DD HH:mm", empTz);
          const lateThreshold = shiftStartLocal.clone().add(graceMinutes, "minutes");

          if (checkInMoment.isAfter(lateThreshold)) {
            st = "TARDY";
          } else if (st === "TARDY" || st === "LATE" || st === "ABSENT" || !st) {
            st = "PRESENT";
          }
        }

        if (dayOff && st !== "PRESENT" && st !== "LATE" && st !== "TARDY") {
          return { code: "OFF", type: "OFF_DAY" };
        }

        if (st === "PRESENT") {
          presentCount++;
          return { code: "P", type: "PRESENT" };
        } else if (st === "LATE" || st === "TARDY") {
          presentCount++;
          tardyCount++;
          return { code: "T", type: "TARDY" };
        } else if (st === "LEAVE") {
          paidLeavesCount++;
          return { code: "L", type: "LEAVE" };
        } else if (st === "OFF_DAY" || st === "OFF") {
          return { code: "OFF", type: "OFF_DAY" };
        } else {
          unpaidDaysCount++;
          return { code: "A", type: "ABSENT" };
        }
      });

      const totalLeaves = annualLeavesCount + paidLeavesCount + unpaidDaysCount + medicalLeaveCount;
      const empCode = emp.employeeId || "NULL";
      const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "NULL";
      const deptTitle = emp.department?.title || "NULL";
      const supName = emp.supervisor
        ? `${emp.supervisor.firstName || ""} ${emp.supervisor.lastName || ""}`.trim() || "NULL"
        : "NULL";
      const desig = emp.jobInfo?.designation || "NULL";
      const statusStr = emp.jobInfo?.employmentStatus || "NULL";

      const rowValues = [
        empCode,
        fullName,
        deptTitle,
        supName,
        desig,
        statusStr,
        daysCount,
        scheduledWorkDays,
        presentCount,
        annualLeavesCount,
        offDaysCount,
        0,
        paidLeavesCount,
        0,
        0,
        unpaidDaysCount,
        tardyCount,
        missingPunchCount,
        medicalLeaveCount,
        totalLeaves,
        ...dailyStatuses.map((s) => s.code),
      ];

      row.values = rowValues;
      row.height = 22;

      for (let c = 1; c <= totalCols; c++) {
        const cell = worksheet.getCell(rowIndex, c);
        cell.font = { name: "Arial", size: 9 };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin", color: { argb: "FF002060" } },
          left: { style: "thin", color: { argb: "FF002060" } },
          bottom: { style: "thin", color: { argb: "FF002060" } },
          right: { style: "thin", color: { argb: "FF002060" } },
        };

        if (c === 2 || c === 5) {
          cell.alignment = { horizontal: "left", vertical: "middle" };
        }

        if (c > 20) {
          const st = dailyStatuses[c - 21];
          if (st.code === "OFF" || st.type === "FUTURE") {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF000000" } };
            cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
          } else if (st.code === "P") {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF8DC" } };
            cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF000000" } };
          } else if (st.code === "T" || st.code === "UT") {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDBA74" } };
            cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF9A3412" } };
          } else if (st.code === "A") {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFECDD3" } };
            cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF991B1B" } };
          } else if (st.code === "L") {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFBAE6FD" } };
            cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF075985" } };
          }
        }
      }
    });

    // Column Widths
    worksheet.getColumn(1).width = 14;
    worksheet.getColumn(2).width = 25;
    worksheet.getColumn(3).width = 16;
    worksheet.getColumn(4).width = 20;
    worksheet.getColumn(5).width = 28;
    worksheet.getColumn(6).width = 8;
    worksheet.getColumn(7).width = 10;
    worksheet.getColumn(8).width = 10;
    worksheet.getColumn(9).width = 10;
    worksheet.getColumn(10).width = 12;
    worksheet.getColumn(11).width = 10;
    worksheet.getColumn(12).width = 12;
    worksheet.getColumn(13).width = 14;
    worksheet.getColumn(14).width = 10;
    worksheet.getColumn(15).width = 12;
    worksheet.getColumn(16).width = 10;
    worksheet.getColumn(17).width = 6;
    worksheet.getColumn(18).width = 6;
    worksheet.getColumn(19).width = 6;
    worksheet.getColumn(20).width = 12;

    for (let c = 21; c <= totalCols; c++) {
      worksheet.getColumn(c).width = 5;
    }

    const exportFileName = (view === "weekly" || filter === "thisWeek")
      ? `Weekly_Attendance_Tracker_${moment(startDate).format("YYYY-MM-DD")}_to_${moment(endDate).format("YYYY-MM-DD")}.xlsx`
      : `Attendance_Tracker_${moment(startDate).format("YYYY-MM-DD")}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${exportFileName}"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Export Attendance Excel error:", error);
    res.status(500).json({ success: false, message: "Failed to export Excel report" });
  }
};



