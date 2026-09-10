const prisma = require("../../config/prisma");

// GET ALL ROLES
exports.getRoles = async (req, res) => {
  try {
    const orgId = req.user.orgId;

    const roles = await prisma.appRole.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            employees: {
              where: { deletedAt: null },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({ success: true, data: roles });
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({ success: false, message: "Error fetching roles" });
  }
};

// GET SINGLE ROLE
exports.getRoleById = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { id } = req.params;

    const role = await prisma.appRole.findFirst({
      where: {
        id: parseInt(id),
        organizationId: orgId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            employees: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    res.json({ success: true, data: role });
  } catch (error) {
    console.error("Error fetching role:", error);
    res.status(500).json({ success: false, message: "Error fetching role" });
  }
};

// CREATE ROLE
exports.createRole = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { name, description, privileges } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Role name is required" });
    }

    const existing = await prisma.appRole.findFirst({
      where: {
        organizationId: orgId,
        name: name.trim(),
        deletedAt: null,
      },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: "A role with this name already exists" });
    }

    const parsedPrivileges = typeof privileges === "string" ? JSON.parse(privileges) : (privileges || []);

    const role = await prisma.appRole.create({
      data: {
        name: name.trim(),
        description: description ? description.trim() : null,
        privileges: parsedPrivileges,
        organizationId: orgId,
      },
      include: {
        _count: {
          select: {
            employees: true,
          },
        },
      },
    });

    res.status(201).json({ success: true, message: "Role created successfully", data: role });
  } catch (error) {
    console.error("Error creating role:", error);
    res.status(500).json({ success: false, message: "Error creating role" });
  }
};

// UPDATE ROLE
exports.updateRole = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { id } = req.params;
    const { name, description, privileges } = req.body;

    const existing = await prisma.appRole.findFirst({
      where: {
        id: parseInt(id),
        organizationId: orgId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    if (name && name.trim() !== existing.name) {
      const duplicate = await prisma.appRole.findFirst({
        where: {
          organizationId: orgId,
          name: name.trim(),
          deletedAt: null,
          NOT: { id: parseInt(id) },
        },
      });
      if (duplicate) {
        return res.status(400).json({ success: false, message: "A role with this name already exists" });
      }
    }

    const parsedPrivileges = privileges !== undefined 
      ? (typeof privileges === "string" ? JSON.parse(privileges) : privileges) 
      : undefined;

    const updatedRole = await prisma.$transaction(async (tx) => {
      const role = await tx.appRole.update({
        where: { id: parseInt(id) },
        data: {
          ...(name && { name: name.trim() }),
          ...(description !== undefined && { description: description ? description.trim() : null }),
          ...(parsedPrivileges !== undefined && { privileges: parsedPrivileges }),
        },
        include: {
          _count: {
            select: {
              employees: true,
            },
          },
        },
      });

      // If privileges were updated, sync privileges to all employees assigned to this role
      if (parsedPrivileges && Array.isArray(parsedPrivileges)) {
        const assignedEmployees = await tx.employee.findMany({
          where: { roleId: parseInt(id), deletedAt: null },
          select: { id: true },
        });

        for (const emp of assignedEmployees) {
          await tx.employeePrivilege.deleteMany({
            where: { employeeId: emp.id },
          });

          if (parsedPrivileges.length > 0) {
            await tx.employeePrivilege.createMany({
              data: parsedPrivileges.map((p) => {
                const mod = typeof p === "string" ? p : p.module;
                const canRead = typeof p === "string" ? true : (p.canRead ?? true);
                const canCreate = typeof p === "string" ? false : (p.canCreate || false);
                const canUpdate = typeof p === "string" ? false : (p.canUpdate || false);
                const canDelete = typeof p === "string" ? false : (p.canDelete || false);
                const ownTeamOnly = typeof p === "string" ? false : (p.ownTeamOnly || false);
                return {
                  employeeId: emp.id,
                  module: mod.toUpperCase(),
                  canRead,
                  canCreate,
                  canUpdate,
                  canDelete,
                  ownTeamOnly,
                };
              }),
            });
          }
        }
      }

      return role;
    });

    res.json({ success: true, message: "Role updated successfully", data: updatedRole });
  } catch (error) {
    console.error("Error updating role:", error);
    res.status(500).json({ success: false, message: "Error updating role" });
  }
};

// DELETE ROLE
exports.deleteRole = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { id } = req.params;

    const existing = await prisma.appRole.findFirst({
      where: {
        id: parseInt(id),
        organizationId: orgId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    await prisma.$transaction(async (tx) => {
      // Unlink employees from this role
      await tx.employee.updateMany({
        where: { roleId: parseInt(id) },
        data: { roleId: null },
      });

      // Soft delete role
      await tx.appRole.update({
        where: { id: parseInt(id) },
        data: { deletedAt: new Date() },
      });
    });

    res.json({ success: true, message: "Role deleted successfully" });
  } catch (error) {
    console.error("Error deleting role:", error);
    res.status(500).json({ success: false, message: "Error deleting role" });
  }
};