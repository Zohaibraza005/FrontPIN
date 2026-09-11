const prisma = require("../../config/prisma");
const bcrypt = require("bcrypt");

//////////////////////////////////////////////////////
// GET ALL EMPLOYEES (WITH FILTERS)
//////////////////////////////////////////////////////

exports.getEmployees = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { companyId, departmentId, role } = req.query;

    const employees = await prisma.employee.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        ...(companyId && companyId !== "all" && companyId !== "ALL" && !isNaN(parseInt(companyId)) && { companyId: parseInt(companyId) }),
        ...(departmentId && departmentId !== "all" && departmentId !== "ALL" && !isNaN(parseInt(departmentId)) && { departmentId: parseInt(departmentId) }),
        ...(role ? { role: role.toUpperCase() } : { NOT: { role: "ADMIN" } }),
      },
      include: {
        company: true,
        department: true,
        entity: true,
        supervisor: true,
        appRole: true,
        jobInfo: true,
        payroll: true,
        privileges: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({ success: true, data: employees });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

//////////////////////////////////////////////////////
// CREATE EMPLOYEE
//////////////////////////////////////////////////////



exports.createEmployee = async (req, res) => {
  try {
    const orgId = req.user.orgId;

    const { personal, job, payroll, privileges } = req.body;

    if (!personal || !job || !payroll) {
      return res.status(400).json({
        success: false,
        message: "Missing required data",
      });
    }

    const parsedPersonal = JSON.parse(personal);
    const parsedJob = JSON.parse(job);
    const parsedPayroll = JSON.parse(payroll);
    let parsedPrivileges = privileges ? JSON.parse(privileges) : [];

    if ((!parsedPrivileges || parsedPrivileges.length === 0) && parsedPersonal.roleId) {
      const appRole = await prisma.appRole.findFirst({
        where: {
          id: parseInt(parsedPersonal.roleId),
          organizationId: orgId,
          deletedAt: null,
        },
      });
      if (appRole && appRole.privileges) {
        parsedPrivileges = typeof appRole.privileges === "string" ? JSON.parse(appRole.privileges) : appRole.privileges;
      }
    }

    const canLogin = parsedPersonal.canLogin ?? true;

    ////////////////////////////////////////////////////
    // 🔐 LOGIN VALIDATION
    ////////////////////////////////////////////////////

    if (canLogin) {
      if (!parsedPersonal.password) {
        return res.status(400).json({
          success: false,
          message: "Password is required when login is enabled",
        });
      }

      if (!parsedPersonal.phoneNumber) {
        return res.status(400).json({
          success: false,
          message: "Phone number is required when login is enabled",
        });
      }
    }

    ////////////////////////////////////////////////////
    // 🔍 DUPLICATE CHECKS (ORG LEVEL SAFE)
    ////////////////////////////////////////////////////

    const existingUser = await prisma.employee.findFirst({
      where: {
        organizationId: orgId,
        OR: [
          { username: parsedPersonal.username },
          { email: parsedPersonal.email },
          parsedPersonal.employeeId
            ? { employeeId: parsedPersonal.employeeId }
            : undefined,
          parsedPersonal.phoneNumber
            ? { phoneNumber: parsedPersonal.phoneNumber }
            : undefined,
          parsedPersonal.nationalId
            ? { nationalId: parsedPersonal.nationalId }
            : undefined,
        ].filter(Boolean),
      },
    });

    if (existingUser) {
      if (existingUser.username === parsedPersonal.username) {
        return res.status(400).json({
          success: false,
          message: "Username already exists",
        });
      }

      if (existingUser.email === parsedPersonal.email) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }

      if (
        parsedPersonal.employeeId &&
        existingUser.employeeId === parsedPersonal.employeeId
      ) {
        return res.status(400).json({
          success: false,
          message: "Employee ID already exists",
        });
      }

      if (
        parsedPersonal.phoneNumber &&
        existingUser.phoneNumber === parsedPersonal.phoneNumber
      ) {
        return res.status(400).json({
          success: false,
          message: "Phone number already exists",
        });
      }

      if (
        parsedPersonal.nationalId &&
        existingUser.nationalId === parsedPersonal.nationalId
      ) {
        return res.status(400).json({
          success: false,
          message: "National ID already exists",
        });
      }
    }

    ////////////////////////////////////////////////////
    // 🔑 HASH PASSWORD
    ////////////////////////////////////////////////////

    let hashedPassword = null;

    if (canLogin && parsedPersonal.password) {
      hashedPassword = await bcrypt.hash(parsedPersonal.password, 10);
    }

    ////////////////////////////////////////////////////
    // 🚀 CREATE EMPLOYEE (TRANSACTION)
    ////////////////////////////////////////////////////

    const employee = await prisma.$transaction(async (tx) => {
      return await tx.employee.create({
        data: {
          firstName: parsedPersonal.firstName,
          lastName: parsedPersonal.lastName,
          username: parsedPersonal.username,
          email: parsedPersonal.email,

          password: canLogin ? hashedPassword : null,
          pin: canLogin ? parsedPersonal.pin || null : null,

          employeeId: parsedPersonal.employeeId || null,
          biometricId: parsedPersonal.biometricId || null,
          phoneNumber: parsedPersonal.phoneNumber || null,
          nationalId: parsedPersonal.nationalId || null,

          gender: parsedPersonal.gender || null,
          age: parsedPersonal.age ? parseInt(parsedPersonal.age) : null,
          qualification: parsedPersonal.qualification || null,
          maritalStatus: parsedPersonal.maritalStatus || null,
          religion: parsedPersonal.religion || null,

          canLogin,

          profileImage: req.file
            ? `/uploads/${req.file.filename}`
            : null,

          role: (parsedPersonal.role && ["ADMIN", "SUPERVISOR", "USER"].includes(String(parsedPersonal.role).toUpperCase()))
            ? String(parsedPersonal.role).toUpperCase()
            : "USER",

          organizationId: orgId,
          companyId: parseInt(parsedPersonal.companyId),
          departmentId: parsedPersonal.departmentId
            ? parseInt(parsedPersonal.departmentId)
            : null,
          entityId: parsedPersonal.entityId
            ? parseInt(parsedPersonal.entityId)
            : null,
          roleId: parsedPersonal.roleId
            ? parseInt(parsedPersonal.roleId)
            : null,
          supervisorId: parsedPersonal.supervisorId
            ? parseInt(parsedPersonal.supervisorId)
            : null,

          jobInfo: {
            create: {
              employmentStatus: parsedJob.employmentStatus || null,
              designation: parsedJob.designation || null,
              hiringDate: parsedJob.hiringDate
                ? new Date(parsedJob.hiringDate)
                : null,
              joiningDate: parsedJob.joiningDate
                ? new Date(parsedJob.joiningDate)
                : null,
              workMode: parsedJob.workMode || null,
              allowExtraHours: parsedPayroll.allowExtraHours || false,
              maxExtraHours: parsedPayroll.maxExtraHours
                ? parseInt(parsedPayroll.maxExtraHours)
                : null,
            },
          },

          payroll: {
            create: {
              payoutType: parsedPayroll.payoutType,
              rate: parseFloat(parsedPayroll.rate),
              currency: parsedPayroll.currency,
              cycleDate: parseInt(parsedPayroll.cycleDate),
              overtimeRate: parsedPayroll.overtimeRate
                ? parseFloat(parsedPayroll.overtimeRate)
                : null,
            },
          },

          privileges: {
            create: parsedPrivileges.map((p) => {
              const mod = typeof p === "string" ? p : p.module;
              const canRead = typeof p === "string" ? true : (p.canRead ?? true);
              const canCreate = typeof p === "string" ? false : (p.canCreate || false);
              const canUpdate = typeof p === "string" ? false : (p.canUpdate || false);
              const canDelete = typeof p === "string" ? false : (p.canDelete || false);
              const ownTeamOnly = typeof p === "string" ? false : (p.ownTeamOnly || false);
              return {
                module: mod.toUpperCase(),
                canRead,
                canCreate,
                canUpdate,
                canDelete,
                ownTeamOnly,
              };
            }),
          },
        },
        include: {
          appRole: true,
          jobInfo: true,
          payroll: true,
          privileges: true,
        },
      });
    });

    // 🚀 Auto-Push User to Active Hikvision Devices
    const bioIdToPush = employee.biometricId || employee.employeeId;
    if (bioIdToPush) {
      try {
        const { pushUserToHikvision } = require("../devices/hikvision.service");
        const activeDevices = await prisma.biometricDevice.findMany({
          where: { brand: "HIKVISION", deletedAt: null },
        });
        activeDevices.forEach((device) => {
          pushUserToHikvision(device, {
            biometricId: bioIdToPush,
            name: `${employee.firstName} ${employee.lastName}`,
          }).catch((e) => console.error("Background Auto Push Error:", e));
        });
      } catch (err) {
        console.error("Auto Push User Error:", err);
      }
    }

    return res.status(201).json({
      success: true,
      data: employee,
    });

  } catch (error) {
    console.error("Create Employee Error:", error);

    // 🔥 Prisma Unique Constraint Catch
    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: `Duplicate value for: ${error.meta.target.join(", ")}`,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create employee",
    });
  }
};



