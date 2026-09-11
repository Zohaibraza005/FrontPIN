const prisma = require("../../config/prisma");
const moment = require("moment-timezone");
const { parseHikvisionEvent, startHikvisionStream } = require("./hikvision.service");
const { fetchZkTecoLogs, testZkTecoConnection } = require("./zkteco.service");


/**
 * Core Punch Handler: Maps biometricId -> Employee and records Attendance & AttendancePunch
 */
async function processBiometricPunch({ biometricId, punchTime, brand, deviceName, method }) {
  if (!biometricId) {
    console.warn(`[Biometric Punch] Skipped - No biometricId provided`);
    return { success: false, reason: "No biometricId provided" };
  }

  const bioIdStr = String(biometricId).trim();

  // Find Employee by biometricId OR employeeId
  const employee = await prisma.employee.findFirst({
    where: {
      OR: [
        { biometricId: bioIdStr },
        { employeeId: bioIdStr },
      ],
      deletedAt: null,
    },
    include: { company: true },
  });

  if (!employee) {
    console.warn(`[Biometric Punch] No Employee matched with biometricId/employeeId: ${bioIdStr}`);
    return { success: false, reason: `Employee not found for Biometric ID: ${bioIdStr}` };
  }

  const timezone = employee.company?.timezone || "UTC";
  const pTime = punchTime ? moment(punchTime).tz(timezone) : moment().tz(timezone);
  
  const todayStart = pTime.clone().startOf("day").utc().toDate();
  const todayEnd = pTime.clone().endOf("day").utc().toDate();

  // Find existing attendance for today
  let attendance = await prisma.attendance.findFirst({
    where: {
      employeeId: employee.id,
      date: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  });

  const punchDate = pTime.toDate();
  const deviceTag = deviceName ? `${brand} (${deviceName})` : brand;
  const punchMethod = method || brand;

  if (!attendance) {
    // 1️⃣ First Punch of the Day -> CHECK-IN
    attendance = await prisma.attendance.create({
      data: {
        employeeId: employee.id,
        date: todayStart,
        checkInTime: punchDate,
        checkInMethod: punchMethod,
        checkInDevice: deviceTag,
        status: "PRESENT",
      },
    });

    await prisma.attendancePunch.create({
      data: {
        attendanceId: attendance.id,
        employeeId: employee.id,
        type: "CHECK_IN",
        punchTime: punchDate,
        device: deviceTag,
        method: punchMethod,
      },
    });

    console.log(`[Biometric Punch] CHECK-IN recorded for ${employee.firstName} ${employee.lastName} (${bioIdStr})`);
    return { success: true, type: "CHECK_IN", employee, attendance };
  } else {
    // 2️⃣ Subsequent Punch -> CHECK-OUT (Update CheckOutTime & totalWorkedMinutes)
    const checkInTime = moment(attendance.checkInTime);
    const workedMinutes = Math.max(0, pTime.diff(checkInTime, "minutes"));

    await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOutTime: punchDate,
        checkOutMethod: punchMethod,
        checkOutDevice: deviceTag,
        totalWorkedMinutes: workedMinutes,
      },
    });

    await prisma.attendancePunch.create({
      data: {
        attendanceId: attendance.id,
        employeeId: employee.id,
        type: "CHECK_OUT",
        punchTime: punchDate,
        device: deviceTag,
        method: punchMethod,
      },
    });

    console.log(`[Biometric Punch] CHECK-OUT recorded for ${employee.firstName} ${employee.lastName} (${bioIdStr})`);
    return { success: true, type: "CHECK_OUT", employee, attendance };
  }
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
    } else {
      return res.json({ success: true, message: "Hikvision operates via real-time Webhook listener." });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Push all active Employees (or a single employee) to active Hikvision devices
 */
exports.pushUsersToDevices = async (req, res) => {
  try {
    const { employeeId } = req.body;
    const { pushUserToHikvision } = require("./hikvision.service");

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

    return res.json({
      success: true,
      message: `Pushed ${employees.length} employee(s) to ${activeDevices.length} biometric device(s) successfully!`,
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

