const prisma = require("../../config/prisma");

//////////////////////////////////////////////////////
// GET ALL VISITORS (WITH FILTERS & SEARCH)
//////////////////////////////////////////////////////
exports.getVisitors = async (req, res) => {
  try {
    const orgId = req.user.orgId || req.user.organizationId;
    const { companyId, departmentId, status, search, dateRange, startDate, endDate } = req.query;

    const where = {
      organizationId: orgId,
      deletedAt: null,
    };

    if (companyId && companyId !== "all" && companyId !== "ALL" && !isNaN(parseInt(companyId))) {
      where.companyId = parseInt(companyId);
    }

    if (departmentId && departmentId !== "all" && departmentId !== "ALL" && !isNaN(parseInt(departmentId))) {
      where.departmentId = parseInt(departmentId);
    }

    if (status && status !== "all" && status !== "ALL") {
      where.status = status.toUpperCase();
    }

    // Search query across name, phone, email, CNIC, badge, visitor company
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { fullName: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
        { nationalId: { contains: q } },
        { badgeNumber: { contains: q } },
        { visitorCompany: { contains: q } },
        { purpose: { contains: q } },
        {
          host: {
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
            ],
          },
        },
      ];
    }

    // Date filtering (today, week, month, or custom range)
    if (dateRange === "today") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      where.createdAt = { gte: startOfDay, lte: endOfDay };
    } else if (dateRange === "week") {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - 7);
      where.createdAt = { gte: startOfWeek };
    } else if (dateRange === "month") {
      const startOfMonth = new Date();
      startOfMonth.setDate(startOfMonth.getDate() - 30);
      where.createdAt = { gte: startOfMonth };
    } else if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (req.query.date) {
      const selected = new Date(req.query.date);
      const startOfDay = new Date(selected);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selected);
      endOfDay.setHours(23, 59, 59, 999);
      where.createdAt = { gte: startOfDay, lte: endOfDay };
    }

    const visitors = await prisma.visitor.findMany({
      where,
      include: {
        company: true,
        department: true,
        host: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            profileImage: true,
            employeeId: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({ success: true, data: visitors });
  } catch (error) {
    console.error("Error fetching visitors:", error);
    res.status(500).json({ success: false, message: "Error fetching visitors" });
  }
};

//////////////////////////////////////////////////////
// GET VISITOR STATS (KPIS)
//////////////////////////////////////////////////////
exports.getVisitorStats = async (req, res) => {
  try {
    const orgId = req.user.orgId || req.user.organizationId;
    const { companyId } = req.query;

    const baseWhere = {
      organizationId: orgId,
      deletedAt: null,
      ...(companyId && companyId !== "all" && !isNaN(parseInt(companyId)) ? { companyId: parseInt(companyId) } : {}),
    };

    const totalVisitors = await prisma.visitor.count({ where: baseWhere });

    const checkedInCount = await prisma.visitor.count({
      where: { ...baseWhere, status: "CHECKED_IN" },
    });

    const expectedCount = await prisma.visitor.count({
      where: { ...baseWhere, status: "EXPECTED" },
    });

    const checkedOutCount = await prisma.visitor.count({
      where: { ...baseWhere, status: "CHECKED_OUT" },
    });

    // Today's count
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayCount = await prisma.visitor.count({
      where: {
        ...baseWhere,
        createdAt: { gte: startOfToday, lte: endOfToday },
      },
    });

    res.json({
      success: true,
      stats: {
        total: totalVisitors,
        checkedIn: checkedInCount,
        expected: expectedCount,
        checkedOut: checkedOutCount,
        today: todayCount,
      },
    });
  } catch (error) {
    console.error("Error fetching visitor stats:", error);
    res.status(500).json({ success: false, message: "Error fetching visitor stats" });
  }
};

//////////////////////////////////////////////////////
// GET SINGLE VISITOR
//////////////////////////////////////////////////////
exports.getVisitorById = async (req, res) => {
  try {
    const orgId = req.user.orgId || req.user.organizationId;
    const { id } = req.params;

    const visitor = await prisma.visitor.findFirst({
      where: {
        id: parseInt(id),
        organizationId: orgId,
        deletedAt: null,
      },
      include: {
        company: true,
        department: true,
        host: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            profileImage: true,
            employeeId: true,
          },
        },
      },
    });

    if (!visitor) {
      return res.status(404).json({ success: false, message: "Visitor not found" });
    }

    res.json({ success: true, data: visitor });
  } catch (error) {
    console.error("Error fetching visitor detail:", error);
    res.status(500).json({ success: false, message: "Error fetching visitor detail" });
  }
};

