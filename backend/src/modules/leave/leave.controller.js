const prisma = require("../../config/prisma");
const moment = require("moment");

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

  const dateStr = typeof date === "string" ? date.slice(0, 10) : moment(date).format("YYYY-MM-DD");
  const mDate = moment(dateStr, "YYYY-MM-DD");
  const shortDay = mDate.format("ddd").toLowerCase();
  const fullDay = mDate.format("dddd").toLowerCase();

  const daysArr = activeSchedule.days.map((d) => String(d).trim().toLowerCase());

  const isWorkingDay = daysArr.includes(shortDay) || daysArr.includes(fullDay);
  return !isWorkingDay;
}

function hasOffDayInRange(schedules, startDate, endDate) {
  let cursor = moment(startDate).startOf("day");
  const end = moment(endDate).startOf("day");

  while (cursor.isSameOrBefore(end)) {
    if (isOffDay(schedules, cursor.format("YYYY-MM-DD"))) {
      return true;
    }
    cursor.add(1, "day");
  }
  return false;
}

const toStartOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const toEndOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

/* ---------------------------------- */
/* GET Leave Types (org-level) */
/* ---------------------------------- */
exports.getLeaveTypes = async (req, res) => {
  try {
    const orgId = req.user.orgId || req.user.organizationId;
    const { all } = req.query;

    const where = { organizationId: orgId };
    if (all !== "true") {
      where.isActive = true;
    }

    const types = await prisma.leaveType.findMany({
      where,
      orderBy: { name: "asc" },
    });

    res.json({ types });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to load leave types" });
  }
};

/* ---------------------------------- */
/* POST Create Leave Type (org-level) */
/* ---------------------------------- */
exports.createLeaveType = async (req, res) => {
  try {
    const orgId = req.user.orgId || req.user.organizationId;
    const { name, code, isActive } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Leave type name is required" });
    }

    const trimmedName = name.trim();
    const rawCode = (code && code.trim()) ? code.trim().toUpperCase() : trimmedName.toUpperCase().replace(/[^A-Z0-9]/g, "_");
    const uniqueCode = `${rawCode}_ORG${orgId}`;

    const existing = await prisma.leaveType.findFirst({
      where: {
        organizationId: orgId,
        name: trimmedName,
      }
    });

    if (existing) {
      return res.status(400).json({ message: "A leave type with this name already exists" });
    }

    const leaveType = await prisma.leaveType.create({
      data: {
        name: trimmedName,
        code: uniqueCode,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        organizationId: orgId,
      },
    });

    res.status(201).json({ leaveType, message: "Leave type created successfully" });
  } catch (e) {
    console.error("Create leave type error:", e);
    if (e.code === "P2002") {
      return res.status(400).json({ message: "A leave type with this code or name already exists" });
    }
    res.status(500).json({ message: e.message || "Failed to create leave type" });
  }
};

/* ---------------------------------- */
/* PUT Update Leave Type */
/* ---------------------------------- */
exports.updateLeaveType = async (req, res) => {
  try {
    const orgId = req.user.orgId || req.user.organizationId;
    const id = Number(req.params.id);
    const { name, code, isActive } = req.body;

    const existingType = await prisma.leaveType.findFirst({
      where: { id, organizationId: orgId }
    });

    if (!existingType) {
      return res.status(404).json({ message: "Leave type not found" });
    }

    const data = {};
    if (name !== undefined && name.trim()) {
      const trimmedName = name.trim();
      const duplicate = await prisma.leaveType.findFirst({
        where: {
          organizationId: orgId,
          name: trimmedName,
          id: { not: id }
        }
      });
      if (duplicate) {
        return res.status(400).json({ message: "Another leave type with this name already exists" });
      }
      data.name = trimmedName;
    }

    if (code !== undefined && code.trim()) {
      data.code = `${code.trim().toUpperCase()}_ORG${orgId}`;
    }

    if (isActive !== undefined) {
      data.isActive = Boolean(isActive);
    }

    const updated = await prisma.leaveType.update({
      where: { id },
      data,
    });

    res.json({ leaveType: updated, message: "Leave type updated successfully" });
  } catch (e) {
    console.error("Update leave type error:", e);
    if (e.code === "P2002") {
      return res.status(400).json({ message: "A leave type with this code already exists" });
    }
    res.status(500).json({ message: e.message || "Failed to update leave type" });
  }
};

