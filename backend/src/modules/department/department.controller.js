const prisma = require("../../config/prisma");

// GET
exports.getDepartments = async (req, res) => {
  try {
    const orgId = req.user.orgId;

    const departments = await prisma.department.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
      include: {
        company: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Active headcount per department (not deleted, not admin)
    const counts = await prisma.employee.groupBy({
      by: ["departmentId"],
      where: {
        organizationId: orgId,
        deletedAt: null,
        NOT: { role: "ADMIN" },
        departmentId: { not: null },
      },
      _count: { _all: true },
    });
    const countMap = new Map(counts.map((c) => [c.departmentId, c._count._all]));
    const data = departments.map((d) => ({ ...d, activeEmployees: countMap.get(d.id) || 0 }));

    res.json({ success: true, data });

  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching departments" });
  }
};

// CREATE
exports.createDepartment = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { title, companyId, status } = req.body;

    const department = await prisma.department.create({
      data: {
        title,
        status,
        organizationId: orgId,
        companyId: parseInt(companyId),
      },
    });

    res.status(201).json({ success: true, data: department });

  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating department" });
  }
};

// UPDATE
exports.updateDepartment = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const id = parseInt(req.params.id);
    const { title, companyId, status } = req.body;

    const existing = await prisma.department.findFirst({
      where: {
        id,
        organizationId: orgId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }

    const updated = await prisma.department.update({
      where: { id },
      data: {
        title,
        status,
        companyId: parseInt(companyId),
      },
    });

    res.json({ success: true, data: updated });

  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating department" });
  }
};

// DELETE (Soft Delete)
exports.deleteDepartment = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const id = parseInt(req.params.id);

    const existing = await prisma.department.findFirst({
      where: {
        id,
        organizationId: orgId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }

    await prisma.department.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.json({ success: true, message: "Department deleted" });

  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting department" });
  }
};

// GET /departments/:id/employees – active employees of one department
exports.getDepartmentEmployees = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const departmentId = Number(req.params.id);
    const department = await prisma.department.findFirst({
      where: { id: departmentId, organizationId: orgId, deletedAt: null },
      select: { id: true, title: true, company: { select: { id: true, name: true } } },
    });
    if (!department) return res.status(404).json({ success: false, message: "Department not found" });

    const employees = await prisma.employee.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        NOT: { role: "ADMIN" },
        departmentId,
      },
      select: {
        id: true,
        employeeId: true,
        biometricId: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        canLogin: true,
        profileImage: true,
        entityId: true,
        companyId: true,
        departmentId: true,
        department: { select: { id: true, title: true } },
        company: { select: { id: true, name: true } },
        entity: { select: { id: true, name: true, code: true } },
        jobInfo: { select: { designation: true, hiringDate: true, employmentStatus: true } },
      },
      orderBy: { firstName: "asc" },
    });

    res.json({ success: true, data: { department, employees } });
  } catch (error) {
    console.error("Error fetching department employees:", error);
    res.status(500).json({ success: false, message: "Error fetching department employees" });
  }
};

// POST /departments/move-employees – bulk move employees between departments
exports.moveEmployees = async (req, res) => {
  try {
    if (!["ADMIN", "SUPERVISOR"].includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }
    const orgId = req.user.orgId;
    const toDepartmentId = Number(req.body?.toDepartmentId);
    const ids = [...new Set((req.body?.employeeIds || []).map(Number).filter(Boolean))];
    if (!toDepartmentId || !ids.length) {
      return res.status(400).json({ success: false, message: "Select employees and a target department" });
    }

    const target = await prisma.department.findFirst({
      where: { id: toDepartmentId, organizationId: orgId, deletedAt: null },
    });
    if (!target) return res.status(404).json({ success: false, message: "Target department not found" });

    const employees = await prisma.employee.findMany({
      where: { id: { in: ids }, organizationId: orgId, deletedAt: null },
      select: { id: true, departmentId: true, companyId: true },
    });

    let moved = 0;
    let unchanged = 0;
    for (const emp of employees) {
      if (emp.departmentId === toDepartmentId) {
        unchanged++;
        continue;
      }
      const updateData = { departmentId: toDepartmentId };
      if (target.companyId) {
        updateData.companyId = target.companyId;
      }
      await prisma.employee.update({
        where: { id: emp.id },
        data: updateData,
      });
      moved++;
    }

    res.json({
      success: true,
      message: `${moved} employee${moved === 1 ? "" : "s"} moved to ${target.title}${unchanged ? ` (${unchanged} already there)` : ""}`,
      data: { moved, unchanged },
    });
  } catch (error) {
    console.error("Error moving department employees:", error);
    res.status(500).json({ success: false, message: "Error moving employees" });
  }
};
