const prisma = require("../../config/prisma");

//////////////////////////////////////////////////////
// CREATE SCHEDULE
//////////////////////////////////////////////////////

exports.createSchedule = async (req, res) => {
    try {
      const {
        scopeType,
        selectedIds,
        days,
        startTime,
        endTime,
        companyId,
        allowEarlyIn,
        earlyInMinutes,
        allowEarlyOut,
        earlyOutMinutes,
        overtimeAllowed,
        overtimeMinutes,
        allowHalfDay,
        allow_half_day,
        halfDayAllowed,
        half_day_allowed,
        halfDayMinutes,
        half_day_minutes,
        breaksAllowed,
        breakDurations,
        overwriteEmployeeIds = [] // 👈 NEW
      } = req.body;

      const isHalfDay = Boolean(allowHalfDay || allow_half_day || halfDayAllowed || half_day_allowed);
      const halfDayMins = isHalfDay ? (halfDayMinutes || half_day_minutes || 240) : null;
  
      const orgId = req.user.orgId;
  
      if (!selectedIds?.length || !days?.length || !startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields"
        });
      }
  
      //////////////////////////////////////////////////
      // GET TARGET EMPLOYEES
      //////////////////////////////////////////////////
  
      let employees = [];
  
      if (scopeType === "individual") {
        employees = await prisma.employee.findMany({
          where: {
            id: { in: selectedIds },
            organizationId: orgId,
            deletedAt: null,
            NOT: { role: "ADMIN" }
          }
        });
      }
  
      if (scopeType === "department") {
        employees = await prisma.employee.findMany({
          where: {
            departmentId: { in: selectedIds },
            organizationId: orgId,
            deletedAt: null,
            NOT: { role: "ADMIN" }
          }
        });
      }
  
      if (scopeType === "location") {
        employees = await prisma.employee.findMany({
          where: {
            companyId: { in: selectedIds },
            organizationId: orgId,
            deletedAt: null,
            NOT: { role: "ADMIN" }
          }
        });
      }
  
      if (!employees.length) {
        return res.status(400).json({
          success: false,
          message: "No valid employee targets found. Schedules cannot be created for Super Admin accounts."
        });
      }
  
      //////////////////////////////////////////////////
      // CHECK EXISTING SCHEDULES
      //////////////////////////////////////////////////
  
      const employeeIds = employees.map(e => e.id);
  
      const existingSchedules = await prisma.schedule.findMany({
        where: {
          employeeId: { in: employeeIds },
          deletedAt: null
        },
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true }
          }
        }
      });
  
      const existingEmployeeIds = existingSchedules.map(s => s.employeeId);
  
      //////////////////////////////////////////////////
      // IF EXISTING AND NO OVERWRITE → RETURN CONFLICT
      //////////////////////////////////////////////////
  
      if (existingEmployeeIds.length && overwriteEmployeeIds.length === 0) {
        return res.status(409).json({
          success: false,
          overwriteRequired: true,
          message: "Some employees already have schedules",
          conflictingEmployees: existingSchedules.map(s => ({
            id: s.employee.id,
            name: `${s.employee.firstName} ${s.employee.lastName}`
          }))
        });
      }
  
      //////////////////////////////////////////////////
      // OVERWRITE LOGIC
      //////////////////////////////////////////////////
  
      if (overwriteEmployeeIds.length) {
        await prisma.schedule.updateMany({
          where: {
            employeeId: { in: overwriteEmployeeIds },
            deletedAt: null
          },
          data: {
            deletedAt: new Date()
          }
        });
      }
  
      //////////////////////////////////////////////////
      // CREATE SCHEDULE
      //////////////////////////////////////////////////
  
      const schedules = await prisma.$transaction(
        employees.map(emp =>
          prisma.schedule.create({
            data: {
              employeeId: emp.id,
              days,
              startTime,
              endTime,
              companyId: companyId ? Number(companyId) : null,
              allowEarlyIn: allowEarlyIn || false,
              earlyInMinutes: allowEarlyIn ? earlyInMinutes : null,
              allowEarlyOut: allowEarlyOut || false,
              earlyOutMinutes: allowEarlyOut ? earlyOutMinutes : null,
              overtimeAllowed: overtimeAllowed || false,
              overtimeMinutes: overtimeAllowed ? overtimeMinutes : null,
              allowHalfDay: isHalfDay,
              halfDayMinutes: halfDayMins,
              breaksAllowed: breaksAllowed || false,
              breakDurations: breaksAllowed ? breakDurations : []
            }
          })
        )
      );
  
      return res.json({
        success: true,
        message: "Schedule created successfully",
        data: schedules
      });
  
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false });
    }
  };
  

//////////////////////////////////////////////////////
// GET SCHEDULES
//////////////////////////////////////////////////////

exports.getSchedules = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const role = req.user.role;
    const userId = req.user.id;

    // Build where clause based on role
    const whereClause = {
      deletedAt: null,
      employee: {
        organizationId: orgId,
        NOT: { role: "ADMIN" }
      }
    };

    // Non-admin users (Agent / USER) only see their own schedule
    if (role === "USER" || role === "user") {
      whereClause.employeeId = userId;
    } else if (role === "SUPERVISOR" || role === "supervisor") {
      whereClause.employee = {
        organizationId: orgId,
        deletedAt: null,
        NOT: { role: "ADMIN" },
        OR: [
          { id: userId },
          { supervisorId: userId }
        ]
      };
    }

    const schedules = await prisma.schedule.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            companyId: true,
            company: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        company: true
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({
      success: true,
      data: schedules
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

//////////////////////////////////////////////////////
// UPDATE SCHEDULE
//////////////////////////////////////////////////////

exports.updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      days,
      startTime,
      endTime,
      companyId,
      allowEarlyIn,
      earlyInMinutes,
      allowEarlyOut,
      earlyOutMinutes,
      overtimeAllowed,
      overtimeMinutes,
      allowHalfDay,
      allow_half_day,
      halfDayAllowed,
      half_day_allowed,
      halfDayMinutes,
      half_day_minutes,
      breaksAllowed,
      breakDurations
    } = req.body;

    const isHalfDayEdit = Boolean(allowHalfDay || allow_half_day || halfDayAllowed || half_day_allowed);
    const halfDayMinsEdit = isHalfDayEdit ? (halfDayMinutes || half_day_minutes || 240) : null;

    const updated = await prisma.schedule.update({
      where: { id: Number(id) },
      data: {
        days,
        startTime,
        endTime,
        companyId: companyId ? Number(companyId) : null,
        allowEarlyIn,
        earlyInMinutes: allowEarlyIn ? earlyInMinutes : null,
        allowEarlyOut,
        earlyOutMinutes: allowEarlyOut ? earlyOutMinutes : null,
        overtimeAllowed,
        overtimeMinutes: overtimeAllowed ? overtimeMinutes : null,
        allowHalfDay: isHalfDayEdit,
        halfDayMinutes: halfDayMinsEdit,
        breaksAllowed,
        breakDurations: breaksAllowed ? breakDurations : []
      }
    });

    res.json({
      success: true,
      data: updated
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

//////////////////////////////////////////////////////
// DELETE SCHEDULE (SOFT DELETE)
//////////////////////////////////////////////////////

exports.deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.schedule.update({
      where: { id: Number(id) },
      data: { deletedAt: new Date() }
    });

    res.json({ success: true });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};
