const prisma = require("../../config/prisma");
const moment = require("moment");

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

/**
 * Calculate accurate Hourly Rate for an employee:
 * - If employee has explicit overtimeRate configured (> 0), use that.
 * - If payoutType === 'hourly': baseRate
 * - If payoutType === 'daily': baseRate / shiftHours (default 9 hours)
 * - If payoutType === 'monthly' (default):
 *     dailyRate = baseRate / (workingDaysPerMonth || 26)
 *     hourlyRate = dailyRate / shiftHours (office shift: 9 hours)
 */
function calculateHourlyRate(employeePayroll, schedule = null) {
  if (!employeePayroll || !employeePayroll.rate) return 0;

  // 1. If explicit fixed hourly rate in PKR is configured (> 10, e.g. 500/hr, not a multiplier like 1.5)
  if (employeePayroll.overtimeRate && Number(employeePayroll.overtimeRate) > 10) {
    return Number(employeePayroll.overtimeRate);
  }

  const baseRate = Number(employeePayroll.rate) || 0;
  const payoutType = String(employeePayroll.payoutType || "monthly").toLowerCase();

  // 2. Standard office shift hours: 9 hours
  const shiftHours = 9;

  if (payoutType === "hourly") {
    return baseRate;
  }

  if (payoutType === "daily") {
    return baseRate / shiftHours;
  }

  // Monthly: Standard 26 working days
  const workingDaysPerMonth = 26;
  const dailyRate = baseRate / workingDaysPerMonth;
  const hourlyRate = dailyRate / shiftHours;
  return hourlyRate;
}

exports.calculateHourlyRate = calculateHourlyRate;

