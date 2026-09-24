const prisma = require("../../config/prisma");
const moment = require("moment-timezone");
const { parseHikvisionEvent, startHikvisionStream } = require("./hikvision.service");
const { fetchZkTecoLogs, testZkTecoConnection } = require("./zkteco.service");

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

function isOffDay(schedules, date, timezone = null) {
  if (!schedules) return false;
  const list = Array.isArray(schedules) ? schedules : [schedules];
  const activeSchedule = list.find((s) => s && !s.deletedAt) || list[0];
  if (!activeSchedule || !Array.isArray(activeSchedule.days) || activeSchedule.days.length === 0) {
    return false;
  }
  let mDate;
  if (typeof date === "string") {
    const clean = date.slice(0, 10);
    mDate = timezone ? moment.tz(clean, "YYYY-MM-DD", timezone) : moment(clean, "YYYY-MM-DD");
  } else if (moment.isMoment(date)) {
    mDate = timezone ? date.clone().tz(timezone) : date;
  } else {
    mDate = timezone ? moment(date).tz(timezone) : moment(date);
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

/**
 * Helper to match an employee by Biometric ID, Employee ID, or Machine Name
 */
async function findEmployee(biometricId, employeeName) {
  const bioIdStr = biometricId ? String(biometricId).trim() : "";

  // 1. Primary match by biometricId or employeeId
  if (bioIdStr) {
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { biometricId: bioIdStr },
          { employeeId: bioIdStr },
        ],
        deletedAt: null,
      },
      include: {
        company: true,
        Schedule: { where: { deletedAt: null }, orderBy: { id: "desc" } },
        jobInfo: true,
      },
    });
    if (employee) return employee;
  }

  // 2. Secondary match by machine name if provided
  if (employeeName && employeeName.trim()) {
    const cleanName = employeeName.trim().toLowerCase();
    const candidates = await prisma.employee.findMany({
      where: { deletedAt: null },
      include: {
        company: true,
        Schedule: { where: { deletedAt: null }, orderBy: { id: "desc" } },
        jobInfo: true,
      },
    });

    for (const c of candidates) {
      const full = `${c.firstName || ''} ${c.lastName || ''}`.trim().toLowerCase();
      if (full === cleanName) {
        if (bioIdStr && c.biometricId !== bioIdStr) {
          await prisma.employee.update({
            where: { id: c.id },
            data: { biometricId: bioIdStr },
          });
        }
        return c;
      }
    }

    const parts = cleanName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      for (const c of candidates) {
        const fn = (c.firstName || '').toLowerCase().trim();
        const ln = (c.lastName || '').toLowerCase().trim();
        if (parts[0] === fn && parts[parts.length - 1] === ln) {
          if (bioIdStr && c.biometricId !== bioIdStr) {
            await prisma.employee.update({
              where: { id: c.id },
              data: { biometricId: bioIdStr },
            });
          }
          return c;
        }
      }
    }
  }

  // 3. Match in soft-deleted employees and restore if active punch arrives
  try {
    const deletedCandidates = await prisma.employee.findMany({
      where: {
        deletedAt: { not: null },
        OR: [
          bioIdStr ? { biometricId: bioIdStr } : null,
          bioIdStr ? { employeeId: bioIdStr } : null,
          bioIdStr ? { username: { contains: bioIdStr } } : null,
          employeeName ? { firstName: { contains: employeeName.split(/\s+/)[0] } } : null,
        ].filter(Boolean),
      },
      include: {
        company: true,
        Schedule: { orderBy: { id: "desc" } },
        jobInfo: true,
      },
    });

    for (const d of deletedCandidates) {
      const full = `${d.firstName || ''} ${d.lastName || ''}`.trim().toLowerCase();
      const matchName = employeeName
        ? full.includes(employeeName.trim().toLowerCase()) || employeeName.trim().toLowerCase().includes(full)
        : false;
      const matchBio = bioIdStr && (d.biometricId === bioIdStr || (d.username && d.username.includes(bioIdStr)));

      if (matchBio || matchName) {
        const restored = await prisma.employee.update({
          where: { id: d.id },
          data: {
            deletedAt: null,
            biometricId: bioIdStr || d.biometricId,
          },
          include: {
            company: true,
            Schedule: { where: { deletedAt: null }, orderBy: { id: "desc" } },
            jobInfo: true,
          },
        });
        console.log(`[Biometric Punch] Restored previously deleted employee: ${restored.firstName} ${restored.lastName} (Bio: ${bioIdStr})`);
        return restored;
      }
    }
  } catch (err) {
    console.error("[Biometric Punch] Error checking deleted employees:", err.message);
  }

  // 4. Auto-provision new employee if completely new user punches on machine
  if (bioIdStr) {
    try {
      const parts = employeeName ? employeeName.trim().split(/\s+/) : [];
      const firstName = parts[0] || "Employee";
      const lastName = parts.slice(1).join(" ") || bioIdStr;
      const uniqueSuffix = Date.now().toString().slice(-4);
      const username = `emp_${bioIdStr}_${uniqueSuffix}`;
      const email = `emp_${bioIdStr}_${uniqueSuffix}@frontpin.local`;

      const firstOrg = await prisma.organization.findFirst();
      const firstComp = await prisma.company.findFirst();

      const newEmp = await prisma.employee.create({
        data: {
          firstName,
          lastName,
          username,
          email,
          biometricId: bioIdStr,
          employeeId: `BIO-${bioIdStr}`,
          organizationId: firstOrg?.id || 1,
          companyId: firstComp?.id || 1,
          canLogin: false,
          role: "USER",
        },
        include: {
          company: true,
          Schedule: true,
          jobInfo: true,
        },
      });

      console.log(`[Biometric Punch] Auto-provisioned new employee: ${firstName} ${lastName} (Bio: ${bioIdStr})`);
      return newEmp;
    } catch (createErr) {
      console.error("[Biometric Punch] Auto-provisioning failed:", createErr.message);
    }
  }

  return null;
}

