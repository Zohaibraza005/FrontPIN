const prisma = require("../../config/prisma");
const bcrypt = require("bcrypt");
const moment = require("moment-timezone");
const visitorLogService = require("./visitorLog.service");

//////////////////////////////////////////////////////
// GET ALL VISITORS (WITH FILTERS, SEARCH & DATE PUNCHES)
//////////////////////////////////////////////////////
exports.getVisitors = async (req, res) => {
  try {
    const orgId = req.user.orgId || req.user.organizationId;
    const { companyId, departmentId, status, search, date } = req.query;

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

    // Fetch all matching visitors
    let visitors = await prisma.visitor.findMany({
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

    const timezone = "Asia/Karachi";
    const todayStr = moment().tz(timezone).format("YYYY-MM-DD");
    const targetDateStr = date ? moment(date).tz(timezone).format("YYYY-MM-DD") : todayStr;

    // Load real-time visitor punches for target date
    const punchesByVisitor = await visitorLogService.getPunchesGroupedByVisitor({
      organizationId: orgId,
      date: targetDateStr,
    });

    // Map each visitor to reflect their exact punches and status on targetDate
    visitors = visitors.map((v) => {
      const vObj = { ...v };
      const punches = punchesByVisitor[v.id] || [];
      vObj.punches = punches;

      if (punches.length > 0) {
        const inPunches = punches.filter((p) => p.punchType === "CHECK_IN");
        const outPunches = punches.filter((p) => p.punchType === "CHECK_OUT");

        const firstIn = inPunches.length > 0 ? inPunches[0] : punches[0];
        const lastOut = outPunches.length > 0 ? outPunches[outPunches.length - 1] : null;

        vObj.checkInTime = firstIn ? firstIn.punchTime : v.checkInTime;
        vObj.checkOutTime = lastOut ? lastOut.punchTime : null;

        // If last punch of the day was CHECK_OUT, status is CHECKED_OUT
        const latestPunch = punches[punches.length - 1];
        if (latestPunch.punchType === "CHECK_OUT") {
          vObj.status = "CHECKED_OUT";
        } else {
          vObj.status = "CHECKED_IN";
        }
      } else {
        // No punches recorded in visitor_log for this date
        if (targetDateStr === todayStr) {
          // If viewing today and checkInTime was set today (e.g. manual creation / legacy check-in)
          if (v.checkInTime && moment(v.checkInTime).tz(timezone).format("YYYY-MM-DD") === todayStr) {
            vObj.status = v.status || "CHECKED_IN";
          } else {
            vObj.status = "EXPECTED";
            vObj.checkInTime = null;
            vObj.checkOutTime = null;
          }
        } else {
          // For another date with no punches, visitor was EXPECTED (not checked in on that date)
          vObj.status = "EXPECTED";
          vObj.checkInTime = null;
          vObj.checkOutTime = null;
        }
      }

      return vObj;
    });

    // If client requested a specific status filter
    if (status && status !== "all" && status !== "ALL") {
      visitors = visitors.filter((v) => v.status === status.toUpperCase());
    }

    res.json({ success: true, data: visitors, date: targetDateStr });
  } catch (error) {
    console.error("Error fetching visitors:", error);
    res.status(500).json({ success: false, message: "Error fetching visitors" });
  }
};

//////////////////////////////////////////////////////
// GET VISITOR STATS (KPIS) FOR DATE
//////////////////////////////////////////////////////
exports.getVisitorStats = async (req, res) => {
  try {
    const orgId = req.user.orgId || req.user.organizationId;
    const { companyId, date } = req.query;

    const baseWhere = {
      organizationId: orgId,
      deletedAt: null,
      ...(companyId && companyId !== "all" && !isNaN(parseInt(companyId)) ? { companyId: parseInt(companyId) } : {}),
    };

    const totalVisitors = await prisma.visitor.count({ where: baseWhere });

    const timezone = "Asia/Karachi";
    const todayStr = moment().tz(timezone).format("YYYY-MM-DD");
    const targetDateStr = date ? moment(date).tz(timezone).format("YYYY-MM-DD") : todayStr;

    const punchesByVisitor = await visitorLogService.getPunchesGroupedByVisitor({
      organizationId: orgId,
      date: targetDateStr,
    });

    let checkedInCount = 0;
    let checkedOutCount = 0;

    for (const [vId, punches] of Object.entries(punchesByVisitor)) {
      if (punches && punches.length > 0) {
        const latest = punches[punches.length - 1];
        if (latest.punchType === "CHECK_OUT") {
          checkedOutCount++;
        } else {
          checkedInCount++;
        }
      }
    }

    // If today and no visitor_log entry exists yet, also check legacy checkInTime
    if (targetDateStr === todayStr && checkedInCount === 0) {
      const startOfToday = moment().tz(timezone).startOf("day").toDate();
      const endOfToday = moment().tz(timezone).endOf("day").toDate();
      const dbCheckedIn = await prisma.visitor.count({
        where: {
          ...baseWhere,
          status: "CHECKED_IN",
          checkInTime: { gte: startOfToday, lte: endOfToday },
        },
      });
      if (dbCheckedIn > 0) checkedInCount = dbCheckedIn;
    }

    const expectedCount = Math.max(0, totalVisitors - checkedInCount - checkedOutCount);

    res.json({
      success: true,
      stats: {
        total: totalVisitors,
        checkedIn: checkedInCount,
        checkedOut: checkedOutCount,
        expected: expectedCount,
        today: checkedInCount + checkedOutCount,
        date: targetDateStr,
      },
    });
  } catch (error) {
    console.error("Error fetching visitor stats:", error);
    res.status(500).json({ success: false, message: "Error fetching visitor stats" });
  }
};

//////////////////////////////////////////////////////
// GET VISITOR REAL-TIME PUNCH LOGS
//////////////////////////////////////////////////////
exports.getVisitorLogs = async (req, res) => {
  try {
    const orgId = req.user.orgId || req.user.organizationId;
    const { date, visitorId, limit } = req.query;

    const timezone = "Asia/Karachi";
    const dateStr = date ? moment(date).tz(timezone).format("YYYY-MM-DD") : null;

    const logs = await visitorLogService.getVisitorLogs({
      organizationId: orgId,
      date: dateStr,
      visitorId: visitorId ? parseInt(visitorId) : null,
      limit: limit ? parseInt(limit) : 200,
    });

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error("Error fetching visitor logs:", error);
    res.status(500).json({ success: false, message: "Error fetching visitor logs" });
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

    const visitorStatus = (status || "EXPECTED").toUpperCase();

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

    if (startDate) {
      try {
        await prisma.$executeRawUnsafe(
          "UPDATE visitor SET startDate = ? WHERE id = ?",
          new Date(startDate),
          newVisitor.id
        );
        newVisitor.startDate = new Date(startDate);
      } catch (e) {
        console.warn("Error updating visitor startDate:", e.message);
      }
    }

    // Ensure visitor has a badge number (9XXXX)
    let finalBadge = newVisitor.badgeNumber;
    if (!finalBadge) {
      finalBadge = `9${String(newVisitor.id).padStart(4, "0")}`;
      try {
        await prisma.visitor.update({
          where: { id: newVisitor.id },
          data: { badgeNumber: finalBadge },
        });
        newVisitor.badgeNumber = finalBadge;
      } catch (e) {}
    }

    // Auto-provision visitor to online biometric devices in background
    prisma.biometricDevice.findMany({
      where: { brand: "HIKVISION", deletedAt: null },
    }).then((devices) => {
      const { pushUserToHikvision } = require("../devices/hikvision.service");
      for (const dev of devices) {
        pushUserToHikvision(dev, {
          biometricId: finalBadge,
          name: newVisitor.fullName,
        }).catch((e) => console.error(`[Visitor Auto-Push Error] ${dev.name}:`, e.message));
      }
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: "Visitor added successfully! Pushed to biometric machines.",
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

    if (startDate !== undefined) {
      try {
        await prisma.$executeRawUnsafe(
          "UPDATE visitor SET startDate = ? WHERE id = ?",
          startDate ? new Date(startDate) : null,
          parseInt(id)
        );
        updated.startDate = startDate ? new Date(startDate) : null;
      } catch (e) {
        console.warn("Error updating visitor startDate:", e.message);
      }
    }

    // Auto-update visitor details on active biometric devices in background
    if (fullName || badgeNumber) {
      const bioId = updated.badgeNumber || `9${String(updated.id).padStart(4, "0")}`;
      prisma.biometricDevice.findMany({
        where: { brand: "HIKVISION", deletedAt: null },
      }).then((devices) => {
        const { pushUserToHikvision } = require("../devices/hikvision.service");
        for (const dev of devices) {
          pushUserToHikvision(dev, {
            biometricId: bioId,
            name: updated.fullName,
          }).catch((e) => console.error(`[Visitor Update Auto-Push Error] ${dev.name}:`, e.message));
        }
      }).catch(() => {});
    }

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
      include: { company: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Visitor not found" });
    }

    const logRes = await visitorLogService.recordVisitorPunch({
      visitorId: existing.id,
      organizationId: orgId,
      punchTime: new Date(),
      punchType: "CHECK_OUT",
      device: "Manual (Web)",
      method: "MANUAL",
      timezone: existing.company?.timezone || "Asia/Karachi",
    });

    res.json({
      success: true,
      message: `${existing.fullName} checked out successfully!`,
      data: logRes.visitor,
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
      include: { company: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Visitor not found" });
    }

    const logRes = await visitorLogService.recordVisitorPunch({
      visitorId: existing.id,
      organizationId: orgId,
      punchTime: new Date(),
      punchType: "CHECK_IN",
      device: "Manual (Web)",
      method: "MANUAL",
      timezone: existing.company?.timezone || "Asia/Karachi",
    });

    res.json({
      success: true,
      message: `${existing.fullName} checked in successfully!`,
      data: logRes.visitor,
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

    // 1. Soft-delete visitor in database
    await prisma.visitor.update({
      where: { id: parseInt(id) },
      data: { deletedAt: new Date() },
    });

    // 2. ONLY FOR VISITOR: Delete visitor & credentials (face, fingerprints, card) from all biometric machines
    const candidateIds = [
      existing.badgeNumber,
      `9${String(existing.id).padStart(4, "0")}`,
      String(existing.id),
      existing.phone,
    ]
      .map((x) => String(x || "").trim())
      .filter((x, idx, arr) => x && arr.indexOf(x) === idx);

    let deviceDeleteCount = 0;
    try {
      const activeDevices = await prisma.biometricDevice.findMany({
        where: { brand: "HIKVISION", deletedAt: null },
      });

      const { deleteUserFromHikvision } = require("../devices/hikvision.service");

      await Promise.allSettled(
        activeDevices.map(async (device) => {
          try {
            const ok = await deleteUserFromHikvision(device, candidateIds);
            if (ok) deviceDeleteCount++;
          } catch (e) {
            console.warn(`[Visitor Delete Device Warning] Failed on ${device.name}:`, e.message);
          }
        })
      );

      console.log(
        `[Visitor Machine Delete] Visitor ${existing.fullName} (IDs: ${candidateIds.join(", ")}) removed from ${deviceDeleteCount} machine(s).`
      );
    } catch (devErr) {
      console.error("[Visitor Machine Delete Error]:", devErr.message);
    }

    res.json({
      success: true,
      message: `Visitor deleted successfully and removed from biometric machine(s)!`,
    });
  } catch (error) {
    console.error("Error deleting visitor:", error);
    res.status(500).json({ success: false, message: "Error deleting visitor" });
  }
};

//////////////////////////////////////////////////////
// CONVERT VISITOR TO EMPLOYEE
//////////////////////////////////////////////////////
exports.convertVisitorToEmployee = async (req, res) => {
  try {
    const orgId = req.user.orgId || req.user.organizationId;
    const { id } = req.params;

    const visitor = await prisma.visitor.findFirst({
      where: { id: parseInt(id), organizationId: orgId, deletedAt: null },
      include: {
        company: true,
        department: true,
      },
    });

    if (!visitor) {
      return res.status(404).json({ success: false, message: "Visitor record not found" });
    }

    if (visitor.status === "CONVERTED") {
      return res.status(400).json({
        success: false,
        message: "This visitor has already been converted to an employee.",
      });
    }

    const {
      firstName,
      lastName,
      username,
      email,
      phoneNumber,
      nationalId,
      password,
      pin,
      canLogin = true,
      employeeId,
      biometricId,
      companyId,
      departmentId,
      entityId,
      role = "USER",
      roleId,
      supervisorId,
      gender,
      age,
      maritalStatus,
      // Job details
      designation,
      employmentStatus = "Permanent",
      hiringDate,
      joiningDate,
      workMode = "On-site",
      // Payroll details
      payoutType = "monthly",
      rate = 0,
      currency = "PKR",
      cycleDate = 1,
      overtimeRate = 1,
      allowExtraHours = true,
      maxExtraHours = 2,
      // Privileges
      privileges,
    } = req.body;

    const nameParts = (visitor.fullName || "").trim().split(/\s+/);
    const fallbackFirstName = nameParts[0] || "Employee";
    const fallbackLastName = nameParts.slice(1).join(" ") || "";

    const finalFirstName = (firstName && firstName.trim()) ? firstName.trim() : fallbackFirstName;
    const finalLastName = (lastName !== undefined && lastName !== null) ? lastName.trim() : fallbackLastName;
    const finalEmail = (email && email.trim()) ? email.trim() : (visitor.email ? visitor.email.trim() : null);
    const finalPhone = (phoneNumber && phoneNumber.trim()) ? phoneNumber.trim() : (visitor.phone ? visitor.phone.trim() : null);
    const finalNationalId = (nationalId && nationalId.trim()) ? nationalId.trim() : (visitor.nationalId ? visitor.nationalId.trim() : null);
    const finalCompanyId = companyId ? parseInt(companyId) : visitor.companyId;
    const finalDeptId = departmentId ? parseInt(departmentId) : visitor.departmentId;

    if (!username || !username.trim()) {
      return res.status(400).json({ success: false, message: "Username is required" });
    }

    if (!finalEmail) {
      return res.status(400).json({ success: false, message: "Email is required for employee profile" });
    }

    if (canLogin && !password) {
      return res.status(400).json({ success: false, message: "Password is required when login is enabled" });
    }

    // Check duplicate username, email, phone, CNIC, employeeId
    const duplicateChecks = [
      { username: username.trim() },
      { email: finalEmail.trim() },
    ];
    if (employeeId && String(employeeId).trim()) {
      duplicateChecks.push({ employeeId: String(employeeId).trim() });
    }
    if (finalPhone) {
      duplicateChecks.push({ phoneNumber: finalPhone });
    }
    if (finalNationalId) {
      duplicateChecks.push({ nationalId: finalNationalId });
    }

    const existingUser = await prisma.employee.findFirst({
      where: {
        organizationId: orgId,
        OR: duplicateChecks,
      },
    });

    if (existingUser) {
      if (existingUser.username.toLowerCase() === username.trim().toLowerCase()) {
        return res.status(400).json({ success: false, message: "Username already exists" });
      }
      if (existingUser.email.toLowerCase() === finalEmail.trim().toLowerCase()) {
        return res.status(400).json({ success: false, message: "Email already exists" });
      }
      if (employeeId && existingUser.employeeId && existingUser.employeeId.toLowerCase() === String(employeeId).trim().toLowerCase()) {
        return res.status(400).json({ success: false, message: "Employee ID already exists" });
      }
      if (finalPhone && existingUser.phoneNumber === finalPhone) {
        return res.status(400).json({ success: false, message: "Phone number already exists in employees" });
      }
      if (finalNationalId && existingUser.nationalId === finalNationalId) {
        return res.status(400).json({ success: false, message: "National ID / CNIC already exists in employees" });
      }
    }

    let hashedPassword = null;
    if (canLogin && password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Default privileges if not passed
    let parsedPrivileges = privileges || [
      { module: "EMPLOYEE", canRead: true, canCreate: false, canUpdate: false, canDelete: false, ownTeamOnly: false },
      { module: "ATTENDANCE", canRead: true, canCreate: true, canUpdate: false, canDelete: false, ownTeamOnly: false },
      { module: "SCHEDULE", canRead: true, canCreate: false, canUpdate: false, canDelete: false, ownTeamOnly: false },
      { module: "LEAVE", canRead: true, canCreate: true, canUpdate: false, canDelete: false, ownTeamOnly: false },
      { module: "OVERTIME", canRead: true, canCreate: true, canUpdate: false, canDelete: false, ownTeamOnly: false },
      { module: "PAYROLL", canRead: true, canCreate: false, canUpdate: false, canDelete: false, ownTeamOnly: false },
    ];

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Employee
      const newEmployee = await tx.employee.create({
        data: {
          firstName: finalFirstName,
          lastName: finalLastName,
          username: username.trim(),
          email: finalEmail.trim(),
          password: canLogin ? hashedPassword : null,
          pin: canLogin && pin ? String(pin) : null,
          employeeId: employeeId ? String(employeeId).trim() : null,
          biometricId: biometricId ? String(biometricId).trim() : (visitor.badgeNumber ? String(visitor.badgeNumber) : null),
          phoneNumber: finalPhone || null,
          nationalId: finalNationalId || null,
          gender: gender || null,
          age: age ? parseInt(age) : null,
          maritalStatus: maritalStatus || null,
          canLogin: Boolean(canLogin),
          profileImage: visitor.photo || null,
          role: ["ADMIN", "SUPERVISOR", "USER"].includes(String(role).toUpperCase()) ? String(role).toUpperCase() : "USER",
          organizationId: orgId,
          companyId: finalCompanyId ? parseInt(finalCompanyId) : null,
          departmentId: finalDeptId ? parseInt(finalDeptId) : null,
          entityId: entityId ? parseInt(entityId) : null,
          roleId: roleId ? parseInt(roleId) : null,
          supervisorId: supervisorId ? parseInt(supervisorId) : null,
          jobInfo: {
            create: {
              designation: designation || "Employee",
              employmentStatus: employmentStatus || "Permanent",
              hiringDate: hiringDate ? new Date(hiringDate) : new Date(),
              joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
              workMode: workMode || "On-site",
              allowExtraHours: Boolean(allowExtraHours),
              maxExtraHours: maxExtraHours ? parseInt(maxExtraHours) : 2,
            },
          },
          payroll: {
            create: {
              payoutType: payoutType || "monthly",
              rate: parseFloat(rate) || 0,
              currency: currency || "PKR",
              cycleDate: parseInt(cycleDate) || 1,
              overtimeRate: overtimeRate ? parseFloat(overtimeRate) : 1,
            },
          },
          privileges: {
            create: parsedPrivileges.map((p) => ({
              module: (typeof p === "string" ? p : p.module).toUpperCase(),
              canRead: typeof p === "string" ? true : (p.canRead ?? true),
              canCreate: typeof p === "string" ? false : (p.canCreate || false),
              canUpdate: typeof p === "string" ? false : (p.canUpdate || false),
              canDelete: typeof p === "string" ? false : (p.canDelete || false),
              ownTeamOnly: typeof p === "string" ? false : (p.ownTeamOnly || false),
            })),
          },
        },
        include: {
          jobInfo: true,
          payroll: true,
          privileges: true,
        },
      });

      // 2. Update Visitor record
      const conversionNote = `[Converted to Employee: ${newEmployee.employeeId || newEmployee.username} on ${new Date().toISOString().split("T")[0]}]`;
      const updatedNotes = visitor.notes ? `${visitor.notes}\n${conversionNote}` : conversionNote;

      await tx.visitor.update({
        where: { id: visitor.id },
        data: {
          status: "CONVERTED",
          checkOutTime: visitor.checkOutTime || new Date(),
          notes: updatedNotes,
        },
      });

      return newEmployee;
    });

    // 3. Default schedule
    try {
      await prisma.schedule.create({
        data: {
          employeeId: result.id,
          companyId: result.companyId || null,
          startTime: "09:00",
          endTime: "18:00",
          days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
          overtimeAllowed: Boolean(allowExtraHours),
          overtimeMinutes: (maxExtraHours ? parseInt(maxExtraHours) : 2) * 60,
          allowEarlyIn: true,
          earlyInMargin: 15,
          allowEarlyOut: true,
          earlyOutMargin: 15,
          allowHalfDay: false,
          halfDayMinutes: 240,
          breaksAllowed: true,
          breakDurations: [15, 15],
        },
      });
    } catch (schedErr) {
      console.warn("Initial schedule creation note:", schedErr.message);
    }

    // 4. Auto-Push to Hikvision if applicable
    const bioIdToPush = result.biometricId || result.employeeId;
    if (bioIdToPush) {
      try {
        const { pushUserToHikvision } = require("../devices/hikvision.service");
        const activeDevices = await prisma.biometricDevice.findMany({
          where: { brand: "HIKVISION", deletedAt: null },
        });
        activeDevices.forEach((device) => {
          pushUserToHikvision(device, {
            biometricId: bioIdToPush,
            name: `${result.firstName} ${result.lastName}`,
          }).catch((e) => console.error("Auto Push on conversion error:", e));
        });
      } catch (pushErr) {}
    }

    return res.status(201).json({
      success: true,
      message: `${visitor.fullName} has been successfully converted into an employee!`,
      data: result,
    });
  } catch (error) {
    console.error("Error converting visitor to employee:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to convert visitor to employee",
    });
  }
};

//////////////////////////////////////////////////////
// RESET STUCK VISITORS (CLEARS FAKE CHECK-INS)
//////////////////////////////////////////////////////
exports.resetStuckVisitors = async (req, res) => {
  try {
    const orgId = req.user.orgId || req.user.organizationId;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Reset all visitors whose check-in was in the past or fake to EXPECTED
    const result = await prisma.visitor.updateMany({
      where: {
        organizationId: orgId,
        status: "CHECKED_IN",
        OR: [
          { checkInTime: { lt: startOfToday } },
          { checkInTime: null },
        ],
        deletedAt: null,
      },
      data: {
        status: "EXPECTED",
        checkInTime: null,
        checkOutTime: null,
      },
    });

    // Also auto-assign badge number if missing so machine matching works
    const visitorsWithoutBadge = await prisma.visitor.findMany({
      where: { organizationId: orgId, deletedAt: null, OR: [{ badgeNumber: null }, { badgeNumber: "" }] },
    });

    for (const v of visitorsWithoutBadge) {
      const bNo = `9${String(v.id).padStart(4, "0")}`;
      await prisma.visitor.update({
        where: { id: v.id },
        data: { badgeNumber: bNo },
      }).catch(() => {});
    }

    return res.json({
      success: true,
      message: `Successfully reset ${result.count} stuck visitor(s) to Expected. Live biometric punch will now mark fresh attendance!`,
      count: result.count,
    });
  } catch (error) {
    console.error("Error resetting stuck visitors:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
