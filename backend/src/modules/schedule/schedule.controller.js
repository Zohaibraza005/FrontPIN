const prisma = require("../../config/prisma");
const moment = require("moment-timezone");

function getScheduleShiftForDay(schedule, date, timezone = null) {
  let startTime = schedule?.startTime || "09:00";
  let endTime = schedule?.endTime || "18:00";

  if (!schedule || !schedule.days || !Array.isArray(schedule.days)) {
    return { startTime, endTime };
  }

  let mDate;
  if (typeof date === "string") {
    const cleanStr = date.slice(0, 10);
    mDate = timezone ? moment.tz(cleanStr, "YYYY-MM-DD", timezone) : moment(cleanStr, "YYYY-MM-DD");
  } else if (moment.isMoment(date)) {
    mDate = timezone ? date.clone().tz(timezone) : date;
  } else if (date instanceof Date) {
    mDate = timezone ? moment(date).tz(timezone) : moment(date);
  } else {
    mDate = timezone ? moment().tz(timezone) : moment();
  }

  const shortDay = mDate.format("ddd").toLowerCase();
  const fullDay = mDate.format("dddd").toLowerCase();

  const dayObj = schedule.days.find((d) => {
    if (typeof d === "object" && d !== null) {
      const name = String(d.day || d.dayFull || d.name || d.short || "").trim().toLowerCase();
      return name === shortDay || name === fullDay;
    }
    return false;
  });

  if (dayObj && typeof dayObj === "object") {
    if (dayObj.startTime) startTime = dayObj.startTime;
    if (dayObj.endTime) endTime = dayObj.endTime;
  }

  return { startTime, endTime };
}