/* ---------------------------------- */
/* DELETE Leave Type */
/* ---------------------------------- */
exports.deleteLeaveType = async (req, res) => {
  try {
    const orgId = req.user.orgId || req.user.organizationId;
    const id = Number(req.params.id);

    const existingType = await prisma.leaveType.findFirst({
      where: { id, organizationId: orgId }
    });

    if (!existingType) {
      return res.status(404).json({ message: "Leave type not found" });
    }

    // Check if referenced in leave requests
    const usageCount = await prisma.leaveRequest.count({
      where: { leaveTypeId: id }
    });

    if (usageCount > 0) {
      // Deactivate instead of hard delete to preserve history
      const updated = await prisma.leaveType.update({
        where: { id },
        data: { isActive: false }
      });
      return res.json({ success: true, deactivated: true, leaveType: updated, message: "Leave type is referenced in leave requests, so it was deactivated instead of deleted." });
    }

    await prisma.leaveType.delete({
      where: { id }
    });

    res.json({ success: true, message: "Leave type deleted successfully" });
  } catch (e) {
    console.error("Delete leave type error:", e);
    res.status(500).json({ message: "Failed to delete leave type" });
  }
};

/* ---------------------------------- */
/* GET Leaves list
   ADMIN => all org
   SUPERVISOR => team only
   USER => own only
   filters: status, typeId, q
/* ---------------------------------- */
exports.getLeaves = async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const role = req.user.role;

    const { status, typeId, q } = req.query;

    let employeeIds = null;

    if (role === "USER") {
      employeeIds = [req.user.id];
    } else if (role === "SUPERVISOR") {
      const team = await prisma.employee.findMany({
        where: { supervisorId: req.user.id, organizationId: orgId },
        select: { id: true },
      });
      employeeIds = [req.user.id, ...team.map((t) => t.id)]; // include self
    }

    const where = {
      organizationId: orgId,
      ...(employeeIds ? { employeeId: { in: employeeIds } } : {}),
      ...(status ? { status } : {}),
      ...(typeId ? { leaveTypeId: Number(typeId) } : {}),
      ...(q
        ? {
            employee: {
              OR: [
                { firstName: { contains: q } },
                { lastName: { contains: q } },
                { email: { contains: q } },
              ],
            },
          }
        : {}),
    };

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
        leaveType: true,
        reviewedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ leaves });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to load leaves" });
  }
};

