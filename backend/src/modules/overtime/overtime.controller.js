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
      return String(d.day || d.name || d.short || "").trim().toLowerCase();
    }
    return String(d).trim().toLowerCase();
  });

  const isWorkingDay = daysArr.includes(shortDay) || daysArr.includes(fullDay);
  return !isWorkingDay;
}

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

    const baseRate = employee.payroll?.rate || 0;
    const amount = Number(hours) * baseRate * Number(rate);
    const targetStatus = role === "USER" ? "PENDING" : "APPROVED";

    const overtime = await prisma.overtime.create({
      data: {
        date: new Date(date),
        hours: Number(hours),
        rate: Number(rate),
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
    let where = {};
    if (orgId) {
      where.organizationId = orgId;
    }

    if (req.user.role === "USER") {
      where.employeeId = req.user.id;
    }

    const overtimes = await prisma.overtime.findMany({
      where,
      include: {
        employee: true,
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
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only admin can update overtime" });
    }

    const { id } = req.params;
    const { employeeId, date, hours, rate, reason, status } = req.body;

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

    const newHours = hours !== undefined ? Number(hours) : existing.hours;
    const newRate = rate !== undefined ? Number(rate) : existing.rate;
    const baseRate = employee.payroll?.rate || 0;
    const amount = newHours * baseRate * newRate;

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
    const baseRate = employee?.payroll?.rate || 0;
    const amount = newHours * baseRate * newRate;

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
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only admin can delete" });
    }

    await prisma.overtime.delete({
      where: { id: Number(req.params.id) },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting overtime:", error);
    res.status(500).json({ message: "Error deleting overtime" });
  }
};
  