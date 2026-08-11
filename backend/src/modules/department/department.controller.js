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

    res.json({ success: true, data: departments });

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
