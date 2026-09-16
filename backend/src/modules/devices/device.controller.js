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
        Schedule: { where: { deletedAt: null } },
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
        Schedule: { where: { deletedAt: null } },
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

  return null;
}

/**
 * Core Punch Handler: Maps biometricId/name -> Employee and records Attendance & AttendancePunch
 * Rules:
 * 1. Store EVERY punch in AttendancePunch (deduplicating identical timestamps).
 * 2. If a punch arrives earlier than current checkInTime, update checkInTime.
 * 3. If punch is within 2 minutes of Check-In, treat as duplicate scan (do NOT set Check-Out).
 * 4. Calculate complete shift time from First Punch (Check-In) to Last Punch (Check-Out) within 15 hours.
 * 5. Calculate Overtime if worked hours exceed scheduled shift duration.
 * 6. If punch arrives > 15 hours after initial Check-In, auto-close previous shift at 15hr and start a new shift.
 */
async function processBiometricPunch({ biometricId, punchTime, brand, deviceName, method, employeeName }) {
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

  const todayDateString = pTime.format("YYYY-MM-DD");
  const todayStart = pTime.clone().startOf("day").utc().toDate();
  const todayEnd = pTime.clone().endOf("day").utc().toDate();

  // Shift snapshot
  const rawSchedule = employee.Schedule?.find((s) => !s.deletedAt) || { startTime: "09:00", endTime: "18:00" };
  const dayShift = getScheduleShiftForDay(rawSchedule, todayDateString, timezone);
  const schedule = {
    ...rawSchedule,
    startTime: dayShift.startTime || "09:00",
    endTime: dayShift.endTime || "18:00",
  };

  const calcLateness = (mPunch) => {
    const shiftStartLocal = moment.tz(
      `${todayDateString} ${schedule.startTime}`,
      "YYYY-MM-DD HH:mm",
      timezone
    );
    const shiftStartUTC = shiftStartLocal.clone().utc();
    const punchUTC = mPunch.clone().utc();

    let isLate = false;
    let lateMinutes = 0;
    let status = "PRESENT";

    if (punchUTC.isAfter(shiftStartUTC)) {
      lateMinutes = punchUTC.diff(shiftStartUTC, "minutes");
      if (lateMinutes > 0) {
        isLate = true;
        status = "LATE";
      }
    }
    return { isLate, lateMinutes, status };
  };

  const recordPunch = async (attendanceId, type, time) => {
    const existing = await prisma.attendancePunch.findFirst({
      where: {
        attendanceId,
        employeeId: employee.id,
        punchTime: time,
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

  // Find existing attendance for today (use upsert to prevent race-condition duplicates)
  let attendance = null;
  let isNewCheckIn = false;

  try {
    // First try to find existing record
    attendance = await prisma.attendance.findFirst({
      where: {
        employeeId: employee.id,
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      orderBy: { checkInTime: "asc" },
    });

    // If no attendance found for today, check for an active unclosed shift from yesterday within 15 hours
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
        if (diffHoursFromCheckIn < 15) {
          // Still within 15-hour window of the previous shift
          attendance = activeRecent;
        } else {
          // Auto-close past unclosed attendance at 15 hours limit
          const autoOutTime = moment(activeRecent.checkInTime).add(15, "hours").toDate();
          await prisma.attendance.update({
            where: { id: activeRecent.id },
            data: {
              checkOutTime: autoOutTime,
              autoClockedOut: true,
              totalWorkedMinutes: 15 * 60,
            },
          });
        }
      }
    }

    // 1️⃣ First Punch of the Shift -> CHECK-IN (atomic upsert to prevent duplicates)
    if (!attendance) {
      const { isLate, lateMinutes, status } = calcLateness(pTime);

      attendance = await prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: todayStart,
          },
        },
        create: {
          employeeId: employee.id,
          date: todayStart,
          shiftStartTime: schedule.startTime,
          shiftEndTime: schedule.endTime,
          checkInTime: punchDate,
          checkInMethod: punchMethod,
          checkInDevice: deviceTag,
          isLate,
          lateMinutes,
          status,
        },
        update: {},  // If already exists, don't overwrite — just return it
      });

      isNewCheckIn = true;
    }
  } catch (err) {
    // P2002 = unique constraint violation (another stream already created the record)
    if (err.code === "P2002") {
      attendance = await prisma.attendance.findFirst({
        where: {
          employeeId: employee.id,
          date: { gte: todayStart, lte: todayEnd },
        },
        orderBy: { checkInTime: "asc" },
      });
    } else {
      throw err;
    }
  }

  if (isNewCheckIn && attendance) {
    await recordPunch(attendance.id, "CHECK_IN", punchDate);
    console.log(`[Biometric Punch] CHECK-IN recorded for ${employee.firstName} ${employee.lastName} (${bioIdStr}) at ${punchDate.toISOString()}`);
    return { success: true, type: "CHECK_IN", employee, attendance };
  }

  // 2️⃣ Attendance already exists for this shift
  const inTimeMoment = moment(attendance.checkInTime || punchDate);

  // If incoming punch is EARLIER than currently recorded checkInTime, update checkInTime!
  if (pTime.isBefore(inTimeMoment)) {
    const { isLate, lateMinutes, status } = calcLateness(pTime);

    attendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkInTime: punchDate,
        checkInMethod: punchMethod,
        checkInDevice: deviceTag,
        isLate,
        lateMinutes,
        status,
      },
    });

    await recordPunch(attendance.id, "CHECK_IN", punchDate);
    console.log(`[Biometric Punch] CHECK-IN updated earlier for ${employee.firstName} ${employee.lastName} (${bioIdStr}) to ${punchDate.toISOString()}`);
    return { success: true, type: "CHECK_IN_UPDATED", employee, attendance };
  }

  const diffMinutesFromIn = pTime.diff(inTimeMoment, "minutes", true);
  const diffHoursFromIn = pTime.diff(inTimeMoment, "hours", true);

  // If > 15 hours passed since Check-In, auto-close previous shift and create new attendance for today
  if (diffHoursFromIn >= 15) {
    if (!attendance.checkOutTime) {
      await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          checkOutTime: inTimeMoment.clone().add(15, "hours").toDate(),
          autoClockedOut: true,
          totalWorkedMinutes: 15 * 60,
        },
      });
    }

    const { isLate, lateMinutes, status } = calcLateness(pTime);

    let newAttendance;
    try {
      newAttendance = await prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: todayStart,
          },
        },
        create: {
          employeeId: employee.id,
          date: todayStart,
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
        newAttendance = await prisma.attendance.findFirst({
          where: { employeeId: employee.id, date: { gte: todayStart, lte: todayEnd } },
          orderBy: { checkInTime: "asc" },
        });
      } else {
        throw err;
      }
    }

    if (newAttendance) {
      await recordPunch(newAttendance.id, "CHECK_IN", punchDate);
      console.log(`[Biometric Punch] 15h exceeded: New CHECK-IN recorded for ${employee.firstName} ${employee.lastName} (${bioIdStr})`);
      return { success: true, type: "CHECK_IN", employee, attendance: newAttendance };
    }
  }

  // Punches received within 2 minutes of Check-In are treated as duplicate scans
  if (diffMinutesFromIn < 2) {
    await recordPunch(attendance.id, "CHECK_IN", punchDate);
    return { success: true, type: "DUPLICATE_CHECK_IN_STORED", employee, attendance };
  }

  // 3️⃣ Valid subsequent punch (> 2 minutes after Check-In):
  const currentOutMoment = attendance.checkOutTime ? moment(attendance.checkOutTime) : null;
  const isLatestOut = !currentOutMoment || pTime.isAfter(currentOutMoment);

  await recordPunch(attendance.id, "CHECK_OUT", punchDate);

  if (isLatestOut) {
    // Calculate complete shift time from First Punch (checkInTime) to this Last Punch
    const totalWorkedMinutes = Math.max(0, Math.round(pTime.diff(inTimeMoment, "minutes")));

    // Calculate Overtime based on scheduled shift duration
    let scheduledDurationMinutes = 540; // Default 9 hours
    if (schedule.startTime && schedule.endTime) {
      const [sh, sm] = schedule.startTime.split(":").map(Number);
      const [eh, em] = schedule.endTime.split(":").map(Number);
      const sMins = (sh || 9) * 60 + (sm || 0);
      const eMins = (eh || 18) * 60 + (em || 0);
      if (eMins > sMins) {
        scheduledDurationMinutes = eMins - sMins;
      }
    }

    let overtimeMinutes = 0;
    if (totalWorkedMinutes > scheduledDurationMinutes) {
      overtimeMinutes = totalWorkedMinutes - scheduledDurationMinutes;
    }

    attendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOutTime: punchDate,
        checkOutMethod: punchMethod,
        checkOutDevice: deviceTag,
        totalWorkedMinutes,
        overtimeMinutes,
        autoClockedOut: false,
      },
    });

    console.log(`[Biometric Punch] CHECK-OUT updated for ${employee.firstName} ${employee.lastName} (${bioIdStr}): ${totalWorkedMinutes} mins worked, ${overtimeMinutes} mins OT`);
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
      await processBiometricPunch({
        biometricId: eventData.biometricId,
        punchTime: eventData.punchTime,
        brand: "HIKVISION",
        deviceName: "Hikvision Terminal",
        method: eventData.method,
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
    const { name, brand, ipAddress, port, username, password, companyId } = req.body;

    const device = await prisma.biometricDevice.create({
      data: {
        name,
        brand,
        ipAddress,
        port: port ? parseInt(port) : 4370,
        username,
        password,
        companyId: companyId ? parseInt(companyId) : null,
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
    const { name, brand, ipAddress, port, username, password, status, companyId } = req.body;

    const updateData = {
      name,
      brand,
      ipAddress: ipAddress ? ipAddress.trim() : undefined,
      port: port ? parseInt(port) : (brand === "HIKVISION" ? 8000 : 4370),
      username,
      status,
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
 * Manual Sync Logs for ZKTeco Device
 */
exports.syncDeviceLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const device = await prisma.biometricDevice.findUnique({
      where: { id: parseInt(id) },
    });

    if (!device) return res.status(404).json({ success: false, message: "Device not found" });

    if (device.brand === "ZKTECO") {
      const logs = await fetchZkTecoLogs(device.ipAddress, device.port);
      let count = 0;

      for (const log of logs) {
        const res = await processBiometricPunch({
          biometricId: log.deviceUserId || log.userId,
          punchTime: log.recordTime || log.timestamp,
          brand: "ZKTECO",
          deviceName: device.name,
          method: "FINGERPRINT",
        });
        if (res.success) count++;
      }

      await prisma.biometricDevice.update({
        where: { id: device.id },
        data: { lastSyncedAt: new Date(), status: "ONLINE" },
      });

      return res.json({ success: true, message: `Synced ${count} attendance logs successfully!` });
    } else if (device.brand === "HIKVISION") {
      const { syncHikvisionDeviceLogs } = require("./hikvision.service");
      const result = await syncHikvisionDeviceLogs(device, processBiometricPunch);

      await prisma.biometricDevice.update({
        where: { id: device.id },
        data: { lastSyncedAt: new Date(), status: "ONLINE" },
      });

      return res.json({
        success: true,
        message: `Synced ${result.count || 0} Hikvision attendance records successfully!`,
        data: result,
      });
    } else {
      return res.json({ success: false, message: `Unsupported device brand: ${device.brand}` });
    }
  } catch (error) {
    console.error("Error in syncDeviceLogs:", error);
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

module.exports = {
  processBiometricPunch,
  handleHikvisionEvent: exports.handleHikvisionEvent,
  getDevices: exports.getDevices,
  addDevice: exports.addDevice,
  updateDevice: exports.updateDevice,
  deleteDevice: exports.deleteDevice,
  testDeviceConnection: exports.testDeviceConnection,
  syncDeviceLogs: exports.syncDeviceLogs,
  pushUsersToDevices: exports.pushUsersToDevices,
};