//////////////////////////////////////////////////////
// CREATE VISITOR
//////////////////////////////////////////////////////
exports.createVisitor = async (req, res) => {
  try {
    const orgId = req.user.orgId || req.user.organizationId;

    let payload = req.body;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        // payload is fine
      }
    }

    const {
      fullName,
      phone,
      email,
      nationalId,
      visitorCompany,
      purpose,
      hostId,
      companyId,
      departmentId,
      badgeNumber,
      startDate,
      expectedDate,
      checkInTime,
      status,
      vehicleNumber,
      notes,
    } = payload;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ success: false, message: "Visitor full name is required" });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: "Phone number is required" });
    }

    let photo = payload.photo || null;
    if (req.file) {
      photo = req.file.path.replace(/\\/g, "/");
    }

    // Default companyId if not passed: check req.user.companyId or first company
    let targetCompanyId = companyId && !isNaN(parseInt(companyId)) ? parseInt(companyId) : req.user.companyId || null;
    if (!targetCompanyId) {
      const firstComp = await prisma.company.findFirst({
        where: { organizationId: orgId, deletedAt: null },
      });
      if (firstComp) targetCompanyId = firstComp.id;
    }

    const visitorStatus = (status || "CHECKED_IN").toUpperCase();

    const newVisitor = await prisma.visitor.create({
      data: {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email && email.trim() ? email.trim() : null,
        nationalId: nationalId && nationalId.trim() ? nationalId.trim() : null,
        visitorCompany: visitorCompany && visitorCompany.trim() ? visitorCompany.trim() : null,
        purpose: purpose && purpose.trim() ? purpose.trim() : "Meeting",
        hostId: hostId && !isNaN(parseInt(hostId)) ? parseInt(hostId) : null,
        companyId: targetCompanyId,
        departmentId: departmentId && !isNaN(parseInt(departmentId)) ? parseInt(departmentId) : null,
        badgeNumber: badgeNumber && badgeNumber.trim() ? badgeNumber.trim() : null,
        startDate: startDate ? new Date(startDate) : null,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        checkInTime: checkInTime ? new Date(checkInTime) : (visitorStatus === "CHECKED_IN" ? new Date() : null),
        status: visitorStatus,
        vehicleNumber: vehicleNumber && vehicleNumber.trim() ? vehicleNumber.trim() : null,
        notes: notes && notes.trim() ? notes.trim() : null,
        photo,
        organizationId: orgId,
      },
      include: {
        company: true,
        department: true,
        host: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Visitor added successfully!",
      data: newVisitor,
    });
  } catch (error) {
    console.error("Error creating visitor:", error);
    res.status(500).json({ success: false, message: error?.message || "Failed to create visitor" });
  }
};