/* ---------------------------------- */
/* GET Employee Leave Summary (for modal)
   total, approved, rejected + optional approvedForDate
/* ---------------------------------- */
exports.getEmployeeLeaveSummary = async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const role = req.user.role;
    const employeeId = Number(req.params.employeeId);

    // supervisor guard: only team member or self
    if (role === "SUPERVISOR") {
      const isTeam = await prisma.employee.findFirst({
        where: {
          id: employeeId,
          organizationId: orgId,
          OR: [{ supervisorId: req.user.id }, { id: req.user.id }],
        },
        select: { id: true },
      });
      if (!isTeam) return res.status(403).json({ message: "Access denied" });
    }

    if (role === "USER" && employeeId !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const [total, approved, rejected] = await Promise.all([
      prisma.leaveRequest.count({ where: { organizationId: orgId, employeeId } }),
      prisma.leaveRequest.count({ where: { organizationId: orgId, employeeId, status: "APPROVED" } }),
      prisma.leaveRequest.count({ where: { organizationId: orgId, employeeId, status: "REJECTED" } }),
    ]);

    // optional: check approved leave for a specific day
    const { date } = req.query; // YYYY-MM-DD
    let approvedForDate = false;

    if (date) {
      const day = new Date(date);
      const found = await prisma.leaveRequest.findFirst({
        where: {
          organizationId: orgId,
          employeeId,
          status: "APPROVED",
          startDate: { lte: toEndOfDay(day) },
          endDate: { gte: toStartOfDay(day) },
        },
        select: { id: true },
      });
      approvedForDate = !!found;
    }

    res.json({
      summary: { total, approved, rejected, approvedForDate },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to load employee summary" });
  }
};

/* ---------------------------------- */
/* POST Create Leave Request
   USER => self
   ADMIN/SUPERVISOR => can create for employee (team/admin)
/* ---------------------------------- */
exports.createLeave = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const role = req.user.role;

    const { employeeId, leaveTypeId, startDate, endDate, reason, days } = req.body;

    const targetEmployeeId = role === "USER" ? req.user.id : Number(employeeId);

    // supervisor guard
    if (role === "SUPERVISOR") {
      const isTeam = await prisma.employee.findFirst({
        where: {
          id: targetEmployeeId,
          organizationId: orgId,
          OR: [{ supervisorId: req.user.id }, { id: req.user.id }],
        },
        select: { id: true },
      });
      if (!isTeam) return res.status(403).json({ message: "Access denied" });
    }

    // validate leave type belongs to org
    const type = await prisma.leaveType.findFirst({
      where: { id: Number(leaveTypeId), organizationId: orgId, isActive: true },
      select: { id: true },
    });
    if (!type) return res.status(400).json({ message: "Invalid leave type" });

    const s = toStartOfDay(new Date(startDate));
    const e = toEndOfDay(new Date(endDate));
    if (s > e) return res.status(400).json({ message: "Start date must be <= end date" });

    const targetEmp = await prisma.employee.findUnique({
      where: { id: targetEmployeeId },
      include: { Schedule: { where: { deletedAt: null } } }
    });

    if (targetEmp && hasOffDayInRange(targetEmp.Schedule, s, e)) {
      return res.status(400).json({
        message: "This day is off for user, leave cannot be created on an off day"
      });
    }

    // prevent overlap with approved/pending (optional but recommended)
    const overlap = await prisma.leaveRequest.findFirst({
      where: {
        organizationId: orgId,
        employeeId: targetEmployeeId,
        status: { in: ["PENDING", "APPROVED"] },
        startDate: { lte: e },
        endDate: { gte: s },
      },
      select: { id: true },
    });
    if (overlap) return res.status(409).json({ message: "Leave already exists for selected dates" });

    const leave = await prisma.leaveRequest.create({
      data: {
        organizationId: orgId,
        employeeId: targetEmployeeId,
        leaveTypeId: Number(leaveTypeId),
        startDate: s,
        endDate: e,
        days: days ? Number(days) : 1,
        reason: reason || null,
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
        leaveType: true,
      },
    });

    res.json({ leave });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to create leave request" });
  }
};

/* ---------------------------------- */
/* PATCH Approve/Reject (admin/supervisor only)
   On approve => payType required (PAID/UNPAID)
/* ---------------------------------- */
exports.updateLeaveStatus = async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const role = req.user.role;

    if (role !== "ADMIN" && role !== "SUPERVISOR") {
      return res.status(403).json({ message: "Access denied" });
    }

    const id = Number(req.params.id);
    const { status, payType } = req.body; // status: APPROVED/REJECTED

    const leave = await prisma.leaveRequest.findFirst({
      where: { id, organizationId: orgId },
      include: { employee: true },
    });
    if (!leave) return res.status(404).json({ message: "Leave not found" });

    // supervisor can only update team
    if (role === "SUPERVISOR") {
      const allowed = await prisma.employee.findFirst({
        where: {
          id: leave.employeeId,
          organizationId: orgId,
          OR: [{ supervisorId: req.user.id }, { id: req.user.id }],
        },
        select: { id: true },
      });
      if (!allowed) return res.status(403).json({ message: "Access denied" });
    }

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if (status === "APPROVED") {
      const targetEmp = await prisma.employee.findUnique({
        where: { id: leave.employeeId },
        include: { Schedule: { where: { deletedAt: null } } }
      });

      if (targetEmp && hasOffDayInRange(targetEmp.Schedule, leave.startDate, leave.endDate)) {
        return res.status(400).json({
          message: "This day is off for user, leave cannot be approved on an off day"
        });
      }
    }

    const data = {
      status,
      reviewedById: req.user.id,
      reviewedAt: new Date(),
      payType: status === "APPROVED" ? payType : null,
    };

    if (status === "APPROVED" && !["PAID", "UNPAID"].includes(payType)) {
      return res.status(400).json({ message: "payType is required for approval" });
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
        leaveType: true,
      },
    });

    res.json({ leave: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to update leave status" });
  }
};

