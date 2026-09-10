const prisma = require("../../config/prisma");

// GET all entities for organization
exports.getEntities = async (req, res) => {
  try {
    const orgId = req.user.orgId;

    const entities = await prisma.entity.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            employees: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: entities });
  } catch (error) {
    console.error("Error fetching entities:", error);
    res.status(500).json({ success: false, message: "Error fetching entities" });
  }
};

// GET single entity by id
exports.getEntityById = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const id = parseInt(req.params.id);

    const entity = await prisma.entity.findFirst({
      where: {
        id,
        organizationId: orgId,
        deletedAt: null,
      },
      include: {
        company: true,
        _count: {
          select: {
            employees: true,
          },
        },
      },
    });

    if (!entity) {
      return res.status(404).json({ success: false, message: "Entity not found" });
    }

    res.json({ success: true, data: entity });
  } catch (error) {
    console.error("Error fetching entity:", error);
    res.status(500).json({ success: false, message: "Error fetching entity" });
  }
};

// GET next employee ID/code for an entity
exports.getNextEmployeeCode = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const entityId = parseInt(req.params.id);

    const entity = await prisma.entity.findFirst({
      where: {
        id: entityId,
        organizationId: orgId,
        deletedAt: null,
      },
    });

    if (!entity) {
      return res.status(404).json({ success: false, message: "Entity not found" });
    }

    // Determine prefix from entity name or code
    // E.g. "TowRankers" -> words: ["TowRankers"] -> uppercase letters "TR" or "Tow Rankers" -> "TR"
    let prefix = "";
    const words = entity.name.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      prefix = words.map(w => w[0]).join("").toUpperCase();
    } else {
      // Single word like "TowRankers" -> take uppercase letters, e.g. T and R
      const uppers = entity.name.match(/[A-Z]/g);
      if (uppers && uppers.length >= 2) {
        prefix = uppers.slice(0, 3).join("");
      } else {
        prefix = entity.name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase();
      }
    }

    if (!prefix) {
      prefix = entity.code ? entity.code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() : "EMP";
    }

    // Find all existing employees for this entity or with employeeId matching prefix
    const employees = await prisma.employee.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { entityId },
          { employeeId: { startsWith: prefix } },
        ],
      },
      select: {
        id: true,
        employeeId: true,
      },
    });

    // Extract highest sequence number for this prefix
    let maxNum = 0;
    const regex = new RegExp(`^${prefix}[-_]?0*(\\d+)$`, "i");

    for (const emp of employees) {
      if (emp.employeeId) {
        const match = emp.employeeId.match(regex);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }

    // If no numbers parsed from regex but employees exist for this entity, use count
    if (maxNum === 0 && employees.filter(e => e.entityId === entityId).length > 0) {
      maxNum = employees.filter(e => e.entityId === entityId).length;
    }

    const nextNum = maxNum + 1;
    // Format as TR001 (or TR01 if maxNum < 100, standard 3 digits padding: e.g. TR001)
    const paddedNum = String(nextNum).padStart(3, "0");
    const nextCode = `${prefix}${paddedNum}`;

    res.json({
      success: true,
      data: {
        prefix,
        nextNumber: nextNum,
        nextCode,
      },
    });
  } catch (error) {
    console.error("Error generating next employee code:", error);
    res.status(500).json({ success: false, message: "Error generating next employee code" });
  }
};

// CREATE new entity
exports.createEntity = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { name, code, description, status = "active", companyId } = req.body;

    if (!name?.trim() || !code?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Entity Name and Entity Code are required",
      });
    }

    // Check code uniqueness within the organization
    const existing = await prisma.entity.findFirst({
      where: {
        organizationId: orgId,
        code: code.trim(),
        deletedAt: null,
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Entity with code '${code.trim()}' already exists`,
      });
    }

    const entity = await prisma.entity.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description?.trim() || null,
        status: status || "active",
        organizationId: orgId,
        companyId: companyId ? parseInt(companyId) : null,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({ success: true, data: entity });
  } catch (error) {
    console.error("Error creating entity:", error);
    res.status(500).json({ success: false, message: "Error creating entity" });
  }
};

// UPDATE existing entity
exports.updateEntity = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const id = parseInt(req.params.id);
    const { name, code, description, status, companyId } = req.body;

    const existing = await prisma.entity.findFirst({
      where: {
        id,
        organizationId: orgId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Entity not found" });
    }

    // If code is being updated, check code uniqueness within the organization
    if (code && code.trim().toUpperCase() !== existing.code) {
      const duplicate = await prisma.entity.findFirst({
        where: {
          organizationId: orgId,
          code: code.trim().toUpperCase(),
          id: { not: id },
          deletedAt: null,
        },
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Entity with code '${code.trim().toUpperCase()}' already exists`,
        });
      }
    }

    const updated = await prisma.entity.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(code && { code: code.trim().toUpperCase() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(status && { status }),
        companyId: companyId !== undefined ? (companyId ? parseInt(companyId) : null) : undefined,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating entity:", error);
    res.status(500).json({ success: false, message: "Error updating entity" });
  }
};

// DELETE entity (soft delete)
exports.deleteEntity = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const id = parseInt(req.params.id);

    const existing = await prisma.entity.findFirst({
      where: {
        id,
        organizationId: orgId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Entity not found" });
    }

    await prisma.entity.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.json({ success: true, message: "Entity deleted successfully" });
  } catch (error) {
    console.error("Error deleting entity:", error);
    res.status(500).json({ success: false, message: "Error deleting entity" });
  }
};