exports.createOvertime = async (req, res) => {
  try {
    const role = req.user.role;
    const { employeeId, date, hours, rate, reason } = req.body;
    const targetEmployeeId = role === "USER" ? req.user.id : Number(employeeId);

    const employee = await prisma.employee.findUnique({
      where: { id: Number(targetEmployeeId) },
      include: {
        payroll: true,
        Schedule: { where: { deletedAt: null } }
      },
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    if (isOffDay(employee.Schedule, date)) {
      const formattedDate = moment(date).format("D MMM YYYY");
      return res.status(400).json({
        success: false,
        message: `Overtime cannot be added: ${formattedDate} is an off day for the user`
      });
    }

    // 🔍 Punch vs Request Verification
    const startOfDay = moment(date).startOf("day").toDate();
    const endOfDay = moment(date).endOf("day").toDate();
    const attendance = await prisma.attendance.findFirst({
      where: {
        employeeId: Number(targetEmployeeId),
        date: { gte: startOfDay, lte: endOfDay },
        deletedAt: null,
      },
    });

    if (role === "USER") {
      if (!attendance || !attendance.checkOutTime) {
        return res.status(400).json({
          success: false,
          message: "Cannot request overtime: No verified check-out punch found on this date."
        });
      }

      const loggedOtMinutes = Number(attendance.overtimeMinutes) || 0;
      if (loggedOtMinutes < 30) {
        return res.status(400).json({
          success: false,
          message: "Cannot request overtime: Your check-out punch does not meet the minimum 30-minute threshold."
        });
      }

      const loggedOtHours = loggedOtMinutes / 60;
      if (Number(hours) > loggedOtHours + 0.1) {
        return res.status(400).json({
          success: false,
          message: `Requested overtime (${hours} hrs) exceeds your actual logged extra punch time (${loggedOtHours.toFixed(2)} hrs).`
        });
      }
    }

    const hourlyRate = calculateHourlyRate(employee.payroll, employee.Schedule);
    let multiplier = Number(rate);
    if (!multiplier || isNaN(multiplier) || multiplier <= 0) {
      if (employee.payroll?.overtimeRate && Number(employee.payroll.overtimeRate) <= 10 && Number(employee.payroll.overtimeRate) > 0) {
        multiplier = Number(employee.payroll.overtimeRate);
      } else {
        multiplier = 1.5;
      }
    }
    const amount = Number((Number(hours) * hourlyRate * multiplier).toFixed(2));
    const targetStatus = role === "USER" ? "PENDING" : "APPROVED";

    const overtime = await prisma.overtime.create({
      data: {
        date: new Date(date),
        hours: Number(hours),
        rate: multiplier,
        amount,
        reason,
        status: targetStatus,

        employee: {
          connect: { id: Number(targetEmployeeId) },
        },

        organization: {
          connect: { id: req.user.orgId || req.user.organizationId },
        },

        createdBy: {
          connect: { id: req.user.id },
        },
      },
      include: {
        employee: true,
        createdBy: true,
        reviewedBy: true,
      },
    });

    res.json({ success: true, overtime });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating overtime" });
  }
};

exports.getOvertimes = async (req, res) => {
  try {
    const orgId = req.user.orgId || req.user.organizationId;
    const role = req.user.role;
    let where = {};
    if (orgId) {
      where.organizationId = orgId;
    }

    if (role === "USER") {
      // Specific employee strictly sees only their own overtime requests
      where.employeeId = req.user.id;
    } else if (role === "SUPERVISOR") {
      const team = await prisma.employee.findMany({
        where: { supervisorId: req.user.id, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      const teamIds = [req.user.id, ...team.map((t) => t.id)];
      where.employeeId = { in: teamIds };
    } else if (role === "ADMIN") {
      if (req.query.employeeId) {
        where.employeeId = Number(req.query.employeeId);
      }
    }

    if (req.query.status && req.query.status.toLowerCase() !== "all") {
      where.status = req.query.status.toUpperCase();
    }

    const overtimes = await prisma.overtime.findMany({
      where: {
        ...where,
        employee: {
          deletedAt: null,
          ...(req.query.companyId && req.query.companyId.toLowerCase() !== "all"
            ? { companyId: Number(req.query.companyId) }
            : {}),
        },
      },
      include: {
        employee: {
          include: {
            payroll: true,
            Schedule: { where: { deletedAt: null } },
          },
        },
        createdBy: true,
        reviewedBy: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ overtimes });
  } catch (error) {
    console.error("Error fetching overtime:", error);
    res.status(500).json({ message: "Error fetching overtime" });
  }
};

exports.updateOvertime = async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeId, date, hours, rate, reason, status } = req.body;

    const existing = await prisma.overtime.findUnique({
      where: { id: Number(id) },
    });

    if (!existing) {
      return res.status(404).json({ message: "Overtime record not found" });
    }

    // Role check:
    // USER can only edit their own overtime request while it is PENDING
    if (req.user.role === "USER") {
      if (existing.employeeId !== req.user.id || existing.status !== "PENDING") {
        return res.status(403).json({ message: "You can only edit your own pending overtime requests" });
      }
    } else if (req.user.role === "SUPERVISOR") {
      const team = await prisma.employee.findMany({
        where: { supervisorId: req.user.id, organizationId: req.user.organizationId, deletedAt: null },
        select: { id: true },
      });
      const allowedIds = [req.user.id, ...team.map((t) => t.id)];
      if (!allowedIds.includes(existing.employeeId)) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const targetEmployeeId = (req.user.role === "ADMIN" && employeeId) ? Number(employeeId) : existing.employeeId;
    const employee = await prisma.employee.findUnique({
      where: { id: targetEmployeeId },
      include: {
        payroll: true,
        Schedule: { where: { deletedAt: null } }
      },
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const targetDate = date ? date : existing.date;
    if (isOffDay(employee.Schedule, targetDate)) {
      const formattedDate = moment(targetDate).format("D MMM YYYY");
      return res.status(400).json({
        success: false,
        message: `Overtime cannot be updated: ${formattedDate} is an off day for the user`
      });
    }

    if (req.user.role === "USER") {
      const startOfDay = moment(targetDate).startOf("day").toDate();
      const endOfDay = moment(targetDate).endOf("day").toDate();
      const attendance = await prisma.attendance.findFirst({
        where: {
          employeeId: Number(targetEmployeeId),
          date: { gte: startOfDay, lte: endOfDay },
          deletedAt: null,
        },
      });

      if (!attendance || !attendance.checkOutTime) {
        return res.status(400).json({
          success: false,
          message: "Cannot update overtime: No verified check-out punch found on this date."
        });
      }

      const loggedOtMinutes = Number(attendance.overtimeMinutes) || 0;
      if (loggedOtMinutes < 30) {
        return res.status(400).json({
          success: false,
          message: "Cannot update overtime: Your check-out punch did not meet the minimum 30-minute threshold."
        });
      }

      const loggedOtHours = loggedOtMinutes / 60;
      const hoursToVerify = hours !== undefined ? Number(hours) : existing.hours;
      if (hoursToVerify > loggedOtHours + 0.1) {
        return res.status(400).json({
          success: false,
          message: `Requested overtime (${hoursToVerify} hrs) exceeds your actual logged extra punch time (${loggedOtHours.toFixed(2)} hrs).`
        });
      }
    }

    const newHours = hours !== undefined ? Number(hours) : existing.hours;
    const newRate = (req.user.role === "ADMIN" && rate !== undefined) ? Number(rate) : existing.rate;
    const hourlyRate = calculateHourlyRate(employee.payroll, employee.Schedule);
    const multiplier = Number(newRate) || 1.5;
    const amount = Number((newHours * hourlyRate * multiplier).toFixed(2));

    const dataToUpdate = {
      employeeId: targetEmployeeId,
      date: date ? new Date(date) : existing.date,
      hours: newHours,
      rate: newRate,
      amount,
      reason: reason !== undefined ? reason : existing.reason,
    };

    if (status && req.user.role === "ADMIN") {
      dataToUpdate.status = status;
      dataToUpdate.reviewedById = req.user.id;
      dataToUpdate.reviewedAt = new Date();
    }

    const overtime = await prisma.overtime.update({
      where: { id: Number(id) },
      data: dataToUpdate,
      include: {
        employee: true,
        createdBy: true,
        reviewedBy: true,
      },
    });

    res.json({ success: true, overtime });
  } catch (error) {
    console.error("Error updating overtime:", error);
    res.status(500).json({ message: "Error updating overtime" });
  }
};

exports.updateOvertimeStatus = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only admin can approve/reject" });
    }

    const { id } = req.params;
    const { status, employeeId, date, hours, rate, reason } = req.body;

    const existing = await prisma.overtime.findUnique({
      where: { id: Number(id) },
    });

    if (!existing) {
      return res.status(404).json({ message: "Overtime record not found" });
    }

    const targetEmployeeId = employeeId ? Number(employeeId) : existing.employeeId;
    const employee = await prisma.employee.findUnique({
      where: { id: targetEmployeeId },
      include: {
        payroll: true,
        Schedule: { where: { deletedAt: null } }
      },
    });

    const targetDate = date ? date : existing.date;
    if (employee && isOffDay(employee.Schedule, targetDate)) {
      const formattedDate = moment(targetDate).format("D MMM YYYY");
      return res.status(400).json({
        success: false,
        message: `Overtime cannot be approved: ${formattedDate} is an off day for the user`
      });
    }

    const newHours = hours !== undefined ? Number(hours) : existing.hours;
    const newRate = rate !== undefined ? Number(rate) : existing.rate;
    const hourlyRate = calculateHourlyRate(employee?.payroll, employee?.Schedule);
    const multiplier = Number(newRate) || 1.5;
    const amount = Number((newHours * hourlyRate * multiplier).toFixed(2));

    const dataToUpdate = {
      employeeId: targetEmployeeId,
      date: date ? new Date(date) : existing.date,
      hours: newHours,
      rate: newRate,
      amount,
      reason: reason !== undefined ? reason : existing.reason,
    };

    if (status) {
      dataToUpdate.status = status;
      dataToUpdate.reviewedById = req.user.id;
      dataToUpdate.reviewedAt = new Date();
    }

    const overtime = await prisma.overtime.update({
      where: { id: Number(id) },
      data: dataToUpdate,
      include: {
        employee: true,
        createdBy: true,
        reviewedBy: true,
      },
    });

    res.json({ success: true, overtime });
  } catch (error) {
    console.error("Error updating overtime status:", error);
    res.status(500).json({ message: "Error updating overtime status" });
  }
};

exports.deleteOvertime = async (req, res) => {
  try {
    const existing = await prisma.overtime.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!existing) {
      return res.status(404).json({ message: "Overtime record not found" });
    }

    if (req.user.role === "USER") {
      if (existing.employeeId !== req.user.id || existing.status !== "PENDING") {
        return res.status(403).json({ message: "You can only cancel your own pending overtime requests" });
      }
    } else if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }

    await prisma.overtime.delete({
      where: { id: Number(req.params.id) },
    });

    res.json({ success: true, message: "Overtime deleted successfully" });
  } catch (error) {
    console.error("Error deleting overtime:", error);
    res.status(500).json({ message: "Error deleting overtime" });
  }
};

exports.verifyPunch = async (req, res) => {
  try {
    const { employeeId, date } = req.query;
    if (!employeeId || !date) {
      return res.status(400).json({ success: false, message: "employeeId and date are required" });
    }

    const targetEmpId = req.user.role === "USER" ? req.user.id : Number(employeeId);
    const startOfDay = moment(date).startOf("day").toDate();
    const endOfDay = moment(date).endOf("day").toDate();

    const employee = await prisma.employee.findUnique({
      where: { id: targetEmpId },
      include: {
        company: true,
        payroll: true,
        Schedule: { where: { deletedAt: null } }
      }
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const timezone = employee.company?.timezone || "Asia/Karachi";
    const attendance = await prisma.attendance.findFirst({
      where: {
        employeeId: targetEmpId,
        date: { gte: startOfDay, lte: endOfDay },
        deletedAt: null,
      }
    });

    if (!attendance) {
      return res.json({
        success: true,
        hasAttendance: false,
        status: "NO_RECORD",
        checkInTime: null,
        checkOutTime: null,
        overtimeMinutes: 0,
        overtimeHours: 0,
        isVerified: false,
        canRequest: req.user.role === "ADMIN",
        message: "No attendance punch recorded on this date."
      });
    }

    const checkInStr = attendance.checkInTime ? moment(attendance.checkInTime).tz(timezone).format("hh:mm A") : null;
    const checkOutStr = attendance.checkOutTime ? moment(attendance.checkOutTime).tz(timezone).format("hh:mm A") : null;
    const otMinutes = Number(attendance.overtimeMinutes) || 0;
    const otHours = Number((otMinutes / 60).toFixed(2));
    const isVerified = Boolean(attendance.checkOutTime && otMinutes >= 30);

    return res.json({
      success: true,
      hasAttendance: true,
      status: attendance.status,
      checkInTime: checkInStr,
      checkOutTime: checkOutStr,
      totalWorkedMinutes: attendance.totalWorkedMinutes || 0,
      overtimeMinutes: otMinutes,
      overtimeHours: otHours,
      isVerified,
      canRequest: req.user.role === "ADMIN" || isVerified,
      message: isVerified
        ? `Punch verified: Checked out at ${checkOutStr} with ${otHours}h (${otMinutes}m) extra.`
        : attendance.checkOutTime
          ? `Check-out at ${checkOutStr} does not meet the 30-min threshold (logged: ${otMinutes}m).`
          : "Checked in, but no check-out punch recorded yet."
    });
  } catch (error) {
    console.error("Error verifying punch:", error);
    res.status(500).json({ success: false, message: "Error verifying punch" });
  }
};

  