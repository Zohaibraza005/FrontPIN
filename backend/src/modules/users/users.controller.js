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
        ...(companyId && { companyId: parseInt(companyId) }),
        ...(departmentId && { departmentId: parseInt(departmentId) }),
        ...(role && { role }),
      },
      include: {
        company: true,
        department: true,
        supervisor: true,
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
    const parsedPrivileges = privileges ? JSON.parse(privileges) : [];

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
          phoneNumber: parsedPersonal.phoneNumber || null,
          nationalId: parsedPersonal.nationalId || null,

          canLogin,

          profileImage: req.file
            ? `/uploads/${req.file.filename}`
            : null,

          role: parsedPersonal.role.toUpperCase(),

          organizationId: orgId,
          companyId: parseInt(parsedPersonal.companyId),
          departmentId: parsedPersonal.departmentId
            ? parseInt(parsedPersonal.departmentId)
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
            create: parsedPrivileges.map((p) => ({
              module: p.module,
              canCreate: p.canCreate || false,
              canRead: p.canRead ?? true,
              canUpdate: p.canUpdate || false,
              canDelete: p.canDelete || false,
              ownTeamOnly: p.ownTeamOnly || false,
            })),
          },
        },
        include: {
          jobInfo: true,
          payroll: true,
          privileges: true,
        },
      });
    });

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
    const supervisorId = parsedPersonal.supervisorId || req.body.supervisorId;
    const hiringDate = parsedJobRaw.hiringDate || req.body.hiringDate;
    const employmentStatus = parsedJobRaw.employmentStatus || req.body.employmentStatus;
    const workMode = parsedJobRaw.workMode || req.body.workMode;

    const updateData = {};

    if (parsedPersonal.firstName || req.body.firstName) updateData.firstName = parsedPersonal.firstName || req.body.firstName;
    if (parsedPersonal.lastName || req.body.lastName) updateData.lastName = parsedPersonal.lastName || req.body.lastName;
    if (parsedPersonal.username || req.body.username) updateData.username = parsedPersonal.username || req.body.username;
    if (parsedPersonal.email || req.body.email) updateData.email = parsedPersonal.email || req.body.email;
    if (parsedPersonal.role || req.body.role) updateData.role = (parsedPersonal.role || req.body.role).toUpperCase();

    if (companyId) updateData.companyId = parseInt(companyId);
    if (departmentId !== undefined) updateData.departmentId = departmentId ? parseInt(departmentId) : null;
    if (supervisorId !== undefined) updateData.supervisorId = supervisorId ? parseInt(supervisorId) : null;

    if (req.file) {
      updateData.profileImage = `/uploads/${req.file.filename}`;
    }

    if (hiringDate || employmentStatus || workMode) {
      const jobData = {
        ...(hiringDate && { hiringDate: new Date(hiringDate) }),
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

    if (Object.keys(parsedPayroll).length > 0) {
      updateData.payroll = {
        upsert: {
          update: parsedPayroll,
          create: parsedPayroll,
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
        jobInfo: true,
        payroll: true,
        privileges: true,
      },
    });

    if (Array.isArray(parsedPrivileges) && parsedPrivileges.length > 0) {
      await prisma.employeePrivilege.deleteMany({
        where: { employeeId: parseInt(id) },
      });
      await prisma.employeePrivilege.createMany({
        data: parsedPrivileges.map((p) => ({
          employeeId: parseInt(id),
          privilege: p,
        })),
      });
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