exports.getEmployeeLeaveSummary = async (req, res) => {
    try {
      const { employeeId } = req.params;
  
      const total = await prisma.leaveRequest.count({
        where: { employeeId: Number(employeeId) }
      });
  
      const approved = await prisma.leaveRequest.count({
        where: { employeeId: Number(employeeId), status: "APPROVED" }
      });
  
      const rejected = await prisma.leaveRequest.count({
        where: { employeeId: Number(employeeId), status: "REJECTED" }
      });
  
      res.json({
        total,
        approved,
        rejected,
      });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching leave summary" });
    }
  };
  
  exports.getEligibleEmployees = async (req, res) => {
    try {
      const user = req.user;
  
      let employees = [];
  
      if (user.role === "ADMIN") {
        employees = await prisma.employee.findMany({
          where: { organizationId: user.organizationId  , deletedAt: null},
          select: { id: true, firstName: true, lastName: true }
        });
      }
  
      else if (user.role === "SUPERVISOR") {
        employees = await prisma.employee.findMany({
          where: {
            
            OR: [
              { supervisorId: user.id },
              { id: user.id }
            ]
          },
          select: { id: true, firstName: true, lastName: true }
        });
      }
  
      else {
        employees = await prisma.employee.findMany({
          where: { id: user.id ,deletedAt: null,},
          select: { id: true, firstName: true, lastName: true }
        });
      }
  
      res.json({ employees });
  
    } catch (error) {
      res.status(500).json({ message: "Error fetching employees" });
    }
  };

  exports.deleteLeave = async (req, res) => {
    try {
      const { id } = req.params;
  
      const leave = await prisma.leaveRequest.findUnique({
        where: { id: Number(id) },
      });
  
      if (!leave) {
        return res.status(404).json({ message: "Leave not found" });
      }
  
      // Optional security:
      // Only allow:
      // - Admin
      // - Supervisor
      // - OR employee who created it (if still PENDING)
  
      if (
        req.user.role === "USER" &&
        (leave.employeeId !== req.user.id || leave.status !== "PENDING")
      ) {
        return res.status(403).json({ message: "Not allowed" });
      }
  
      await prisma.leaveRequest.delete({
        where: { id: Number(id) },
      });
  
      res.json({ success: true, message: "Leave deleted successfully" });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error deleting leave" });
    }
  };

  exports.updateLeave = async (req, res) => {
    try {
      const orgId = req.user.orgId || req.user.organizationId;
      const { id } = req.params;
      const { leaveTypeId, startDate, endDate, reason, days, status } = req.body;

      const leave = await prisma.leaveRequest.findFirst({
        where: { id: Number(id), organizationId: orgId },
      });

      if (!leave) {
        return res.status(404).json({ message: "Leave request not found" });
      }

      const data = {};
      if (leaveTypeId) data.leaveTypeId = Number(leaveTypeId);
      if (startDate) data.startDate = toStartOfDay(new Date(startDate));
      if (endDate) data.endDate = toEndOfDay(new Date(endDate));
      if (reason !== undefined) data.reason = reason;
      if (days !== undefined) data.days = Number(days);
      if (status !== undefined) data.status = status;

      const newStart = data.startDate || leave.startDate;
      const newEnd = data.endDate || leave.endDate;

      if (newStart > newEnd) {
        return res.status(400).json({ message: "Start date must be <= end date" });
      }

      const targetEmp = await prisma.employee.findUnique({
        where: { id: leave.employeeId },
        include: { Schedule: { where: { deletedAt: null } } }
      });

      if (targetEmp && hasOffDayInRange(targetEmp.Schedule, newStart, newEnd)) {
        return res.status(400).json({
          message: "This day is off for user, leave cannot be created or updated on an off day"
        });
      }

      const updated = await prisma.leaveRequest.update({
        where: { id: Number(id) },
        data,
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
          leaveType: true,
        },
      });

      res.json({ leave: updated, message: "Leave updated successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error updating leave request" });
    }
  };
  
  