/**
 * Determines whether a device is dedicated for CHECK_IN, CHECK_OUT, or DYNAMIC.
 * Prioritizes database configuration (direction), and falls back to device name matching.
 */
function getDeviceDirection(deviceName, deviceTag, configuredDirection = null) {
  if (configuredDirection === "CHECK_IN" || configuredDirection === "CHECK_OUT") {
    return configuredDirection;
  }
  if (configuredDirection === "AUTO") {
    return null;
  }

  const combined = `${deviceName || ""} ${deviceTag || ""}`.toLowerCase();

  // Dedicated Check-In terminals fallback
  if (/\b(gate\s*pass|gate\s*1)\b/i.test(combined)) {
    return "CHECK_IN";
  }

  // Dedicated Check-Out terminals fallback
  if (/\b(gate\s*2|gate\s*3)\b/i.test(combined)) {
    return "CHECK_OUT";
  }

  return null;
}

/**
 * Helper to compute worked minutes, overtime, and early out metrics
 */
function calculateAttendanceMetrics(inDate, outDate, schedule, shiftDateString, timezone) {
  if (!inDate || !outDate) {
    return {
      totalWorkedMinutes: 0,
      overtimeMinutes: 0,
      isEarlyOut: false,
      earlyOutMinutes: 0,
    };
  }

  const inMoment = moment(inDate);
  const outMoment = moment(outDate);

  // Calculate Overtime based on scheduled shift duration
  let scheduledDurationMinutes = 540; // Default 9 hours
  if (schedule?.startTime && schedule?.endTime) {
    const [sh, sm] = schedule.startTime.split(":").map(Number);
    const [eh, em] = schedule.endTime.split(":").map(Number);
    let sMins = (sh || 9) * 60 + (sm || 0);
    let eMins = (eh || 18) * 60 + (em || 0);
    if (eMins < sMins) {
      eMins += 24 * 60; // Cross-midnight shift
    }
    if (eMins > sMins) {
      scheduledDurationMinutes = eMins - sMins;
    }
  }

  // Max allowed overtime (default 120 mins = 2 hours)
  let maxOtMinutes = 120;
  if (schedule && schedule.overtimeAllowed === false) {
    maxOtMinutes = 0;
  } else if (schedule?.overtimeMinutes && Number(schedule.overtimeMinutes) > 0) {
    maxOtMinutes = Number(schedule.overtimeMinutes);
  }

  const maxAllowedWorkedMinutes = scheduledDurationMinutes + maxOtMinutes; // Default 540 + 120 = 660 mins (11 hours max)
  const rawWorkedMinutes = Math.max(0, Math.round(outMoment.diff(inMoment, "minutes")));
  const totalWorkedMinutes = Math.min(maxAllowedWorkedMinutes, rawWorkedMinutes);

  let overtimeMinutes = 0;
  if (maxOtMinutes > 0 && totalWorkedMinutes > scheduledDurationMinutes) {
    const rawExtra = totalWorkedMinutes - scheduledDurationMinutes;
    if (rawExtra >= 30) {
      overtimeMinutes = Math.min(rawExtra, maxOtMinutes);
    }
  }

  if (schedule && schedule.overtimeAllowed === false) {
    overtimeMinutes = 0;
  }

  // Calculate Early Out taking schedule.allowEarlyOut & earlyOutMinutes into account
  let isEarlyOut = false;
  let earlyOutMinutes = 0;

  if (schedule?.startTime && schedule?.endTime && shiftDateString) {
    const shiftStartLocal = moment.tz(
      `${shiftDateString} ${schedule.startTime}`,
      "YYYY-MM-DD HH:mm",
      timezone
    );
    let shiftEndLocal = moment.tz(
      `${shiftDateString} ${schedule.endTime}`,
      "YYYY-MM-DD HH:mm",
      timezone
    );
    if (shiftEndLocal.isBefore(shiftStartLocal)) {
      shiftEndLocal.add(1, "day");
    }

    const shiftEndUTC = shiftEndLocal.clone().utc();
    const punchUTC = outMoment.clone().utc();

    const allowedEarlyOutMins = schedule.allowEarlyOut ? (Number(schedule.earlyOutMinutes) || 0) : 0;
    const earlyOutThresholdUTC = shiftEndUTC.clone().subtract(allowedEarlyOutMins, "minutes");

    if (punchUTC.isBefore(earlyOutThresholdUTC)) {
      earlyOutMinutes = Math.max(0, shiftEndUTC.diff(punchUTC, "minutes"));
      if (earlyOutMinutes > 0) {
        isEarlyOut = true;
      }
    }
  }

  return {
    totalWorkedMinutes,
    overtimeMinutes,
    isEarlyOut,
    earlyOutMinutes,
  };
}

/**
 * Core Punch Handler: Maps biometricId/name -> Employee and records Attendance & AttendancePunch
 * Rules:
 * 1. Fixed Gate Pass & Gate 1 => ALWAYS CHECK_IN
 * 2. Fixed Gate 2 & Gate 3 => ALWAYS CHECK_OUT
 * 3. Store EVERY punch in AttendancePunch (deduplicating identical timestamps within 1 min).
 * 4. Calculate complete shift time from Check-In to Check-Out (up to 15 hours).
 */