//////////////////////////////////////////////////////
// UPDATE EMPLOYEE
//////////////////////////////////////////////////////

exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const parseField = (val) => {
      if (!val) return {};
      if (typeof val === "object") return val;
      try {
        return JSON.parse(val);
      } catch (e) {
        return {};
      }
    };

    const parsedPersonal = parseField(req.body.personal);
    const parsedPayroll = parseField(req.body.payroll);
    const parsedPrivileges = Array.isArray(req.body.privileges)
      ? req.body.privileges
      : parseField(req.body.privileges);
    const parsedJobRaw = parseField(req.body.job);

    const companyId = parsedPersonal.companyId || req.body.companyId || req.body.locationId;
    const departmentId = parsedPersonal.departmentId || req.body.departmentId;
    const entityId = parsedPersonal.entityId !== undefined ? parsedPersonal.entityId : req.body.entityId;
    const supervisorId = parsedPersonal.supervisorId || req.body.supervisorId;
    const hiringDate = parsedJobRaw.hiringDate || req.body.hiringDate;
    const joiningDate = parsedJobRaw.joiningDate || req.body.joiningDate;
    const employmentStatus = parsedJobRaw.employmentStatus || req.body.employmentStatus;
    const workMode = parsedJobRaw.workMode || req.body.workMode;

    const updateData = {};

    if (parsedPersonal.firstName || req.body.firstName) updateData.firstName = parsedPersonal.firstName || req.body.firstName;
    if (parsedPersonal.lastName || req.body.lastName) updateData.lastName = parsedPersonal.lastName || req.body.lastName;
    if (parsedPersonal.username || req.body.username) updateData.username = parsedPersonal.username || req.body.username;
    if (parsedPersonal.email || req.body.email) updateData.email = parsedPersonal.email || req.body.email;
    if (parsedPersonal.role || req.body.role) {
      const rawRole = String(parsedPersonal.role || req.body.role).toUpperCase();
      if (["ADMIN", "SUPERVISOR", "USER"].includes(rawRole)) {
        updateData.role = rawRole;
      }
    }
    if (parsedPersonal.phoneNumber || req.body.phoneNumber) updateData.phoneNumber = parsedPersonal.phoneNumber || req.body.phoneNumber;
    if (parsedPersonal.nationalId || req.body.nationalId) updateData.nationalId = parsedPersonal.nationalId || req.body.nationalId;
    if (parsedPersonal.gender !== undefined || req.body.gender !== undefined) updateData.gender = parsedPersonal.gender || req.body.gender || null;
    if (parsedPersonal.age !== undefined || req.body.age !== undefined) updateData.age = (parsedPersonal.age || req.body.age) ? parseInt(parsedPersonal.age || req.body.age) : null;
    if (parsedPersonal.qualification !== undefined || req.body.qualification !== undefined) updateData.qualification = parsedPersonal.qualification || req.body.qualification || null;
    if (parsedPersonal.maritalStatus !== undefined || req.body.maritalStatus !== undefined) updateData.maritalStatus = parsedPersonal.maritalStatus || req.body.maritalStatus || null;
    if (parsedPersonal.religion !== undefined || req.body.religion !== undefined) updateData.religion = parsedPersonal.religion || req.body.religion || null;
    if (parsedPersonal.employeeId || req.body.employeeId) updateData.employeeId = parsedPersonal.employeeId || req.body.employeeId;
    if (parsedPersonal.biometricId || req.body.biometricId) updateData.biometricId = parsedPersonal.biometricId || req.body.biometricId;
    if (parsedPersonal.pin || req.body.pin) updateData.pin = parsedPersonal.pin || req.body.pin;
    
    const passwordToUpdate = parsedPersonal.password || req.body.password;
    if (passwordToUpdate) {
      updateData.password = await bcrypt.hash(passwordToUpdate, 10);
    }

    if (companyId) updateData.companyId = parseInt(companyId);
    if (departmentId !== undefined) updateData.departmentId = departmentId ? parseInt(departmentId) : null;
    if (entityId !== undefined) updateData.entityId = entityId ? parseInt(entityId) : null;
    if (parsedPersonal.roleId !== undefined || req.body.roleId !== undefined) {
      const rId = parsedPersonal.roleId !== undefined ? parsedPersonal.roleId : req.body.roleId;
      updateData.roleId = rId ? parseInt(rId) : null;
    }
    if (supervisorId !== undefined) updateData.supervisorId = supervisorId ? parseInt(supervisorId) : null;

    if (req.file) {
      updateData.profileImage = `/uploads/${req.file.filename}`;
    }

    if (hiringDate || joiningDate || employmentStatus || workMode) {
      const jobData = {
        ...(hiringDate && { hiringDate: new Date(hiringDate) }),
        ...(joiningDate && { joiningDate: new Date(joiningDate) }),
        ...(employmentStatus && { employmentStatus }),
        ...(workMode && { workMode }),
      };
      updateData.jobInfo = {
        upsert: {
          update: jobData,
          create: jobData,
        },
      };
    }

    const rawPayroll = parseField(req.body.payroll) || {};
    const payrollPayload = {
      ...(rawPayroll.currency || req.body.currency ? { currency: rawPayroll.currency || req.body.currency } : {}),
      ...((rawPayroll.payoutType || rawPayroll.rateType || req.body.payoutType || req.body.rateType) ? { payoutType: String(rawPayroll.payoutType || rawPayroll.rateType || req.body.payoutType || req.body.rateType) } : {}),
      ...((rawPayroll.rate !== undefined || req.body.rate !== undefined) ? { rate: parseFloat(rawPayroll.rate ?? req.body.rate ?? 0) } : {}),
      ...((rawPayroll.overtimeRate !== undefined || req.body.overtimeRate !== undefined) ? { overtimeRate: parseFloat(rawPayroll.overtimeRate ?? req.body.overtimeRate ?? 0) } : {}),
      ...((rawPayroll.cycleDate !== undefined || req.body.cycleDate !== undefined) ? { cycleDate: parseInt(rawPayroll.cycleDate ?? req.body.cycleDate ?? 1) } : {}),
      ...((rawPayroll.annualLeaves !== undefined || req.body.annualLeaves !== undefined) ? { annualLeaves: parseInt(rawPayroll.annualLeaves ?? req.body.annualLeaves ?? 0) } : {}),
      ...((rawPayroll.casualLeaves !== undefined || req.body.casualLeaves !== undefined) ? { casualLeaves: parseInt(rawPayroll.casualLeaves ?? req.body.casualLeaves ?? 0) } : {}),
      ...((rawPayroll.suddenLeaves !== undefined || req.body.suddenLeaves !== undefined) ? { suddenLeaves: parseInt(rawPayroll.suddenLeaves ?? req.body.suddenLeaves ?? 0) } : {}),
      ...((rawPayroll.monthlyLeaves !== undefined || req.body.monthlyLeaves !== undefined) ? { monthlyLeaves: parseInt(rawPayroll.monthlyLeaves ?? req.body.monthlyLeaves ?? 0) } : {}),
    };

    if (Object.keys(payrollPayload).length > 0) {
      const createData = {
        currency: payrollPayload.currency || "PKR",
        payoutType: payrollPayload.payoutType || "monthly",
        rate: payrollPayload.rate || 0,
        cycleDate: payrollPayload.cycleDate || 1,
        overtimeRate: payrollPayload.overtimeRate || 0,
        annualLeaves: payrollPayload.annualLeaves ?? 17,
        casualLeaves: payrollPayload.casualLeaves ?? 10,
        suddenLeaves: payrollPayload.suddenLeaves ?? 12,
        monthlyLeaves: payrollPayload.monthlyLeaves ?? 3,
      };

      updateData.payroll = {
        upsert: {
          update: payrollPayload,
          create: createData,
        },
      };
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        company: true,
        department: true,
        supervisor: true,
        appRole: true,
        jobInfo: true,
        payroll: true,
        privileges: true,
      },
    });

    let privilegesToApply = Array.isArray(parsedPrivileges) ? parsedPrivileges : null;
    if ((!privilegesToApply || privilegesToApply.length === 0) && updateData.roleId) {
      const appRole = await prisma.appRole.findFirst({
        where: { id: updateData.roleId, organizationId: req.user.orgId, deletedAt: null },
      });
      if (appRole && appRole.privileges) {
        privilegesToApply = typeof appRole.privileges === "string" ? JSON.parse(appRole.privileges) : appRole.privileges;
      }
    }

    if (Array.isArray(privilegesToApply)) {
      await prisma.employeePrivilege.deleteMany({
        where: { employeeId: parseInt(id) },
      });
      if (privilegesToApply.length > 0) {
        await prisma.employeePrivilege.createMany({
          data: privilegesToApply.map((p) => {
            const mod = typeof p === "string" ? p : p.module;
            const canRead = typeof p === "string" ? true : (p.canRead ?? true);
            const canCreate = typeof p === "string" ? false : (p.canCreate || false);
            const canUpdate = typeof p === "string" ? false : (p.canUpdate || false);
            const canDelete = typeof p === "string" ? false : (p.canDelete || false);
            const ownTeamOnly = typeof p === "string" ? false : (p.ownTeamOnly || false);
            return {
              employeeId: parseInt(id),
              module: mod.toUpperCase(),
              canRead,
              canCreate,
              canUpdate,
              canDelete,
              ownTeamOnly
            };
          }),
        });
      }
    }


    return res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: updatedEmployee,
    });
  } catch (error) {
    console.error("Update Employee Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update employee",
    });
  }
};

  