async function syncEmployeeRecentAttendances(employeeId, updatedSchedule) {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: Number(employeeId) },
      include: { company: true },
    });
    if (!employee) return;
    const timezone = employee.company?.timezone || "Asia/Karachi";

    // Recent attendances within 7 days
    const recentLimit = moment().tz(timezone).subtract(7, "days").startOf("day").toDate();
    const attendances = await prisma.attendance.findMany({
      where: {
        employeeId: Number(employeeId),
        date: { gte: recentLimit },
        checkInTime: { not: null },
      },
    });

    for (const att of attendances) {
      const attDateStr = moment(att.checkInTime || att.date).tz(timezone).format("YYYY-MM-DD");
      const dayShift = getScheduleShiftForDay(updatedSchedule, attDateStr, timezone);
      const sTime = dayShift.startTime || updatedSchedule.startTime || "09:00";
      const eTime = dayShift.endTime || updatedSchedule.endTime || "18:00";
      const graceMinutes = updatedSchedule.allowEarlyIn ? (Number(updatedSchedule.earlyInMinutes) || 0) : 0;
      const allowedEarlyOutMins = updatedSchedule.allowEarlyOut ? (Number(updatedSchedule.earlyOutMinutes) || 0) : 0;

      const checkInLocal = moment(att.checkInTime).tz(timezone);
      const shiftStartLocal = moment.tz(`${attDateStr} ${sTime}`, "YYYY-MM-DD HH:mm", timezone);
      const lateThreshold = shiftStartLocal.clone().add(graceMinutes, "minutes");

      let isLate = false;
      let lateMinutes = 0;
      let status = att.status;

      if (checkInLocal.isAfter(lateThreshold)) {
        isLate = true;
        lateMinutes = checkInLocal.diff(shiftStartLocal, "minutes");
        status = "TARDY";
      } else {
        isLate = false;
        lateMinutes = 0;
        if (status === "TARDY" || status === "LATE" || status === "PRESENT" || !status) {
          status = "PRESENT";
        }
      }

      let isEarlyOut = false;
      let earlyOutMinutes = 0;
      if (att.checkOutTime) {
        const checkOutLocal = moment(att.checkOutTime).tz(timezone);
        let shiftEndLocal = moment.tz(`${attDateStr} ${eTime}`, "YYYY-MM-DD HH:mm", timezone);
        if (shiftEndLocal.isBefore(shiftStartLocal)) shiftEndLocal.add(1, "day");
        const earlyOutThreshold = shiftEndLocal.clone().subtract(allowedEarlyOutMins, "minutes");
        if (checkOutLocal.isBefore(earlyOutThreshold) && checkOutLocal.isAfter(shiftStartLocal)) {
          earlyOutMinutes = Math.max(0, shiftEndLocal.diff(checkOutLocal, "minutes"));
          if (earlyOutMinutes > 0) isEarlyOut = true;
        }
      }

      await prisma.attendance.update({
        where: { id: att.id },
        data: {
          shiftStartTime: sTime,
          shiftEndTime: eTime,
          isLate,
          lateMinutes,
          isEarlyOut,
          earlyOutMinutes,
          status,
        },
      });
    }
  } catch (err) {
    console.error(`[Schedule Sync Attendance Error for Emp ${employeeId}]:`, err.message);
  }
}

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
  
      const existingEmployeeIds = [...new Set(existingSchedules.map(s => s.employeeId))];
  
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
      // DETERMINE TARGET EMPLOYEES & OVERWRITE
      //////////////////////////////////////////////////
  
      // Only create/update schedules for employees that don't have one, or were explicitly confirmed for overwrite
      const targetEmployees = employees.filter(emp =>
        !existingEmployeeIds.includes(emp.id) || overwriteEmployeeIds.includes(emp.id)
      );

      if (!targetEmployees.length) {
        return res.json({
          success: true,
          message: "No schedules to update",
          data: []
        });
      }

      // Soft-delete any existing active schedules for target employees so each employee has strictly ONE active schedule
      await prisma.schedule.updateMany({
        where: {
          employeeId: { in: targetEmployees.map(e => e.id) },
          deletedAt: null
        },
        data: {
          deletedAt: new Date()
        }
      });
  
      //////////////////////////////////////////////////
      // CREATE SCHEDULE
      //////////////////////////////////////////////////
  
      const schedules = await prisma.$transaction(
        targetEmployees.map(emp =>
          prisma.schedule.create({
            data: {
              employeeId: emp.id,
              days,
              startTime,
              endTime,
              companyId: companyId ? Number(companyId) : (scopeType === 'location' && selectedIds?.[0] ? Number(selectedIds[0]) : (emp.companyId || null)),
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
            },
            include: {
              employee: {
                select: {
                  id: true,
                  employeeId: true,
                  biometricId: true,
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
            }
          })
        )
      );
  
      // Recalculate attendance for affected employees in real-time
      for (const s of schedules) {
        if (s.employeeId) {
          syncEmployeeRecentAttendances(s.employeeId, s).catch(() => {});
        }
      }

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
            employeeId: true,
            biometricId: true,
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

    // Deduplicate by employeeId: keep only the latest active schedule per employee
    const seenEmpIds = new Set();
    const uniqueSchedules = [];
    const duplicateScheduleIds = [];

    for (const sched of schedules) {
      const empId = sched.employeeId || sched.employee?.id;
      if (empId && !seenEmpIds.has(empId)) {
        seenEmpIds.add(empId);
        uniqueSchedules.push(sched);
      } else if (empId) {
        duplicateScheduleIds.push(sched.id);
      }
    }

    if (duplicateScheduleIds.length > 0) {
      prisma.schedule.updateMany({
        where: { id: { in: duplicateScheduleIds } },
        data: { deletedAt: new Date() }
      }).catch(err => console.error("Error auto-cleaning duplicate schedules:", err));
    }

    res.json({
      success: true,
      data: uniqueSchedules
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
        companyId: companyId !== undefined ? (companyId ? Number(companyId) : null) : undefined,
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
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            biometricId: true,
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
      }
    });

    if (updated.employeeId) {
      await syncEmployeeRecentAttendances(updated.employeeId, updated);
    }

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