async function processBiometricPunch({ biometricId, punchTime, brand, deviceName, method, employeeName, direction }) {
  if (!biometricId && !employeeName) {
    console.warn(`[Biometric Punch] Skipped - No biometricId or employeeName provided`);
    return { success: false, reason: "No identifier provided" };
  }

  const employee = await findEmployee(biometricId, employeeName);

  if (!employee) {
    console.warn(`[Biometric Punch] No Employee matched with biometricId: ${biometricId} / Name: ${employeeName}`);
    return { success: false, reason: `Employee not found for Biometric ID: ${biometricId} / Name: ${employeeName}` };
  }

  const bioIdStr = employee.biometricId || String(biometricId || "").trim();
  const timezone = employee.company?.timezone || "Asia/Karachi";
  const pTime = punchTime ? moment(punchTime).tz(timezone) : moment().tz(timezone);
  const punchDate = pTime.toDate();
  const deviceTag = deviceName ? `${brand} (${deviceName})` : brand;
  const punchMethod = method || brand;

  let deviceDirectionConfig = direction;
  if (!deviceDirectionConfig && deviceName) {
    try {
      const dbDev = await prisma.biometricDevice.findFirst({
        where: { name: deviceName, deletedAt: null },
        select: { direction: true },
      });
      if (dbDev?.direction) {
        deviceDirectionConfig = dbDev.direction;
      }
    } catch (e) {}
  }
  const deviceDir = getDeviceDirection(deviceName, deviceTag, deviceDirectionConfig);

  const todayDateString = pTime.format("YYYY-MM-DD");
  const todayStart = pTime.clone().startOf("day").utc().toDate();
  const todayEnd = pTime.clone().endOf("day").utc().toDate();

  const rawSchedule = employee.Schedule?.find((s) => !s.deletedAt) || { startTime: "09:00", endTime: "18:00" };

  // Check if schedule is a night / cross-midnight shift (e.g. 19:00 to 04:00)
  const [testSh, testSm] = (rawSchedule.startTime || "09:00").split(":").map(Number);
  const [testEh, testEm] = (rawSchedule.endTime || "18:00").split(":").map(Number);
  const isNightShift = ((testSh || 0) * 60 + (testSm || 0)) > ((testEh || 0) * 60 + (testEm || 0));

  // If night shift and punch happens in the morning before noon (< 12:00 PM),
  // this punch belongs to yesterday's night shift!
  let shiftDateMoment = pTime.clone();
  if (isNightShift && pTime.hour() < 12) {
    shiftDateMoment = pTime.clone().subtract(1, "day");
  }

  const shiftDateString = shiftDateMoment.format("YYYY-MM-DD");
  const shiftStartUtc = shiftDateMoment.clone().startOf("day").utc().toDate();
  const shiftEndUtc = shiftDateMoment.clone().endOf("day").utc().toDate();

  const dayShift = getScheduleShiftForDay(rawSchedule, shiftDateString, timezone);
  const schedule = {
    ...rawSchedule,
    startTime: dayShift.startTime || "09:00",
    endTime: dayShift.endTime || "18:00",
  };

  const shiftStartLocal = moment.tz(
    `${shiftDateString} ${schedule.startTime}`,
    "YYYY-MM-DD HH:mm",
    timezone
  );
  let shiftEndLocal = moment.tz(
    `${shiftDateString} ${schedule.endTime}`,
    "YYYY-MM-DD HH:mm",
    timezone
  );
  if (shiftEndLocal.isBefore(shiftStartLocal)) {
    shiftEndLocal.add(1, "day");
  }

  // Max extra hours (allowed overtime, default 120 mins = 2h)
  let maxOtMinutes = 120;
  if (schedule.overtimeAllowed === false) {
    maxOtMinutes = 0;
  } else if (schedule.overtimeMinutes && Number(schedule.overtimeMinutes) > 0) {
    maxOtMinutes = Number(schedule.overtimeMinutes);
  } else if (employee.jobInfo?.maxExtraHours != null) {
    maxOtMinutes = Number(employee.jobInfo.maxExtraHours) * 60;
  }

  const earliestAllowedInLocal = shiftStartLocal.clone().subtract(2, "hours");
  const cutoffLocal = shiftEndLocal.clone().add(maxOtMinutes, "minutes");
  const cutoffUtc = cutoffLocal.clone().utc();

  const calcLateness = (mPunch) => {
    if (isOffDay(employee.Schedule, shiftDateString, timezone)) {
      return { isLate: false, lateMinutes: 0, status: "OFF_DAY" };
    }

    const punchLocal = mPunch.clone().tz(timezone);
    const graceMinutes = schedule.allowEarlyIn ? (Number(schedule.earlyInMinutes) || 0) : 0;
    const lateThreshold = shiftStartLocal.clone().add(graceMinutes, "minutes");

    let isLate = false;
    let lateMinutes = 0;
    let status = "PRESENT";

    if (punchLocal.isAfter(lateThreshold)) {
      const rawDiffMins = punchLocal.diff(shiftStartLocal, "minutes");
      isLate = true;
      lateMinutes = rawDiffMins;
      status = "TARDY";
    }
    return { isLate, lateMinutes, status };
  };

  const recordPunch = async (attendanceId, type, time) => {
    const existing = await prisma.attendancePunch.findFirst({
      where: {
        attendanceId,
        employeeId: employee.id,
        type,
        punchTime: {
          gte: moment(time).subtract(1, "minutes").toDate(),
          lte: moment(time).add(1, "minutes").toDate(),
        },
      },
    });
    if (!existing) {
      await prisma.attendancePunch.create({
        data: {
          attendanceId,
          employeeId: employee.id,
          type,
          punchTime: time,
          device: deviceTag,
          method: punchMethod,
        },
      });
    }
  };

  // Find existing attendance for today
  let attendance = null;

  try {
    attendance = await prisma.attendance.findFirst({
      where: {
        employeeId: employee.id,
        date: {
          gte: shiftStartUtc,
          lte: shiftEndUtc,
        },
      },
      orderBy: { checkInTime: "asc" },
    });

    // If no attendance found for today, check for an active unclosed shift from yesterday within 11 hours (shift + 2h OT)
    if (!attendance) {
      const activeRecent = await prisma.attendance.findFirst({
        where: {
          employeeId: employee.id,
          checkInTime: { not: null },
          checkOutTime: null,
        },
        orderBy: { checkInTime: "desc" },
      });

      if (activeRecent && activeRecent.checkInTime) {
        const diffHoursFromCheckIn = pTime.diff(moment(activeRecent.checkInTime), "hours", true);
        if (diffHoursFromCheckIn >= 0 && diffHoursFromCheckIn < 11) {
          // If direction is CHECK_OUT or dynamic, close yesterday's shift
          if (deviceDir === "CHECK_OUT" || deviceDir === null) {
            attendance = activeRecent;
          }
        } else if (diffHoursFromCheckIn >= 11) {
          // Auto-close past unclosed attendance at 11 hours limit (max 9h shift + 2h OT)
          const autoOutTime = moment(activeRecent.checkInTime).add(11, "hours").toDate();
          await prisma.attendance.update({
            where: { id: activeRecent.id },
            data: {
              checkOutTime: autoOutTime,
              autoClockedOut: true,
              totalWorkedMinutes: 11 * 60,
              overtimeMinutes: 120,
            },
          });
        }
      }
    }
  } catch (err) {
    console.error("[Biometric Punch] Error finding attendance:", err.message);
  }

  // =========================================================================
  // 🟢 CASE A: DEDICATED CHECK-IN TERMINAL (e.g. HIKVISION Gate Pass, Gate 1)
  // =========================================================================
  if (deviceDir === "CHECK_IN") {
    // 1. Abnormally early punch: before shiftStart - 2 hours
    if (pTime.isBefore(earliestAllowedInLocal)) {
      if (!attendance) {
        try {
          attendance = await prisma.attendance.upsert({
            where: {
              employeeId_date: {
                employeeId: employee.id,
                date: shiftStartUtc,
              },
            },
            create: {
              employeeId: employee.id,
              date: shiftStartUtc,
              shiftStartTime: schedule.startTime,
              shiftEndTime: schedule.endTime,
              checkInTime: null,
              status: "PRESENT",
            },
            update: {},
          });
        } catch (err) {
          if (err.code === "P2002") {
            attendance = await prisma.attendance.findFirst({
              where: { employeeId: employee.id, date: { gte: shiftStartUtc, lte: shiftEndUtc } },
            });
          }
        }
      }

      if (attendance) {
        await recordPunch(attendance.id, "CHECK_IN", punchDate);
      }
      console.log(`[Biometric Punch] [${deviceTag}] Early punch before allowed 2h window recorded in punch log for ${employee.firstName} ${employee.lastName} (Punch: ${pTime.format("HH:mm")}, Earliest In: ${earliestAllowedInLocal.format("HH:mm")})`);
      return { success: true, type: "EARLY_PUNCH_RECORDED", employee, attendance };
    }

    // 2. Valid punch within window (>= earliestAllowedInLocal)
    if (!attendance) {
      const { isLate, lateMinutes, status } = calcLateness(pTime);
      try {
        attendance = await prisma.attendance.upsert({
          where: {
            employeeId_date: {
              employeeId: employee.id,
              date: shiftStartUtc,
            },
          },
          create: {
            employeeId: employee.id,
            date: shiftStartUtc,
            shiftStartTime: schedule.startTime,
            shiftEndTime: schedule.endTime,
            checkInTime: punchDate,
            checkInMethod: punchMethod,
            checkInDevice: deviceTag,
            isLate,
            lateMinutes,
            status,
          },
          update: {},
        });
      } catch (err) {
        if (err.code === "P2002") {
          attendance = await prisma.attendance.findFirst({
            where: { employeeId: employee.id, date: { gte: shiftStartUtc, lte: shiftEndUtc } },
          });
        } else {
          throw err;
        }
      }

      if (attendance) {
        await recordPunch(attendance.id, "CHECK_IN", punchDate);
        console.log(`[Biometric Punch] [${deviceTag}] CHECK-IN recorded for ${employee.firstName} ${employee.lastName} (${bioIdStr}) at ${punchDate.toISOString()}`);
        return { success: true, type: "CHECK_IN", employee, attendance };
      }
    }

    // Attendance already exists
    // 1. If checkInTime is missing (or was null due to early punch or checkout punch arriving first)
    if (!attendance.checkInTime) {
      const { isLate, lateMinutes, status } = calcLateness(pTime);
      const updateData = {
        checkInTime: punchDate,
        checkInMethod: punchMethod,
        checkInDevice: deviceTag,
        isLate,
        lateMinutes,
        status,
      };

      if (attendance.checkOutTime) {
        const metrics = calculateAttendanceMetrics(punchDate, attendance.checkOutTime, schedule, shiftDateString, timezone);
        Object.assign(updateData, metrics);
      }

      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: updateData,
      });

      await recordPunch(attendance.id, "CHECK_IN", punchDate);
      console.log(`[Biometric Punch] [${deviceTag}] CHECK-IN set for ${employee.firstName} ${employee.lastName} (${bioIdStr})`);
      return { success: true, type: "CHECK_IN", employee, attendance };
    }

    // 2. If incoming punch is EARLIER than current checkInTime AND is within allowed window
    if (pTime.isBefore(moment(attendance.checkInTime)) && pTime.isSameOrAfter(earliestAllowedInLocal)) {
      const { isLate, lateMinutes, status } = calcLateness(pTime);
      const updateData = {
        checkInTime: punchDate,
        checkInMethod: punchMethod,
        checkInDevice: deviceTag,
        isLate,
        lateMinutes,
        status,
      };

      if (attendance.checkOutTime) {
        const metrics = calculateAttendanceMetrics(punchDate, attendance.checkOutTime, schedule, shiftDateString, timezone);
        Object.assign(updateData, metrics);
      }

      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: updateData,
      });

      await recordPunch(attendance.id, "CHECK_IN", punchDate);
      console.log(`[Biometric Punch] [${deviceTag}] CHECK-IN updated earlier for ${employee.firstName} ${employee.lastName} (${bioIdStr})`);
      return { success: true, type: "CHECK_IN_UPDATED", employee, attendance };
    }

    // 3. Subsequent punch on Gate Pass or Gate 1 during the shift:
    // ALWAYS record as CHECK_IN punch, NEVER set or overwrite checkOutTime!
    await recordPunch(attendance.id, "CHECK_IN", punchDate);
    console.log(`[Biometric Punch] [${deviceTag}] Additional CHECK-IN stored for ${employee.firstName} ${employee.lastName} (${bioIdStr})`);
    return { success: true, type: "CHECK_IN_STORED", employee, attendance };
  }

  // =========================================================================
  // 🔴 CASE B: DEDICATED CHECK-OUT TERMINAL (e.g. HIKVISION Gate 2, Gate 3)
  // =========================================================================
  if (deviceDir === "CHECK_OUT") {
    const isPastCutoff = pTime.isAfter(cutoffLocal);
    const effectiveCheckOutDate = isPastCutoff ? cutoffUtc.toDate() : punchDate;
    const autoClockedOut = isPastCutoff;

    if (!attendance) {
      // Create attendance record with Check-Out (Check-In pending)
      try {
        attendance = await prisma.attendance.upsert({
          where: {
            employeeId_date: {
              employeeId: employee.id,
              date: shiftStartUtc,
            },
          },
          create: {
            employeeId: employee.id,
            date: shiftStartUtc,
            shiftStartTime: schedule.startTime,
            shiftEndTime: schedule.endTime,
            checkInTime: null,
            checkOutTime: effectiveCheckOutDate,
            checkOutMethod: punchMethod,
            checkOutDevice: deviceTag,
            status: "PRESENT",
            autoClockedOut,
          },
          update: {},
        });
      } catch (err) {
        if (err.code === "P2002") {
          attendance = await prisma.attendance.findFirst({
            where: { employeeId: employee.id, date: { gte: shiftStartUtc, lte: shiftEndUtc } },
          });
        } else {
          throw err;
        }
      }

      if (attendance) {
        // ALWAYS store the real physical punch in AttendancePunch
        await recordPunch(attendance.id, "CHECK_OUT", punchDate);
        console.log(`[Biometric Punch] [${deviceTag}] CHECK-OUT recorded for ${employee.firstName} ${employee.lastName} (${bioIdStr})`);
        return { success: true, type: "CHECK_OUT", employee, attendance };
      }
    }

    // Attendance already exists
    // ALWAYS store the real physical punch in AttendancePunch
    await recordPunch(attendance.id, "CHECK_OUT", punchDate);

    // Update checkOutTime with latest exit punch (capped at cutoff if past cutoff)
    const currentOutMoment = attendance.checkOutTime ? moment(attendance.checkOutTime) : null;
    const isLatestOut = !currentOutMoment || pTime.isAfter(currentOutMoment);

    if (isLatestOut) {
      const updateData = {
        checkOutTime: effectiveCheckOutDate,
        checkOutMethod: punchMethod,
        checkOutDevice: deviceTag,
        autoClockedOut,
      };

      if (attendance.checkInTime) {
        const metrics = calculateAttendanceMetrics(attendance.checkInTime, effectiveCheckOutDate, schedule, shiftDateString, timezone);
        Object.assign(updateData, metrics);
      }

      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: updateData,
      });

      console.log(`[Biometric Punch] [${deviceTag}] CHECK-OUT updated for ${employee.firstName} ${employee.lastName} (${bioIdStr}) (Capped: ${isPastCutoff})`);
    }

    return { success: true, type: "CHECK_OUT", employee, attendance };
  }

  // =========================================================================
  // ⚪ CASE C: DYNAMIC / UNASSIGNED TERMINALS (e.g. Enrolling Device)
  // =========================================================================
  if (!attendance) {
    // 1. Abnormally early punch: before shiftStart - 2 hours
    if (pTime.isBefore(earliestAllowedInLocal)) {
      try {
        attendance = await prisma.attendance.upsert({
          where: {
            employeeId_date: {
              employeeId: employee.id,
              date: shiftStartUtc,
            },
          },
          create: {
            employeeId: employee.id,
            date: shiftStartUtc,
            shiftStartTime: schedule.startTime,
            shiftEndTime: schedule.endTime,
            checkInTime: null,
            status: "PRESENT",
          },
          update: {},
        });
      } catch (err) {
        if (err.code === "P2002") {
          attendance = await prisma.attendance.findFirst({
            where: { employeeId: employee.id, date: { gte: shiftStartUtc, lte: shiftEndUtc } },
          });
        }
      }

      if (attendance) {
        await recordPunch(attendance.id, "CHECK_IN", punchDate);
      }
      console.log(`[Biometric Punch] Early punch outside 2h window recorded in punch log for ${employee.firstName} ${employee.lastName} (Punch: ${pTime.format("HH:mm")}, Earliest In: ${earliestAllowedInLocal.format("HH:mm")})`);
      return { success: true, type: "EARLY_PUNCH_RECORDED", employee, attendance };
    }

    // 2. Normal check-in within window
    const { isLate, lateMinutes, status } = calcLateness(pTime);

    try {
      attendance = await prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: shiftStartUtc,
          },
        },
        create: {
          employeeId: employee.id,
          date: shiftStartUtc,
          shiftStartTime: schedule.startTime,
          shiftEndTime: schedule.endTime,
          checkInTime: punchDate,
          checkInMethod: punchMethod,
          checkInDevice: deviceTag,
          isLate,
          lateMinutes,
          status,
        },
        update: {},
      });
    } catch (err) {
      if (err.code === "P2002") {
        attendance = await prisma.attendance.findFirst({
          where: { employeeId: employee.id, date: { gte: shiftStartUtc, lte: shiftEndUtc } },
        });
      } else {
        throw err;
      }
    }

    if (attendance) {
      await recordPunch(attendance.id, "CHECK_IN", punchDate);
      console.log(`[Biometric Punch] CHECK-IN recorded for ${employee.firstName} ${employee.lastName} (${bioIdStr})`);
      return { success: true, type: "CHECK_IN", employee, attendance };
    }
  }

  // Attendance already exists for dynamic terminal
  // If checkInTime is missing
  if (!attendance.checkInTime) {
    if (pTime.isBefore(earliestAllowedInLocal)) {
      await recordPunch(attendance.id, "CHECK_IN", punchDate);
      return { success: true, type: "EARLY_PUNCH_RECORDED", employee, attendance };
    }

    const { isLate, lateMinutes, status } = calcLateness(pTime);
    const updateData = {
      checkInTime: punchDate,
      checkInMethod: punchMethod,
      checkInDevice: deviceTag,
      isLate,
      lateMinutes,
      status,
    };

    if (attendance.checkOutTime) {
      const metrics = calculateAttendanceMetrics(punchDate, attendance.checkOutTime, schedule, shiftDateString, timezone);
      Object.assign(updateData, metrics);
    }

    attendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: updateData,
    });

    await recordPunch(attendance.id, "CHECK_IN", punchDate);
    return { success: true, type: "CHECK_IN", employee, attendance };
  }

  let inTimeMoment = moment(attendance.checkInTime);

  // If incoming punch is earlier than existing checkInTime
  if (pTime.isBefore(inTimeMoment)) {
    if (pTime.isBefore(earliestAllowedInLocal)) {
      // Abnormally early: store in punches only, do not shift checkInTime before 2h window
      await recordPunch(attendance.id, "CHECK_IN", punchDate);
      return { success: true, type: "EARLY_PUNCH_RECORDED", employee, attendance };
    }

    const { isLate, lateMinutes, status } = calcLateness(pTime);
    const updateData = {
      checkInTime: punchDate,
      checkInMethod: punchMethod,
      checkInDevice: deviceTag,
      isLate,
      lateMinutes,
      status,
    };

    if (attendance.checkOutTime) {
      const metrics = calculateAttendanceMetrics(punchDate, attendance.checkOutTime, schedule, shiftDateString, timezone);
      Object.assign(updateData, metrics);
    }

    attendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: updateData,
    });

    await recordPunch(attendance.id, "CHECK_IN", punchDate);
    return { success: true, type: "CHECK_IN_UPDATED", employee, attendance };
  }

  const diffMinutesFromIn = pTime.diff(inTimeMoment, "minutes", true);

  // Duplicates within 2 minutes of check-in
  if (diffMinutesFromIn < 2) {
    await recordPunch(attendance.id, "CHECK_IN", punchDate);
    return { success: true, type: "DUPLICATE_CHECK_IN_STORED", employee, attendance };
  }

  // Record CHECK_OUT for dynamic terminal
  // Real physical punch is ALWAYS stored in AttendancePunch
  await recordPunch(attendance.id, "CHECK_OUT", punchDate);

  const isPastCutoff = pTime.isAfter(cutoffLocal);
  const effectiveCheckOutDate = isPastCutoff ? cutoffUtc.toDate() : punchDate;
  const autoClockedOut = isPastCutoff;

  const currentOutMoment = attendance.checkOutTime ? moment(attendance.checkOutTime) : null;
  const isLatestOut = !currentOutMoment || pTime.isAfter(currentOutMoment);

  if (isLatestOut) {
    const metrics = calculateAttendanceMetrics(inTimeMoment, effectiveCheckOutDate, schedule, shiftDateString, timezone);

    attendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOutTime: effectiveCheckOutDate,
        checkOutMethod: punchMethod,
        checkOutDevice: deviceTag,
        autoClockedOut,
        ...metrics,
      },
    });

    console.log(`[Biometric Punch] CHECK-OUT updated for ${employee.firstName} ${employee.lastName} (${bioIdStr}) (Capped: ${isPastCutoff})`);
  }

  return { success: true, type: "CHECK_OUT", employee, attendance };
}