//////////////////////////////////////////////////////
// SET PIN
//////////////////////////////////////////////////////

exports.setPin = async (req, res) => {
  try {
    const { id } = req.params;
    const { pin } = req.body;

    if (!pin || pin.length !== 4) {
      return res
        .status(400)
        .json({ success: false, message: "PIN must be 4 digits" });
    }

    await prisma.employee.update({
      where: { id: parseInt(id) },
      data: { pin },
    });

    res.json({ success: true, message: "PIN updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

//////////////////////////////////////////////////////
// GET SUPERVISORS BY LOCATION
//////////////////////////////////////////////////////

exports.getSupervisorsByLocation = async (req, res) => {
  try {
    const { companyId } = req.query;

    const supervisors = await prisma.employee.findMany({
      where: {
        companyId: parseInt(companyId),
        role: "SUPERVISOR",
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    res.json({ success: true, data: supervisors });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

//////////////////////////////////////////////////////
// DELETE (SOFT DELETE)
//////////////////////////////////////////////////////

exports.deleteEmployee = async (req, res) => {
    try {
      const { id } = req.params;
      const orgId = req.user.orgId;
  
      const employee = await prisma.employee.findFirst({
        where: {
          id: parseInt(id),
          organizationId: orgId,
          deletedAt: null,
        },
      });
  
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Employee not found",
        });
      }
  
      await prisma.employee.update({
        where: { id: parseInt(id) },
        data: {
          deletedAt: new Date(),
        },
      });
  
      res.json({
        success: true,
        message: "Employee deleted successfully",
      });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Delete failed",
      });
    }
  };
  
  exports.getActiveEmployees = async (req, res) => {
    try {
      const orgId = req.user.orgId;
  
      const employees = await prisma.employee.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
          NOT: { role: "ADMIN" },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
        orderBy: { firstName: "asc" },
      });
  
      res.json({ success: true, data: employees });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false });
    }
  };
  
  //////////////////////////////////////////////////////