//////////////////////////////////////////////////////
// UPDATE VISITOR
//////////////////////////////////////////////////////
exports.updateVisitor = async (req, res) => {
  try {
    const orgId = req.user.orgId || req.user.organizationId;
    const { id } = req.params;

    const existing = await prisma.visitor.findFirst({
      where: { id: parseInt(id), organizationId: orgId, deletedAt: null },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Visitor not found" });
    }

    let payload = req.body;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch (e) {}
    }

    const {
      fullName,
      phone,
      email,
      nationalId,
      visitorCompany,
      purpose,
      hostId,
      companyId,
      departmentId,
      badgeNumber,
      startDate,
      expectedDate,
      checkInTime,
      checkOutTime,
      status,
      vehicleNumber,
      notes,
    } = payload;

    let photo = existing.photo;
    if (req.file) {
      photo = req.file.path.replace(/\\/g, "/");
    } else if (payload.photo !== undefined) {
      photo = payload.photo;
    }

    const updated = await prisma.visitor.update({
      where: { id: parseInt(id) },
      data: {
        ...(fullName ? { fullName: fullName.trim() } : {}),
        ...(phone ? { phone: phone.trim() } : {}),
        ...(email !== undefined ? { email: email && email.trim() ? email.trim() : null } : {}),
        ...(nationalId !== undefined ? { nationalId: nationalId && nationalId.trim() ? nationalId.trim() : null } : {}),
        ...(visitorCompany !== undefined ? { visitorCompany: visitorCompany && visitorCompany.trim() ? visitorCompany.trim() : null } : {}),
        ...(purpose !== undefined ? { purpose: purpose && purpose.trim() ? purpose.trim() : null } : {}),
        ...(hostId !== undefined ? { hostId: hostId && !isNaN(parseInt(hostId)) ? parseInt(hostId) : null } : {}),
        ...(companyId !== undefined ? { companyId: companyId && !isNaN(parseInt(companyId)) ? parseInt(companyId) : null } : {}),
        ...(departmentId !== undefined ? { departmentId: departmentId && !isNaN(parseInt(departmentId)) ? parseInt(departmentId) : null } : {}),
        ...(badgeNumber !== undefined ? { badgeNumber: badgeNumber && badgeNumber.trim() ? badgeNumber.trim() : null } : {}),
        ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
        ...(expectedDate !== undefined ? { expectedDate: expectedDate ? new Date(expectedDate) : null } : {}),
        ...(checkInTime !== undefined ? { checkInTime: checkInTime ? new Date(checkInTime) : null } : {}),
        ...(checkOutTime !== undefined ? { checkOutTime: checkOutTime ? new Date(checkOutTime) : null } : {}),
        ...(status ? { status: status.toUpperCase() } : {}),
        ...(vehicleNumber !== undefined ? { vehicleNumber: vehicleNumber && vehicleNumber.trim() ? vehicleNumber.trim() : null } : {}),
        ...(notes !== undefined ? { notes: notes && notes.trim() ? notes.trim() : null } : {}),
        photo,
      },
      include: {
        company: true,
        department: true,
        host: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: "Visitor updated successfully!",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating visitor:", error);
    res.status(500).json({ success: false, message: "Error updating visitor" });
  }
};

//////////////////////////////////////////////////////
// 1-CLICK CHECK-OUT VISITOR
//////////////////////////////////////////////////////
exports.checkOutVisitor = async (req, res) => {
  try {
    const orgId = req.user.orgId || req.user.organizationId;
    const { id } = req.params;

    const existing = await prisma.visitor.findFirst({
      where: { id: parseInt(id), organizationId: orgId, deletedAt: null },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Visitor not found" });
    }

    const updated = await prisma.visitor.update({
      where: { id: parseInt(id) },
      data: {
        status: "CHECKED_OUT",
        checkOutTime: new Date(),
      },
    });

    res.json({
      success: true,
      message: `${existing.fullName} checked out successfully!`,
      data: updated,
    });
  } catch (error) {
    console.error("Error checking out visitor:", error);
    res.status(500).json({ success: false, message: "Error checking out visitor" });
  }
};

//////////////////////////////////////////////////////
// 1-CLICK CHECK-IN VISITOR
//////////////////////////////////////////////////////
exports.checkInVisitor = async (req, res) => {
  try {
    const orgId = req.user.orgId || req.user.organizationId;
    const { id } = req.params;

    const existing = await prisma.visitor.findFirst({
      where: { id: parseInt(id), organizationId: orgId, deletedAt: null },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Visitor not found" });
    }

    const updated = await prisma.visitor.update({
      where: { id: parseInt(id) },
      data: {
        status: "CHECKED_IN",
        checkInTime: new Date(),
      },
    });

    res.json({
      success: true,
      message: `${existing.fullName} checked in successfully!`,
      data: updated,
    });
  } catch (error) {
    console.error("Error checking in visitor:", error);
    res.status(500).json({ success: false, message: "Error checking in visitor" });
  }
};

//////////////////////////////////////////////////////
// DELETE VISITOR (SOFT DELETE)
//////////////////////////////////////////////////////
exports.deleteVisitor = async (req, res) => {
  try {
    const orgId = req.user.orgId || req.user.organizationId;
    const { id } = req.params;

    const existing = await prisma.visitor.findFirst({
      where: { id: parseInt(id), organizationId: orgId, deletedAt: null },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Visitor not found" });
    }

    await prisma.visitor.update({
      where: { id: parseInt(id) },
      data: { deletedAt: new Date() },
    });

    res.json({ success: true, message: "Visitor deleted successfully" });
  } catch (error) {
    console.error("Error deleting visitor:", error);
    res.status(500).json({ success: false, message: "Error deleting visitor" });
  }
};