// ----------------------------------------------------------------------
// CONTROLLERS
// ----------------------------------------------------------------------

/**
 * Hikvision Webhook Listener
 * Endpoint: POST /api/devices/hikvision/event
 */
exports.handleHikvisionEvent = async (req, res) => {
  try {
    const eventData = await parseHikvisionEvent(req.body);
    
    if (eventData && eventData.biometricId) {
      let devName = "Hikvision Terminal";
      const clientIp = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || req.ip || "").replace(/^.*:/, "");
      if (clientIp) {
        const foundDev = await prisma.biometricDevice.findFirst({
          where: { ipAddress: { contains: clientIp }, deletedAt: null },
        });
        if (foundDev?.name) {
          devName = foundDev.name;
        }
      }

      await processBiometricPunch({
        biometricId: eventData.biometricId,
        punchTime: eventData.punchTime,
        brand: "HIKVISION",
        deviceName: devName,
        method: eventData.method,
        employeeName: eventData.employeeName,
      });
    }

    // Always respond with ISAPI success format to Hikvision Machine
    return res.status(200).json({
      ResponseStatus: {
        requestURL: "/api/devices/hikvision/event",
        statusCode: 1,
        statusString: "OK",
        subStatusCode: "ok",
      },
    });
  } catch (error) {
    console.error("Error in handleHikvisionEvent:", error);
    return res.status(200).json({ status: "ACK" });
  }
};