// GET SINGLE EMPLOYEE DETAIL
//////////////////////////////////////////////////////

exports.getEmployeeDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user.orgId;

    const employee = await prisma.employee.findFirst({
      where: {
        id: parseInt(id),
        organizationId: orgId,
        deletedAt: null,
      },
      include: {
        company: true,
        department: true,
        appRole: true,
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        jobInfo: true,
        payroll: true,
        privileges: true,
        increments: {
          orderBy: { effectiveDate: "desc" },
        },
        leaveRequests: {
          include: { leaveType: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        overtimes: {
          orderBy: { date: "desc" },
          take: 20,
        },
        Schedule: {
          where: { deletedAt: null },
        },
      },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    return res.json({
      success: true,
      data: employee,
    });

  } catch (error) {
    console.error("Get Employee Detail Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch employee detail",
    });
  }
};


exports.updateOrganizationProfile = async (req, res) => {
  try {
    const orgId = req.user.orgId; // 🔥 from logged in user

    const {
      name,
      phone,
      email,
      emergencyContact,
      address,
      totalEmployees,
      category,
      subscriptionPlan,
      timeZone,

    } = req.body;
    

    const updatedOrganization = await prisma.organization.update({
      where: {
        id: orgId,
      },
      data: {
        name,
        phone,
        email,
        emergencyContact,
        address,
        totalEmployees: totalEmployees
          ? parseInt(totalEmployees)
          : 0,
        category,
        subscriptionPlan,
        orgTimeZone:timeZone || undefined
      },
    });

    return res.status(200).json({
      success: true,
      message: "Organization profile updated successfully",
      data: updatedOrganization,
    });

  } catch (error) {
    console.error("Organization Update Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update organization profile",
    });
  }
};
exports.getOrganizationProfile = async (req, res) => {
  try {
    const userId = req.user?.id; // coming from auth middleware

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 🔹 Get user's organization (adjust relation if needed)
    const employee = await prisma.employee.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
      include: {
        organization: true,
      },
    });

    if (!employee || !employee.organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const org = employee.organization;

    return res.status(200).json({
      id: org.id,
      name: org.name,
      phone: org.phone,
      email: org.email,
      emergencyContact: org.emergencyContact,
      address: org.address,
      totalEmployees: org.totalEmployees,
      category: org.category,
      subscriptionPackage: org.subscriptionPackage,
      createdAt: org.createdAt,
    });

  } catch (error) {
    console.error("Get Organization Error:", error);
    return res.status(500).json({
      message: "Failed to fetch organization profile",
    });
  }
};


exports.registerOrganization = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      emergencyContact,
      address,
      totalEmployees,
      category,
      
    } = req.body;

    // 🔹 Basic Validation
    if (!name || !email || !phone) {
      return res.status(400).json({
        message: "Name, email and phone are required",
      });
    }

    // 🔹 Check if email already used
    const existingOrg = await prisma.organization.findFirst({
      where: {
        email: email,
        deletedAt: null,
      },
    });

    if (existingOrg) {
      return res.status(400).json({
        message: "Organization with this email already exists",
      });
    }

    // 🔹 Create Organization
    const organization = await prisma.organization.create({
      data: {
        name,
        phone,
        email,
        emergencyContact,
        address,
        totalEmployees: totalEmployees
          ? Number(totalEmployees)
          : null,
        category,
        subscriptionPackage: "BASIC", // default plan
        status: "PENDING", // waiting for admin approval
      },
    });

    return res.status(201).json({
      message:
        "Organization registered successfully. After verification, credentials will be sent via email.",
      data: {
        id: organization.id,
        name: organization.name,
        status: organization.status,
      },
    });

  } catch (error) {
    console.error("Register Organization Error:", error);
    return res.status(500).json({
      message: "Failed to register organization",
    });
  }
};

exports.addIncrement = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, value, effectiveDate } = req.body;

    const employeeId = parseInt(id);
    if (isNaN(employeeId)) {
      return res.status(400).json({ success: false, message: "Invalid employee ID" });
    }

    // Fetch current payroll info
    const payroll = await prisma.employeePayroll.findUnique({
      where: { employeeId },
    });

    if (!payroll) {
      return res.status(404).json({ success: false, message: "Employee payroll record not found" });
    }

    const previousSalary = payroll.rate;
    let newSalary = previousSalary;

    const mappedType = type === "amount" ? "flat" : type;

    if (mappedType === "percentage") {
      newSalary = previousSalary + (previousSalary * (Number(value) / 100));
    } else if (mappedType === "flat") {
      newSalary = previousSalary + Number(value);
    } else {
      return res.status(400).json({ success: false, message: "Invalid increment type" });
    }

    // Perform transaction: create increment record and update payroll rate
    const result = await prisma.$transaction([
      prisma.employeeIncrement.create({
        data: {
          employeeId,
          type: mappedType,
          value: Number(value),
          previousSalary,
          newSalary,
          effectiveDate: new Date(effectiveDate),
        },
      }),
      prisma.employeePayroll.update({
        where: { employeeId },
        data: {
          rate: newSalary,
        },
      }),
    ]);

    return res.json({
      success: true,
      message: "Increment applied successfully",
      data: result[0],
    });
  } catch (error) {
    console.error("Add Increment Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to apply increment",
      error: error.message,
    });
  }
};