/**
 * List all registered biometric devices
 */
exports.getDevices = async (req, res) => {
  try {
    const devices = await prisma.biometricDevice.findMany({
      where: { deletedAt: null },
      orderBy: { id: "desc" },
    });
    return res.json({ success: true, data: devices });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Add a new device
 */
exports.addDevice = async (req, res) => {
  try {
    const { name, brand, ipAddress, port, username, password, companyId, direction } = req.body;

    const device = await prisma.biometricDevice.create({
      data: {
        name,
        brand,
        ipAddress,
        port: port ? parseInt(port) : 4370,
        username,
        password,
        companyId: companyId ? parseInt(companyId) : null,
        direction: direction || "AUTO",
      },
    });

    if (device.brand === "HIKVISION") {
      startHikvisionStream(device, processBiometricPunch);
    }

    return res.json({ success: true, data: device });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update a device
 */
exports.updateDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, brand, ipAddress, port, username, password, status, companyId, direction } = req.body;

    const updateData = {
      name,
      brand,
      ipAddress: ipAddress ? ipAddress.trim() : undefined,
      port: port ? parseInt(port) : (brand === "HIKVISION" ? 8000 : 4370),
      username,
      status,
      direction: direction !== undefined ? direction : undefined,
      companyId: companyId !== undefined ? (companyId ? parseInt(companyId) : null) : undefined,
    };

    // Only update password if a non-empty string is provided
    if (password && password.trim() !== "") {
      updateData.password = password;
    }

    const device = await prisma.biometricDevice.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    if (device.brand === "HIKVISION") {
      startHikvisionStream(device, processBiometricPunch);
    }

    return res.json({ success: true, data: device });

  } catch (error) {
    console.error("Error updating device:", error);
    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: "A device with this IP address already exists",
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete a device
 */
exports.deleteDevice = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.biometricDevice.update({
      where: { id: parseInt(id) },
      data: { deletedAt: new Date() },
    });
    return res.json({ success: true, message: "Device deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Test Connection to a device
 */
exports.testDeviceConnection = async (req, res) => {
  try {
    const { id } = req.params;
    const device = await prisma.biometricDevice.findUnique({
      where: { id: parseInt(id) },
    });

    if (!device) return res.status(404).json({ success: false, message: "Device not found" });

    let isOnline = false;

    if (device.brand === "ZKTECO") {
      isOnline = await testZkTecoConnection(device.ipAddress, device.port);
    } else {
      // Hikvision ping test or status check
      isOnline = true; // Placeholder for Hikvision ISAPI ping
    }

    await prisma.biometricDevice.update({
      where: { id: device.id },
      data: { status: isOnline ? "ONLINE" : "OFFLINE" },
    });

    return res.json({ success: true, isOnline, status: isOnline ? "ONLINE" : "OFFLINE" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Helper to sync a single device's logs
 */
async function syncSingleDevice(device, prismaInstance = prisma, processPunchCallback = processBiometricPunch) {
  if (device.brand === "ZKTECO") {
    const logs = await fetchZkTecoLogs(device.ipAddress, device.port);
    let count = 0;

    for (const log of logs) {
      const punchRes = await processPunchCallback({
        biometricId: log.deviceUserId || log.userId,
        punchTime: log.recordTime || log.timestamp,
        brand: "ZKTECO",
        deviceName: device.name,
        method: "FINGERPRINT",
      });
      if (punchRes?.success) count++;
    }

    await prismaInstance.biometricDevice.update({
      where: { id: device.id },
      data: { lastSyncedAt: new Date(), status: "ONLINE" },
    });

    return { success: true, count, brand: "ZKTECO", deviceName: device.name };
  } else if (device.brand === "HIKVISION") {
    const { syncHikvisionDeviceLogs } = require("./hikvision.service");
    const result = await syncHikvisionDeviceLogs(device, processPunchCallback);

    await prismaInstance.biometricDevice.update({
      where: { id: device.id },
      data: { lastSyncedAt: new Date(), status: result.success ? "ONLINE" : "OFFLINE" },
    });

    return {
      success: result.success,
      count: result.count || 0,
      totalEvents: result.totalEvents || 0,
      brand: "HIKVISION",
      deviceName: device.name,
      error: result.error,
    };
  } else {
    throw new Error(`Unsupported device brand: ${device.brand}`);
  }
}

/**
 * Sync ALL registered active biometric devices in parallel
 */
async function syncAllActiveDevices(prismaInstance = prisma, processPunchCallback = processBiometricPunch) {
  const devices = await prismaInstance.biometricDevice.findMany({
    where: { deletedAt: null },
  });

  if (devices.length === 0) {
    return { success: true, count: 0, devicesSynced: 0, totalDevices: 0, message: "No registered biometric devices found." };
  }

  // Run all device syncs concurrently in parallel for maximum speed
  const syncPromises = devices.map(async (device) => {
    try {
      const res = await syncSingleDevice(device, prismaInstance, processPunchCallback);
      return res;
    } catch (err) {
      console.error(`[Device Sync Failed] ${device.name} (${device.ipAddress}):`, err.message);
      try {
        await prismaInstance.biometricDevice.update({
          where: { id: device.id },
          data: { status: "OFFLINE" },
        });
      } catch (e) {}
      return {
        success: false,
        deviceName: device.name,
        brand: device.brand,
        error: err.message,
      };
    }
  });

  const settledResults = await Promise.allSettled(syncPromises);

  let totalCount = 0;
  let successfulDevices = 0;
  const results = [];

  for (const item of settledResults) {
    if (item.status === "fulfilled") {
      const res = item.value;
      if (res && res.success) {
        totalCount += res.count || 0;
        successfulDevices++;
      }
      results.push(res);
    } else {
      results.push({
        success: false,
        error: item.reason?.message || "Device communication error",
      });
    }
  }

  return {
    success: true,
    count: totalCount,
    devicesSynced: successfulDevices,
    totalDevices: devices.length,
    results,
  };
}

/**
 * Manual Sync Logs for a single Device
 */
exports.syncDeviceLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const device = await prisma.biometricDevice.findUnique({
      where: { id: parseInt(id) },
    });

    if (!device) return res.status(404).json({ success: false, message: "Device not found" });

    const result = await syncSingleDevice(device, prisma, processBiometricPunch);
    return res.json({
      success: result.success,
      message: `Synced ${result.count || 0} ${device.brand} attendance records successfully!`,
      data: result,
    });
  } catch (error) {
    console.error("Error in syncDeviceLogs:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Sync ALL registered biometric devices on demand
 */
exports.syncAllDevicesRoute = async (req, res) => {
  try {
    const summary = await syncAllActiveDevices(prisma, processBiometricPunch);
    return res.json({
      success: true,
      count: summary.count,
      devicesSynced: summary.devicesSynced,
      totalDevices: summary.totalDevices,
      message: summary.totalDevices === 0
        ? "No biometric machines registered in system."
        : `Synced ${summary.count} punches from ${summary.devicesSynced} machine(s) successfully!`,
      results: summary.results,
    });
  } catch (error) {
    console.error("Error in syncAllDevicesRoute:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Push all active Employees (or a single employee) to active Hikvision devices
 */
exports.pushUsersToDevices = async (req, res) => {
  try {
    const { employeeId } = req.body;
    const { pushUserToHikvision, syncBiometricsAcrossDevices } = require("./hikvision.service");

    const activeDevices = await prisma.biometricDevice.findMany({
      where: { brand: "HIKVISION", deletedAt: null },
    });

    if (activeDevices.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No active Hikvision biometric devices found in system.",
      });
    }

    let employees = [];
    if (employeeId) {
      const emp = await prisma.employee.findUnique({
        where: { id: parseInt(employeeId) },
      });
      if (emp) employees = [emp];
    } else {
      employees = await prisma.employee.findMany({
        where: { deletedAt: null, role: { not: "ADMIN" } },
      });
    }

    if (employees.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No employees found to push to machine.",
      });
    }

    let successCount = 0;
    let failedCount = 0;

    for (const emp of employees) {
      const bioId = emp.biometricId || emp.employeeId || String(emp.id);
      const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || `User ${bioId}`;

      for (const device of activeDevices) {
        const pushed = await pushUserToHikvision(device, {
          biometricId: bioId,
          name: name,
        });
        if (pushed) successCount++;
        else failedCount++;
      }
    }

    // Trigger background cross-device biometric template sync (non-blocking)
    syncBiometricsAcrossDevices(prisma).catch((e) => console.error("Background sync error:", e.message));

    return res.json({
      success: true,
      message: `Pushed ${employees.length} employee(s) to biometric device(s) successfully!`,
      details: { successCount, failedCount, totalEmployees: employees.length },
    });
  } catch (error) {
    console.error("Error in pushUsersToDevices:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Manually triggers a complete cross-device biometrics and user sync
 */
exports.triggerBiometricsCrossSync = async (req, res) => {
  try {
    const { syncBiometricsAcrossDevices } = require("./hikvision.service");
    // Run in background and respond immediately so the request doesn't timeout
    syncBiometricsAcrossDevices(prisma).then((result) => {
      console.log("[Biometrics Cross-Sync API result]:", result);
    }).catch((e) => {
      console.error("[Biometrics Cross-Sync API error]:", e.message);
    });

    return res.json({
      success: true,
      message: "Biometric cross-device synchronization initiated in background across all connected terminals.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  processBiometricPunch,
  handleHikvisionEvent: exports.handleHikvisionEvent,
  getDevices: exports.getDevices,
  addDevice: exports.addDevice,
  updateDevice: exports.updateDevice,
  deleteDevice: exports.deleteDevice,
  testDeviceConnection: exports.testDeviceConnection,
  syncDeviceLogs: exports.syncDeviceLogs,
  syncAllDevicesRoute: exports.syncAllDevicesRoute,
  syncAllActiveDevices,
  syncSingleDevice,
  pushUsersToDevices: exports.pushUsersToDevices,
  triggerBiometricsCrossSync: exports.triggerBiometricsCrossSync,
};