/**
 * Bulk Import Employees / Supervisors via Excel file / CSV / JSON list
 */
exports.importSupervisors = async (req, res) => {
  return exports.importEmployees(req, res);
};

exports.importEmployees = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { pushUserToHikvision, fetchHikvisionUsers } = require("../devices/hikvision.service");
    const ExcelJS = require("exceljs");
    const fs = require("fs");

    // Target role (default USER, or SUPERVISOR if passed in body)
    const targetRole = (req.body.role && ["ADMIN", "SUPERVISOR", "USER"].includes(String(req.body.role).toUpperCase()))
      ? String(req.body.role).toUpperCase()
      : (req.path.includes("supervisor") ? "SUPERVISOR" : "USER");

    let employeeList = [];

    const isHeaderKeyword = (str) => {
      const s = String(str).toLowerCase().trim();
      return (
        s.includes("sup name") ||
        s.includes("supervisor") ||
        s.includes("emp name") ||
        s.includes("employee name") ||
        s.includes("full name") ||
        s.includes("staff name") ||
        s === "employee" ||
        s === "name" ||
        s === "users" ||
        s === "user" ||
        s === "sn" ||
        s === "sr" ||
        s === "id" ||
        s === "no"
      );
    };

    // 1️⃣ Check if Excel or CSV file was uploaded
    if (req.file) {
      const filePath = req.file.path;
      const fileBuffer = req.file.buffer;

      try {
        const workbook = new ExcelJS.Workbook();

        if (fileBuffer) {
          await workbook.xlsx.load(fileBuffer);
        } else if (filePath && fs.existsSync(filePath)) {
          try {
            await workbook.xlsx.readFile(filePath);
          } catch (xlsxErr) {
            try {
              await workbook.csv.readFile(filePath);
            } catch (csvErr) {
              const text = fs.readFileSync(filePath, "utf8");
              text.split(/\r?\n/).forEach((line) => {
                const clean = line.replace(/["';,]/g, " ").trim();
                if (clean && clean.length > 2 && !isHeaderKeyword(clean)) {
                  employeeList.push(clean);
                }
              });
            }
          }
        }

        if (workbook.worksheets && workbook.worksheets.length > 0) {
          workbook.worksheets.forEach((worksheet) => {
            let targetColIndex = null;

            // Step 1: Search for header row containing Name / Employee / Supervisor
            worksheet.eachRow((row) => {
              if (targetColIndex !== null) return;
              row.values.forEach((val, colIdx) => {
                if (!val) return;
                const str = String(typeof val === "object" ? val.result || val.text || val.value || "" : val).toLowerCase().trim();
                if (
                  str.includes("sup name") ||
                  str.includes("supervisor") ||
                  str.includes("emp name") ||
                  str.includes("employee name") ||
                  str.includes("full name") ||
                  str.includes("staff name") ||
                  str === "name" ||
                  str === "employee"
                ) {
                  targetColIndex = colIdx;
                }
              });
            });

            // Step 2: Read values from target column (or all cells if no column matched)
            worksheet.eachRow((row) => {
              if (targetColIndex !== null) {
                const cellVal = row.getCell(targetColIndex).value;
                if (!cellVal) return;
                let str = String(typeof cellVal === "object" ? cellVal.result || cellVal.text || cellVal.value || "" : cellVal).trim();
                if (str && str.length > 2 && !isHeaderKeyword(str)) {
                  employeeList.push(str);
                }
              } else {
                row.values.forEach((val) => {
                  if (!val) return;
                  let str = String(typeof val === "object" ? val.result || val.text || val.value || "" : val).trim();
                  // Only accept valid human names (avoid dates, numbers, shifts)
                  if (
                    str &&
                    str.length > 2 &&
                    /^[A-Za-z\s\.\'-]+$/.test(str) &&
                    !isHeaderKeyword(str)
                  ) {
                    employeeList.push(str);
                  }
                });
              }
            });
          });
        }

      } catch (fileErr) {
        console.error("Error reading employee Excel file:", fileErr);
      } finally {
        if (filePath && fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch (e) {}
        }
      }
    }

    // 2️⃣ Check if names array was passed in JSON body
    const rawInput = req.body.employees || req.body.supervisors || req.body.names;
    if (rawInput) {
      const rawList = Array.isArray(rawInput)
        ? rawInput
        : typeof rawInput === "string"
        ? rawInput.split(/\n|,/)
        : [];

      rawList.forEach((name) => {
        const str = String(name).trim();
        if (str && str.length > 2 && !isHeaderKeyword(str)) {
          employeeList.push(str);
        }
      });
    }

    // Deduplicate employee list
    employeeList = Array.from(new Set(employeeList));

    if (employeeList.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid employee names found to import.",
      });
    }

    // Find default company & department for this org
    const defaultCompany = await prisma.company.findFirst({
      where: { organizationId: orgId, deletedAt: null },
    });
    const defaultDepartment = await prisma.department.findFirst({
      where: { organizationId: orgId, deletedAt: null },
    });

    if (!defaultCompany) {
      return res.status(400).json({
        success: false,
        message: "No active company found in organization. Please create a company first.",
      });
    }

    // Find active Hikvision devices and fetch current machine users for ID matching
    const activeHikvisionDevices = await prisma.biometricDevice.findMany({
      where: { brand: "HIKVISION", deletedAt: null },
    });

    let machineUserList = [];
    for (const dev of activeHikvisionDevices) {
      const mUsers = await fetchHikvisionUsers(dev);
      machineUserList = machineUserList.concat(mUsers);
    }
    console.log(`[Import Employees] Fetched ${machineUserList.length} user(s) from Hikvision machine for real-time matching.`);

    // Hash default password
    const hashedPassword = await bcrypt.hash("123456", 10);

    let createdCount = 0;
    let skippedCount = 0;
    const createdEmployees = [];

    // Find existing employees in DB for strict deduplication
    const existingEmployees = await prisma.employee.findMany({
      where: { organizationId: orgId },
      select: { username: true, email: true, employeeId: true, biometricId: true, firstName: true, lastName: true },
    });

    let lastNum = 100;
    existingEmployees.forEach((e) => {
      const num = parseInt(e.biometricId || e.employeeId);
      if (!isNaN(num) && num > lastNum) lastNum = num;
    });

    for (const fullName of employeeList) {
      const cleanFull = fullName.trim();
      const parts = cleanFull.split(/\s+/);
      const firstName = parts[0] || cleanFull;
      const lastName = parts.slice(1).join(" ") || "";

      const cleanFirst = firstName.toLowerCase().replace(/[^a-z0-9]/g, "");

      // 🔴 Strict Deduplication: Check if employee exact full name already exists in Frontpin DB
      const isDuplicate = existingEmployees.some((e) => {
        const existingFull = `${e.firstName || ''} ${e.lastName || ''}`.trim().toLowerCase();
        return existingFull === cleanFull.toLowerCase();
      });

      if (isDuplicate) {
        skippedCount++;
        continue;
      }

      // 🔍 Real-Time Machine Matching: Check if user already exists on physical Hikvision machine
      const matchedMachineUser = machineUserList.find((u) => {
        const mName = (u.name || "").trim().toLowerCase();
        return mName === cleanFull.toLowerCase() || (mName.length > 3 && mName === firstName.toLowerCase());
      });

      let empCode = "";
      let isAlreadyOnMachine = false;

      if (matchedMachineUser && matchedMachineUser.employeeNo) {
        empCode = String(matchedMachineUser.employeeNo).trim();
        isAlreadyOnMachine = true;
        console.log(`[Machine Match Success] Employee ${cleanFull} matched existing Machine Biometric ID: ${empCode}`);
      } else {
        lastNum++;
        empCode = String(lastNum).padStart(4, "0");
      }

      // 📧 Email format: name480@gmail.com (e.g. faraz480@gmail.com)
      let email = `${cleanFirst}480@gmail.com`;
      let emailCounter = 1;
      while (existingEmployees.some((e) => e.email?.toLowerCase() === email.toLowerCase())) {
        email = `${cleanFirst}${emailCounter}480@gmail.com`;
        emailCounter++;
      }

      // 🔑 Username format: name480 (e.g. faraz480)
      let username = `${cleanFirst}480`;
      let userCounter = 1;
      while (existingEmployees.some((e) => e.username?.toLowerCase() === username.toLowerCase())) {
        username = `${cleanFirst}${userCounter}480`;
        userCounter++;
      }

      const newEmp = await prisma.employee.create({
        data: {
          firstName,
          lastName,
          username,
          email,
          password: hashedPassword, // Hashed '123456'
          pin: "1234",               // PIN '1234'
          employeeId: empCode,
          biometricId: empCode,
          canLogin: true,
          role: targetRole,
          organizationId: orgId,
          companyId: defaultCompany.id,
          departmentId: defaultDepartment ? defaultDepartment.id : null,
          jobInfo: {
            create: {
              employmentStatus: "Full-Time",
              designation: targetRole === "SUPERVISOR" ? "Supervisor" : "Employee",
              hiringDate: new Date(),
              workMode: "On-Site",
            },
          },
          payroll: {
            create: {
              payoutType: "monthly",
              rate: 0,
              currency: "PKR",
              cycleDate: 1,
            },
          },
        },
        include: {
          company: true,
          department: true,
          jobInfo: true,
        },
      });

      createdCount++;
      createdEmployees.push(newEmp);
      existingEmployees.push({ username, email, firstName, lastName, biometricId: empCode, employeeId: empCode });

      // Auto-push to active Hikvision machines ONLY IF NOT ALREADY ON MACHINE
      if (!isAlreadyOnMachine) {
        for (const dev of activeHikvisionDevices) {
          pushUserToHikvision(dev, {
            biometricId: empCode,
            name: `${firstName} ${lastName}`.trim(),
          }).catch((e) => console.error("Auto Push Error during import:", e.message));
        }
      }
    }

    return res.json({
      success: true,
      message: `Imported ${createdCount} employee(s) successfully! (${skippedCount} existing skipped)`,
      createdCount,
      skippedCount,
      totalProcessed: employeeList.length,
      data: createdEmployees,
    });
  } catch (error) {
    console.error("Import Employees Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to import employees",
      error: error.message,
    });
  }
};

