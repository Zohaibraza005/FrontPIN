const prisma = require("../../config/prisma");
const moment = require("moment-timezone");
const ExcelJS = require("exceljs");
const { calculateHourlyRate } = require("../overtime/overtime.controller");
const { getDayOverrides, resolveOverrideForEmployee } = require("../attendance/dayOverride.service");

/**
 * Shared helper to calculate working days, attendance, leaves, and absences.
 * - Respects employee active Schedule (or Mon-Fri default)
 * - Respects DayOverrides (Admin holidays or forced work days)
 * - Weekend / Off-days are NEVER counted as absent!
 * - Unmarked working days (missing biometric punch / no DB row and no leave) are correctly counted as ABSENT!
 */
function calculatePayrollAttendance({
  employee,
  periodStart,
  periodEnd,
  attendances,
  leaves,
  dayOverrides = []
}) {
  const activeSched = (employee.Schedule || []).find(s => !s.deletedAt) || employee.Schedule?.[0];
  const rawScheduleDays = activeSched?.days || [];
  const scheduleDays = Array.isArray(rawScheduleDays)
    ? rawScheduleDays
        .map(d => typeof d === "object" && d !== null ? (d.day || d.dayFull || d.name || d.short || "") : String(d || ""))
        .map(s => s.trim().toLowerCase())
        .filter(Boolean)
    : [];

  const tz = employee?.company?.timezone || "Asia/Karachi";
  const todayStr = moment().tz(tz).format("YYYY-MM-DD");

  let workingDays = 0;
  let presentDays = 0;
  let absentDays = 0;
  let paidLeaves = 0;
  let unpaidLeaves = 0;
  let lateDays = 0;

  let cursor = periodStart.clone().startOf("day");
  const endCursor = periodEnd.clone().startOf("day");

  while (cursor.isSameOrBefore(endCursor)) {
    const dateStr = cursor.format("YYYY-MM-DD");
    const isPastOrToday = dateStr <= todayStr;

    // 1. Resolve Day Override for this employee on this date
    const override = resolveOverrideForEmployee(employee, dateStr, dayOverrides);

    // 2. Check if this is a working day
    let isWorkingDay = false;
    if (override) {
      isWorkingDay = (override.type === "WORK_DAY");
    } else if (scheduleDays.length > 0) {
      const dShort = cursor.format("ddd").toLowerCase();
      const dFull = cursor.format("dddd").toLowerCase();
      isWorkingDay = scheduleDays.includes(dShort) || scheduleDays.includes(dFull);
    } else {
      const dow = cursor.day();
      isWorkingDay = (dow !== 0 && dow !== 6); // Monday to Friday default
    }

    // 3. Check for approved leave on this date
    const leave = leaves.find(l => {
      const start = moment(l.startDate).startOf("day");
      const end = moment(l.endDate).startOf("day");
      return cursor.isSameOrAfter(start) && cursor.isSameOrBefore(end);
    });

    // 4. Check for attendance record on this date
    const att = attendances.find(a => {
      if (!a.date && !a.checkInTime) return false;
      const attDate = a.date
        ? moment(a.date).tz(tz).format("YYYY-MM-DD")
        : moment(a.checkInTime).tz(tz).format("YYYY-MM-DD");
      return attDate === dateStr;
    });

    const isPresent = Boolean(att && (att.status === "PRESENT" || att.status === "HALF_DAY" || att.checkInTime));
    const isExplicitAbsent = Boolean(att && att.status === "ABSENT");

    if (isWorkingDay) {
      workingDays++;

      if (leave) {
        if (leave.payType === "UNPAID") {
          unpaidLeaves++;
        } else {
          paidLeaves++;
        }
      } else if (isPresent) {
        presentDays++;
        if (att && att.isLate) lateDays++;
      } else if (isExplicitAbsent) {
        absentDays++;
      } else if (isPastOrToday) {
        // Scheduled working day, but no biometric punch, no attendance row, and no leave!
        // Unmarked attendance gap is correctly counted as ABSENT!
        absentDays++;
      } else {
        // Future scheduled working day -> do not penalize
      }
    } else {
      // Off-day / Weekend: NEVER count as absent!
      if (isPresent) {
        presentDays++;
        if (att && att.isLate) lateDays++;
      }
    }

    cursor.add(1, "day");
  }

  if (workingDays <= 0) {
    workingDays = Math.max(1, periodEnd.diff(periodStart, "days") + 1);
  }

  return {
    workingDays,
    presentDays,
    absentDays,
    paidLeaves,
    unpaidLeaves,
    leaveDays: paidLeaves + unpaidLeaves,
    lateDays
  };
}

exports.createPayroll = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only admin can generate payroll" });
    }

    const { employeeId, month, year, bonus = 0, deductions = 0 } = req.body;

    const employee = await prisma.employee.findUnique({
      where: { id: Number(employeeId), deletedAt: null },
      include: {
        payroll: true,
        jobInfo: true,
        company: true,
        department: true,
        Schedule: { where: { deletedAt: null } }
      }
    });

    if (!employee || !employee.payroll) {
      return res.status(404).json({ message: "Employee payroll settings not found" });
    }

    const { payoutType, rate, currency, cycleDate: rawCycleDate } = employee.payroll;
    const cycleDate = Number(rawCycleDate) || 1;

    // 🔹 Calculate Payroll Period
    let periodStart, periodEnd;
    if (cycleDate <= 1) {
      periodStart = moment({ year: Number(year), month: Number(month) - 1 }).startOf("month");
      periodEnd = moment({ year: Number(year), month: Number(month) - 1 }).endOf("month");
    } else {
      periodEnd = moment({ year: Number(year), month: Number(month) - 1 }).date(cycleDate - 1).endOf("day");
      periodStart = periodEnd.clone().subtract(1, "month").add(1, "day").startOf("day");
    }

    // 🔹 Hiring Date Adjustment
    if (employee.jobInfo?.hiringDate) {
      const hiringDate = moment(employee.jobInfo.hiringDate);
      if (hiringDate.isAfter(periodEnd)) {
        return res.status(400).json({ message: "Employee hired after payroll period" });
      }
      if (hiringDate.isAfter(periodStart) && hiringDate.isSameOrBefore(periodEnd)) {
        periodStart = hiringDate.clone().startOf("day");
      }
    }

    // 🔥 Prevent Duplicate Payroll
    const existingPayroll = await prisma.payroll.findFirst({
      where: {
        employeeId: Number(employeeId),
        deletedAt: null,
        OR: [
          {
            periodStart: periodStart.toDate(),
            periodEnd: periodEnd.toDate()
          },
          {
            periodStart: {
              gte: periodStart.clone().startOf("day").toDate(),
              lte: periodStart.clone().endOf("day").toDate()
            }
          }
        ]
      }
    });

    if (existingPayroll) {
      return res.status(400).json({
        message: "Payroll already generated for this period"
      });
    }

    // 🔹 Attendance
    const attendances = await prisma.attendance.findMany({
      where: {
        employeeId: Number(employeeId),
        date: { gte: periodStart.toDate(), lte: periodEnd.toDate() },
        deletedAt: null
      }
    });

    // 🔹 Leaves
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        employeeId: Number(employeeId),
        status: "APPROVED",
        startDate: { lte: periodEnd.toDate() },
        endDate: { gte: periodStart.toDate() }
      }
    });

    // 🔹 Overtime
    const overtimes = await prisma.overtime.findMany({
      where: {
        employeeId: Number(employeeId),
        status: "APPROVED",
        date: { gte: periodStart.toDate(), lte: periodEnd.toDate() }
      }
    });

    const hourlyRate = calculateHourlyRate(employee.payroll, employee.Schedule);
    const overtimeHours = overtimes.reduce((sum, o) => sum + (Number(o.hours) || 0), 0);
    const overtimeAmount = overtimes.reduce(
      (sum, o) => {
        if (o.amount !== undefined && o.amount !== null && Number(o.amount) > 0) {
          return sum + Number(o.amount);
        }
        return sum + ((Number(o.hours) || 0) * hourlyRate * (Number(o.rate) || 1.5));
      },
      0
    );

    // 🔹 Day Overrides (Admin holidays or forced work days)
    const dayOverrides = await getDayOverrides({
      organizationId: employee.organizationId || req.user.orgId,
      startDate: periodStart.format("YYYY-MM-DD"),
      endDate: periodEnd.format("YYYY-MM-DD")
    });

    // 🔹 Day & Attendance Calculation (Using shared helper)
    const {
      workingDays,
      presentDays,
      absentDays,
      paidLeaves,
      unpaidLeaves,
      leaveDays,
      lateDays
    } = calculatePayrollAttendance({
      employee,
      periodStart,
      periodEnd,
      attendances,
      leaves,
      dayOverrides
    });

    // 🔹 Salary Calculation
    const numRate = Number(rate) || 0;
    let dailyRate = workingDays > 0 ? (numRate / workingDays) : (numRate / 30);
    let absentDeduction = 0;
    let baseSalary = numRate;

    if (payoutType === "daily") {
      dailyRate = numRate;
      baseSalary = (presentDays + paidLeaves) * dailyRate;
      absentDeduction = (absentDays + unpaidLeaves) * dailyRate;
    } else if (payoutType === "hourly") {
      const totalMinutes = attendances.reduce(
        (sum, a) => sum + (Number(a.totalWorkedMinutes) || 0),
        0
      );
      const hoursWorked = totalMinutes / 60;
      baseSalary = numRate * hoursWorked;
    } else {
      // Monthly: calculate absent deduction based on dailyRate
      absentDeduction = (absentDays + unpaidLeaves) * dailyRate;
    }

    // Gross salary is the earnings before deductions: base + overtime + bonus
    const grossSalary = Math.max(0, baseSalary + overtimeAmount + Number(bonus || 0));
    // Net salary is gross salary minus absent deduction and extra deductions
    const netSalary = Math.max(0, grossSalary - absentDeduction - Number(deductions || 0));

    const payroll = await prisma.payroll.create({
      data: {
        employeeId: Number(employeeId),
        organizationId: employee.organizationId || req.user.orgId,
        periodStart: periodStart.toDate(),
        periodEnd: periodEnd.toDate(),
        payoutType: payoutType || "monthly",
        rate: numRate,
        currency: currency || "PKR",
        workingDays,
        presentDays,
        absentDays,
        leaveDays,
        lateDays,
        overtimeHours,
        grossSalary,
        netSalary,
        status: "GENERATED",
        createdById: req.user.id
      }
    });

    // Add overtime component if approved overtime exists
    if (Number(overtimeAmount) > 0) {
      await prisma.payrollComponent.create({
        data: {
          payrollId: payroll.id,
          type: "OVERTIME",
          title: "Overtime",
          amount: Number(overtimeAmount),
          createdById: req.user.id
        }
      });
    }

    // Add bonus component if provided
    if (Number(bonus) > 0) {
      await prisma.payrollComponent.create({
        data: {
          payrollId: payroll.id,
          type: "BONUS",
          title: "Bonus",
          amount: Number(bonus),
          createdById: req.user.id
        }
      });
    }

    // Add absent / unpaid days deduction component if employee had absences
    if (Number(absentDeduction) > 0) {
      await prisma.payrollComponent.create({
        data: {
          payrollId: payroll.id,
          type: "DEDUCTION",
          title: "Unpaid Days",
          amount: Math.round(Number(absentDeduction) * 100) / 100,
          createdById: req.user.id
        }
      });
    }

    // Add general deduction component if provided
    if (Number(deductions) > 0) {
      await prisma.payrollComponent.create({
        data: {
          payrollId: payroll.id,
          type: "DEDUCTION",
          title: "General Deduction",
          amount: Number(deductions),
          createdById: req.user.id
        }
      });
    }

    // Add audit log
    await prisma.payrollAuditLog.create({
      data: {
        payrollId: payroll.id,
        action: "CREATED",
        performedById: req.user.id
      }
    });

    res.json({ success: true, payroll });

  } catch (error) {
    console.error("Create Payroll Error:", error);
    res.status(500).json({ message: "Payroll generation failed" });
  }
};


exports.generateBulkPayroll = async (req, res) => {
  try {
    const { month, year, type, employeeIds, departmentIds, locationIds } = req.body;
    const user = req.user;

    if (!month || !year) {
      return res.status(400).json({ message: "Month and year required" });
    }

    //////////////////////////////////////////////////////
    // FETCH EMPLOYEES
    //////////////////////////////////////////////////////

    let employees = [];

    const baseInclude = {
      payroll: true,
      jobInfo: true,
      company: true,
      department: true,
      Schedule: { where: { deletedAt: null }, orderBy: { id: "desc" } }
    };

    if (type === "INDIVIDUAL") {
      employees = await prisma.employee.findMany({
        where: { id: { in: (employeeIds || []).map(Number) }, deletedAt: null, organizationId: user.orgId },
        include: baseInclude
      });
    } else if (type === "DEPARTMENT") {
      employees = await prisma.employee.findMany({
        where: { departmentId: { in: (departmentIds || []).map(Number) }, deletedAt: null, organizationId: user.orgId },
        include: baseInclude
      });
    } else if (type === "LOCATION") {
      employees = await prisma.employee.findMany({
        where: { companyId: { in: (locationIds || []).map(Number) }, deletedAt: null, organizationId: user.orgId },
        include: baseInclude
      });
    } else {
      employees = await prisma.employee.findMany({
        where: { deletedAt: null, organizationId: user.orgId },
        include: baseInclude
      });
    }

    // Fetch day overrides once for the full cycle range
    const dayOverrides = await getDayOverrides({
      organizationId: user.orgId,
      startDate: moment({ year: Number(year), month: Number(month) - 1 }).subtract(1, "month").format("YYYY-MM-DD"),
      endDate: moment({ year: Number(year), month: Number(month) - 1 }).add(1, "month").format("YYYY-MM-DD")
    });

    let generated = 0;
    let skipped = 0;

    for (const emp of employees) {
      if (!emp.payroll) continue;

      const cycleDate = Number(emp.payroll.cycleDate) || 1;
      let periodStart, periodEnd;

      if (cycleDate <= 1) {
        periodStart = moment({ year: Number(year), month: Number(month) - 1 }).startOf("month");
        periodEnd = moment({ year: Number(year), month: Number(month) - 1 }).endOf("month");
      } else {
        periodEnd = moment({ year: Number(year), month: Number(month) - 1 }).date(cycleDate - 1).endOf("day");
        periodStart = periodEnd.clone().subtract(1, "month").add(1, "day").startOf("day");
      }

      const hiringDate = emp.jobInfo?.hiringDate
        ? moment(emp.jobInfo.hiringDate)
        : null;

      // ❌ Skip if hired after cycle end
      if (hiringDate && hiringDate.isAfter(periodEnd)) {
        skipped++;
        continue;
      }

      // 🔥 Prorate start date
      if (hiringDate && hiringDate.isAfter(periodStart) && hiringDate.isSameOrBefore(periodEnd)) {
        periodStart = hiringDate.clone().startOf("day");
      }

      // 🔁 Prevent duplicate
      const existing = await prisma.payroll.findFirst({
        where: {
          employeeId: emp.id,
          deletedAt: null,
          OR: [
            {
              periodStart: periodStart.toDate(),
              periodEnd: periodEnd.toDate()
            },
            {
              periodStart: {
                gte: periodStart.clone().startOf("day").toDate(),
                lte: periodStart.clone().endOf("day").toDate()
              }
            }
          ]
        }
      });

      if (existing) {
        skipped++;
        continue;
      }

      //////////////////////////////////////////////////////
      // FETCH ATTENDANCE + LEAVES
      //////////////////////////////////////////////////////

      const attendance = await prisma.attendance.findMany({
        where: {
          employeeId: emp.id,
          date: { gte: periodStart.toDate(), lte: periodEnd.toDate() },
          deletedAt: null
        }
      });

      const leaves = await prisma.leaveRequest.findMany({
        where: {
          employeeId: emp.id,
          status: "APPROVED",
          startDate: { lte: periodEnd.toDate() },
          endDate: { gte: periodStart.toDate() }
        }
      });

      //////////////////////////////////////////////////////
      // OVERTIME
      //////////////////////////////////////////////////////

      const overtimes = await prisma.overtime.findMany({
        where: {
          employeeId: emp.id,
          status: "APPROVED",
          date: { gte: periodStart.toDate(), lte: periodEnd.toDate() }
        }
      });

      const hourlyRate = calculateHourlyRate(emp.payroll, emp.Schedule);
      const overtimeHours = overtimes.reduce((sum, o) => sum + (Number(o.hours) || 0), 0);
      const overtimeAmount = overtimes.reduce(
        (sum, o) => {
          if (o.amount !== undefined && o.amount !== null && Number(o.amount) > 0) {
            return sum + Number(o.amount);
          }
          return sum + ((Number(o.hours) || 0) * hourlyRate * (Number(o.rate) || 1.5));
        },
        0
      );

      //////////////////////////////////////////////////////
      // ATTENDANCE & WORKING DAYS (USING SHARED HELPER)
      //////////////////////////////////////////////////////

      const {
        workingDays,
        presentDays,
        absentDays,
        paidLeaves,
        unpaidLeaves,
        leaveDays,
        lateDays
      } = calculatePayrollAttendance({
        employee: emp,
        periodStart,
        periodEnd,
        attendances: attendance,
        leaves,
        dayOverrides
      });

      //////////////////////////////////////////////////////
      // SALARY LOGIC
      //////////////////////////////////////////////////////

      const rate = Number(emp.payroll.rate) || 0;
      const payoutType = emp.payroll.payoutType || "monthly";
      let dailyRate = workingDays > 0 ? (rate / workingDays) : (rate / 30);
      let absentDeduction = 0;
      let baseSalary = rate;

      if (payoutType === "daily") {
        dailyRate = rate;
        baseSalary = (presentDays + paidLeaves) * dailyRate;
        absentDeduction = (absentDays + unpaidLeaves) * dailyRate;
      } else if (payoutType === "hourly") {
        const totalMinutes = attendance.reduce(
          (sum, a) => sum + (Number(a.totalWorkedMinutes) || 0),
          0
        );
        const totalHours = totalMinutes / 60;
        baseSalary = totalHours * rate;
      } else {
        // Monthly: calculate absent deduction based on dailyRate
        absentDeduction = (absentDays + unpaidLeaves) * dailyRate;
      }

      const grossSalary = Math.max(0, baseSalary + overtimeAmount);
      const netSalary = Math.max(0, grossSalary - absentDeduction);

      //////////////////////////////////////////////////////
      // CREATE PAYROLL
      //////////////////////////////////////////////////////

      const payroll = await prisma.payroll.create({
        data: {
          employeeId: emp.id,
          organizationId: emp.organizationId || user.orgId,
          periodStart: periodStart.toDate(),
          periodEnd: periodEnd.toDate(),
          payoutType: payoutType,
          rate,
          currency: emp.payroll.currency || "PKR",
          workingDays,
          presentDays,
          absentDays,
          leaveDays,
          lateDays,
          overtimeHours,
          grossSalary,
          netSalary,
          status: "GENERATED",
          createdById: user.id
        }
      });

      if (overtimeAmount > 0) {
        await prisma.payrollComponent.create({
          data: {
            payrollId: payroll.id,
            type: "OVERTIME",
            title: "Overtime",
            amount: Number(overtimeAmount),
            createdById: user.id
          }
        });
      }

      if (Number(absentDeduction) > 0) {
        await prisma.payrollComponent.create({
          data: {
            payrollId: payroll.id,
            type: "DEDUCTION",
            title: "Unpaid Days",
            amount: Math.round(Number(absentDeduction) * 100) / 100,
            createdById: user.id
          }
        });
      }

      await prisma.payrollAuditLog.create({
        data: {
          payrollId: payroll.id,
          action: "CREATED",
          performedById: user.id
        }
      });

      generated++;
    }

    res.json({ success: true, generated, skipped });

  } catch (err) {
    console.error("Bulk Payroll Error:", err);
    res.status(500).json({ message: "Payroll generation failed" });
  }
};

exports.getPayrolls = async (req, res) => {
  try {
    const { month, year, status } = req.query;

    const where = {
      organizationId: req.user.orgId,
      deletedAt: null,
      employee: {
        deletedAt: null
      }
    };

    if (req.user.role !== "ADMIN") {
      where.employeeId = req.user.id;
    }

    if (month && year && String(month).toLowerCase() !== "all") {
      const startDate = moment({ year: Number(year), month: Number(month) - 1 })
        .startOf("month")
        .toDate();

      const endDate = moment(startDate).endOf("month").toDate();

      where.OR = [
        {
          periodStart: {
            gte: startDate,
            lte: endDate
          }
        },
        {
          periodEnd: {
            gt: startDate,
            lte: endDate
          }
        }
      ];
    } else if (year && String(year).toLowerCase() !== "all") {
      const startYear = moment({ year: Number(year) }).startOf("year").toDate();
      const endYear = moment({ year: Number(year) }).endOf("year").toDate();

      where.OR = [
        {
          periodStart: {
            gte: startYear,
            lte: endYear
          }
        },
        {
          periodEnd: {
            gt: startYear,
            lte: endYear
          }
        }
      ];
    }

    if (status && status !== "all") {
      where.status = status;
    }

    const payrolls = await prisma.payroll.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
            department: {
              select: {
                id: true,
                title: true
              }
            }
          }
        },
        components: true
      },
      orderBy: {
        periodStart: "desc"
      }
    });

    const formatted = payrolls.map(p => {
      const baseSalary = Number(p.rate || p.grossSalary || 0);

      const extraEarnings = (p.components || [])
        .filter(c =>
          ["BASIC","ALLOWANCE","BONUS","COMMISSION","OVERTIME","INCREMENT","KPIS","BOUNTY","ARREARS"].includes(String(c.type || "").toUpperCase())
        )
        .reduce((s, c) => s + Number(c.amount || 0), 0);

      const extraDeductions = (p.components || [])
        .filter(c =>
          ["TAX","LOAN","DEDUCTION","TARDIES","UNPAID","FOOD","CT","GYM","ADVANCE"].includes(String(c.type || "").toUpperCase())
        )
        .reduce((s, c) => s + Number(c.amount || 0), 0);

      let overtimeAmount = (p.components || [])
        .filter(c => String(c.type).toUpperCase() === "OVERTIME")
        .reduce((s, c) => s + Number(c.amount || 0), 0);

      const bonus = (p.components || [])
        .filter(c => String(c.type).toUpperCase() === "BONUS")
        .reduce((s, c) => s + Number(c.amount || 0), 0);

      if (overtimeAmount === 0 && p.grossSalary > baseSalary && extraEarnings === 0) {
        overtimeAmount = Number((p.grossSalary - baseSalary).toFixed(2));
      }

      const grossEarnings = (p.components && p.components.length > 0)
        ? (baseSalary + extraEarnings)
        : Number(p.grossSalary || baseSalary);
      const grossDeductions = extraDeductions;
      const netSalary = (p.components && p.components.length > 0)
        ? Math.max(0, grossEarnings - grossDeductions)
        : Number(p.netSalary || grossEarnings);

      return {
        ...p,
        grossEarnings,
        grossDeductions,
        netSalary,
        overtimeAmount,
        bonus
      };
    });

    const totalNet = formatted.reduce((s, p) => s + p.netSalary, 0);
    const totalPaid = formatted
      .filter(p => p.status === "PAID")
      .reduce((s, p) => s + p.netSalary, 0);

    res.json({
      data: formatted,
      summary: {
        totalPayroll: totalNet,
        totalPaid,
        totalEmployees: formatted.length
      }
    });

  } catch (error) {
    console.error("Get Payrolls Error:", error);
    res.status(500).json({ message: "Failed to fetch payrolls" });
  }
};
exports.getSinglePayroll = async (req, res) => {
  try {
    const payroll = await prisma.payroll.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        employee: {
          include: {
            jobInfo: true,
            department: true,
            company: true,
            Schedule: true
          }
        },
        components: true,
        auditLogs: {
          include: {
            performedBy: {
              select: { firstName: true, lastName: true }
            }
          }
        }
      }
    });

    if (!payroll) {
      return res.status(404).json({ message: "Not found" });
    }

    //////////////////////////////////////////////////////
    // CALCULATE WORKING DAYS FROM SCHEDULE
    //////////////////////////////////////////////////////

    const activeSchedule = (payroll.employee?.Schedule || []).find(s => !s.deletedAt) || payroll.employee?.Schedule?.[0];
    const rawScheduleDays = activeSchedule?.days || [];
    const scheduleDays = Array.isArray(rawScheduleDays)
      ? rawScheduleDays.map(d => typeof d === "object" && d !== null ? (d.day || d.dayFull || d.name || "") : String(d || "")).map(s => s.trim().toLowerCase())
      : [];

    let workingDaysCalculated = 0;
    let cursor = moment(payroll.periodStart);

    while (cursor.isSameOrBefore(payroll.periodEnd)) {
      const dShort = cursor.format("ddd").toLowerCase();
      const dFull = cursor.format("dddd").toLowerCase();
      if (scheduleDays.length > 0) {
        if (scheduleDays.includes(dShort) || scheduleDays.includes(dFull)) {
          workingDaysCalculated++;
        }
      } else {
        const dow = cursor.day();
        if (dow !== 0 && dow !== 6) {
          workingDaysCalculated++;
        }
      }
      cursor.add(1, "day");
    }

    if (workingDaysCalculated <= 0) {
      workingDaysCalculated = Math.max(1, moment(payroll.periodEnd).diff(moment(payroll.periodStart), "days") + 1);
    }

    //////////////////////////////////////////////////////
    // DERIVED COMPONENT TOTALS
    //////////////////////////////////////////////////////

    const baseSalary = Number(payroll.rate || payroll.grossSalary || 0);

    const extraEarnings = (payroll.components || [])
      .filter(c =>
        ["BASIC","ALLOWANCE","BONUS","COMMISSION","OVERTIME","INCREMENT","KPIS","BOUNTY","ARREARS"].includes(String(c.type || "").toUpperCase())
      )
      .reduce((s, c) => s + Number(c.amount || 0), 0);

    const extraDeductions = (payroll.components || [])
      .filter(c =>
        ["TAX","LOAN","DEDUCTION","TARDIES","UNPAID","FOOD","CT","GYM","ADVANCE"].includes(String(c.type || "").toUpperCase())
      )
      .reduce((s, c) => s + Number(c.amount || 0), 0);

    const grossEarnings = (payroll.components && payroll.components.length > 0)
      ? (baseSalary + extraEarnings)
      : Number(payroll.grossSalary || baseSalary);
    const grossDeductions = extraDeductions;
    const computedNetSalary = (payroll.components && payroll.components.length > 0)
      ? Math.max(0, grossEarnings - grossDeductions)
      : Number(payroll.netSalary || grossEarnings);

    res.json({
      ...payroll,
      workingDaysCalculated,
      grossEarnings,
      grossDeductions,
      netSalary: computedNetSalary
    });

  } catch (err) {
    res.status(500).json({ message: "Failed to fetch payroll" });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status, paymentMethod, transactionRef, paidAt } = req.body;
    const payrollId = Number(req.params.id);
    const user = req.user;

    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId }
    });

    if (!payroll) {
      return res.status(404).json({ message: "Payroll not found" });
    }
    if (payroll.locked) {
      return res.status(400).json({
        message: "Locked payroll cannot be modified"
      });
    }

    const data = {
      status
    };

    if (status === "PAID") {
      data.paidAt = paidAt ? new Date(paidAt) : new Date();
      if (paymentMethod !== undefined) data.paymentMethod = paymentMethod;
      if (transactionRef !== undefined) data.transactionRef = transactionRef;
    } else {
      data.paidAt = null;
      if (paymentMethod !== undefined) data.paymentMethod = paymentMethod;
      if (transactionRef !== undefined) data.transactionRef = transactionRef;
    }

    const updated = await prisma.payroll.update({
      where: { id: payrollId },
      data
    });

    const noteDetails = [];
    if (status === "PAID") {
      if (paymentMethod) noteDetails.push(`Method: ${paymentMethod}`);
      if (transactionRef) noteDetails.push(`Ref: ${transactionRef}`);
    }

    // Add audit log
    await prisma.payrollAuditLog.create({
      data: {
        payrollId,
        action: status,
        performedById: user.id,
        note: `Payroll marked as ${status}${noteDetails.length ? ` (${noteDetails.join(", ")})` : ""}`
      }
    });

    res.json(updated);

  } catch (err) {
    console.error("Update status error:", err);
    res.status(500).json({ message: "Failed to update status" });
  }
};

exports.bulkUpdateStatus = async (req, res) => {
  try {
    const { ids, status, paymentMethod, transactionRef, paidAt } = req.body;
    const user = req.user;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No payroll IDs provided" });
    }

    const numericIds = ids.map(Number).filter(n => !isNaN(n));
    const orgId = user.organizationId || user.orgId;

    const payrolls = await prisma.payroll.findMany({
      where: {
        id: { in: numericIds },
        ...(orgId ? { organizationId: orgId } : {}),
        locked: false
      }
    });

    const eligibleIds = payrolls.map(p => p.id);
    if (eligibleIds.length === 0) {
      return res.status(400).json({ message: "No unlocked payrolls found to update" });
    }

    const updateData = {
      status,
      paidAt: status === "PAID" ? (paidAt ? new Date(paidAt) : new Date()) : null
    };

    if (status === "PAID") {
      if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
      if (transactionRef !== undefined) updateData.transactionRef = transactionRef;
    } else {
      if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
      if (transactionRef !== undefined) updateData.transactionRef = transactionRef;
    }

    await prisma.payroll.updateMany({
      where: { id: { in: eligibleIds } },
      data: updateData
    });

    // Create audit logs
    const noteDetails = [];
    if (status === "PAID") {
      if (paymentMethod) noteDetails.push(`Method: ${paymentMethod}`);
      if (transactionRef) noteDetails.push(`Ref: ${transactionRef}`);
    }
    const auditEntries = eligibleIds.map(id => ({
      payrollId: id,
      action: status,
      performedById: user.id,
      note: `Bulk marked as ${status}${noteDetails.length ? ` (${noteDetails.join(", ")})` : ""}`
    }));
    await prisma.payrollAuditLog.createMany({ data: auditEntries });

    res.json({
      success: true,
      updatedCount: eligibleIds.length,
      message: `${eligibleIds.length} payroll(s) updated to ${status}`
    });
  } catch (err) {
    console.error("Bulk update status error:", err);
    res.status(500).json({ message: "Failed to update bulk status" });
  }
};

exports.bulkLock = async (req, res) => {
  try {
    const { ids } = req.body;
    const user = req.user;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No payroll IDs provided" });
    }

    const numericIds = ids.map(Number).filter(n => !isNaN(n));
    const orgId = user.organizationId || user.orgId;

    const result = await prisma.payroll.updateMany({
      where: {
        id: { in: numericIds },
        ...(orgId ? { organizationId: orgId } : {}),
        status: { in: ["GENERATED", "APPROVED"] },
        locked: false
      },
      data: {
        locked: true,
        isEditable: false
      }
    });

    res.json({
      success: true,
      count: result.count,
      message: `${result.count} payroll(s) locked successfully`
    });
  } catch (err) {
    console.error("Bulk lock error:", err);
    res.status(500).json({ message: "Failed to lock payrolls" });
  }
};

exports.exportPayrolls = async (req, res) => {
  try {
    const user = req.user;
    const orgId = user.organizationId || user.orgId;
    const { month, year, status, runId, ids, format } = req.query;

    const where = {
      ...(orgId ? { organizationId: orgId } : {}),
      deletedAt: null
    };

    if (ids) {
      const idList = String(ids).split(",").map(Number).filter(n => !isNaN(n));
      if (idList.length > 0) {
        where.id = { in: idList };
      }
    } else {
      if (month && year && month !== "all") {
        const m = Number(month);
        const y = Number(year);
        const start = moment({ year: y, month: m - 1 }).startOf("month").toDate();
        const end = moment({ year: y, month: m - 1 }).endOf("month").toDate();
        where.periodStart = { gte: start };
        where.periodEnd = { lte: end };
      } else if (year) {
        const y = Number(year);
        const start = moment({ year: y, month: 0 }).startOf("month").toDate();
        const end = moment({ year: y, month: 11 }).endOf("month").toDate();
        where.periodStart = { gte: start };
        where.periodEnd = { lte: end };
      }

      if (status && status !== "all") {
        where.status = status;
      }

      if (runId) {
        where.runId = Number(runId);
      }
    }

    const payrolls = await prisma.payroll.findMany({
      where,
      include: {
        employee: {
          include: {
            department: true,
            jobInfo: true,
            company: true
          }
        },
        components: true
      },
      orderBy: { createdAt: "desc" }
    });

    const isCsv = String(format || "").toLowerCase() === "csv";

    if (isCsv) {
      const headers = [
        "Payroll ID",
        "Employee ID",
        "Employee Name",
        "Email",
        "Department",
        "Designation",
        "Period",
        "Base Rate",
        "Working Days",
        "Present Days",
        "Absent Days",
        "Leave Days",
        "Overtime Hours",
        "Gross Salary",
        "Total Deductions",
        "Net Salary",
        "Status",
        "Payment Method",
        "Transaction Ref",
        "Paid Date"
      ];

      const rows = payrolls.map(p => {
        const emp = p.employee;
        const empName = emp ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim() : "Unknown";
        const dept = emp?.department?.title || "N/A";
        const desig = emp?.jobInfo?.jobTitle || "Staff";
        const periodStr = moment(p.periodStart).format("MMM YYYY");
        const gross = Number(p.grossSalary || 0);
        const net = Number(p.netSalary || 0);
        const deductions = Math.max(0, gross - net);

        return [
          p.id,
          emp?.id || "N/A",
          `"${empName.replace(/"/g, '""')}"`,
          `"${(emp?.email || "").replace(/"/g, '""')}"`,
          `"${dept.replace(/"/g, '""')}"`,
          `"${desig.replace(/"/g, '""')}"`,
          `"${periodStr}"`,
          Number(p.rate || 0),
          p.workingDays || 0,
          p.presentDays || 0,
          p.absentDays || 0,
          p.leaveDays || 0,
          p.overtimeHours || 0,
          gross,
          deductions,
          net,
          p.status,
          `"${(p.paymentMethod || "—").replace(/"/g, '""')}"`,
          `"${(p.transactionRef || "—").replace(/"/g, '""')}"`,
          p.paidAt ? moment(p.paidAt).format("YYYY-MM-DD") : "—"
        ].join(",");
      });

      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="Payroll_Export_${moment().format("YYYYMMDD_HHmmss")}.csv"`);
      return res.send(csvContent);
    }

    // Default: Styled ExcelJS Workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Frontpin HRMS";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Payroll Summary", {
      views: [{ showGridLines: true }]
    });

    worksheet.columns = [
      { header: "ID", key: "id", width: 8 },
      { header: "Emp ID", key: "empId", width: 12 },
      { header: "Employee Name", key: "empName", width: 24 },
      { header: "Department", key: "department", width: 20 },
      { header: "Designation", key: "designation", width: 22 },
      { header: "Period", key: "period", width: 14 },
      { header: "Base Rate (PKR)", key: "rate", width: 16 },
      { header: "Working Days", key: "workingDays", width: 14 },
      { header: "Present Days", key: "presentDays", width: 14 },
      { header: "Absent Days", key: "absentDays", width: 14 },
      { header: "Overtime (Hrs)", key: "overtimeHours", width: 14 },
      { header: "Gross Salary (PKR)", key: "grossSalary", width: 18 },
      { header: "Deductions (PKR)", key: "deductions", width: 18 },
      { header: "Net Salary (PKR)", key: "netSalary", width: 18 },
      { header: "Status", key: "status", width: 14 },
      { header: "Payment Method", key: "paymentMethod", width: 18 },
      { header: "Transaction Ref", key: "transactionRef", width: 22 },
      { header: "Paid Date", key: "paidAt", width: 16 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A8A" }
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 26;

    let totalGrossSum = 0;
    let totalNetSum = 0;

    payrolls.forEach((p, idx) => {
      const emp = p.employee;
      const empName = emp ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim() : "Unknown";
      const dept = emp?.department?.title || "N/A";
      const desig = emp?.jobInfo?.jobTitle || "Staff";
      const periodStr = moment(p.periodStart).format("MMM YYYY");
      const gross = Number(p.grossSalary || 0);
      const net = Number(p.netSalary || 0);
      const deductions = Math.max(0, gross - net);

      totalGrossSum += gross;
      totalNetSum += net;

      const row = worksheet.addRow({
        id: p.id,
        empId: emp?.id || "N/A",
        empName,
        department: dept,
        designation: desig,
        period: periodStr,
        rate: Number(p.rate || 0),
        workingDays: p.workingDays || 0,
        presentDays: p.presentDays || 0,
        absentDays: p.absentDays || 0,
        overtimeHours: p.overtimeHours || 0,
        grossSalary: gross,
        deductions,
        netSalary: net,
        status: p.status,
        paymentMethod: p.paymentMethod || "—",
        transactionRef: p.transactionRef || "—",
        paidAt: p.paidAt ? moment(p.paidAt).format("YYYY-MM-DD") : "—"
      });

      if (idx % 2 === 1) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" }
        };
      }
    });

    if (payrolls.length > 0) {
      const totalRow = worksheet.addRow({
        id: "TOTAL",
        empId: "",
        empName: `Total Count: ${payrolls.length}`,
        department: "",
        designation: "",
        period: "",
        rate: "",
        workingDays: "",
        presentDays: "",
        absentDays: "",
        overtimeHours: "",
        grossSalary: totalGrossSum,
        deductions: Math.max(0, totalGrossSum - totalNetSum),
        netSalary: totalNetSum,
        status: "",
        paymentMethod: "",
        transactionRef: "",
        paidAt: ""
      });
      totalRow.font = { bold: true };
      totalRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE2E8F0" }
      };
      totalRow.height = 22;
    }

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Payroll_Report_${moment().format("YYYYMMDD_HHmmss")}.xlsx"`
    );
    return res.send(buffer);
  } catch (err) {
    console.error("Export payrolls error:", err);
    res.status(500).json({ message: "Failed to export payrolls" });
  }
};
exports.lockPayroll = async (req, res) => {
  const payrollId = Number(req.params.id);

  const payroll = await prisma.payroll.findUnique({
    where: { id: payrollId }
  });

  if (!payroll)
    return res.status(404).json({ message: "Payroll not found" });

  if (payroll.status !== "APPROVED" && payroll.status !== "GENERATED")
    return res.status(400).json({ message: "Only generated payroll can be locked" });

  await prisma.payroll.update({
    where: { id: payrollId },
    data: {
      locked: true,
      isEditable: false
    }
  });

  res.json({ message: "Payroll locked successfully" });
};
exports.addAdjustment = async (req, res) => {
  const { type, title, amount } = req.body;

  const payroll = await prisma.payroll.findUnique({
    where: { id: Number(req.params.id) }
  });

  if (!payroll) return res.status(404).json({ message: "Not found" });

  await prisma.payrollAdjustment.create({
    data: {
      payrollId: payroll.id,
      type,
      title,
      amount: Number(amount)
    }
  });

  // 🔥 Recalculate Net Salary
  const adjustments = await prisma.payrollAdjustment.findMany({
    where: { payrollId: payroll.id }
  });

  const totalIncrements = adjustments
    .filter(a => a.type === "INCREMENT")
    .reduce((s, a) => s + a.amount, 0);

  const totalDeductions = adjustments
    .filter(a => a.type === "DEDUCTION")
    .reduce((s, a) => s + a.amount, 0);

  const netSalary =
    payroll.grossSalary + totalIncrements - totalDeductions;

  const updated = await prisma.payroll.update({
    where: { id: payroll.id },
    data: { netSalary }
  });

  res.json(updated);
};
exports.deletePayroll = async (req, res) => {
  try {
    const payrollId = Number(req.params.id);

    const payroll = await prisma.payroll.findFirst({
      where: {
        id: payrollId,
        organizationId: req.user.orgId,
        deletedAt: null
      }
    });

    if (!payroll) {
      return res.status(404).json({ message: "Payroll not found" });
    }

    // 🔒 Block paid payroll
    if (payroll.status === "PAID") {
      return res.status(400).json({
        message: "Paid payroll cannot be deleted"
      });
    }

    // 🔒 Block locked payroll
    if (payroll.locked) {
      return res.status(400).json({
        message: "Locked payroll cannot be deleted"
      });
    }

    await prisma.$transaction([
      prisma.payroll.update({
        where: { id: payrollId },
        data: {
          deletedAt: new Date(),
          isEditable: false
        }
      }),

      prisma.payrollAuditLog.create({
        data: {
          payrollId,
          action: "DELETED",
          performedById: req.user.id,
          note: "Soft deleted payroll"
        }
      })
    ]);

    res.json({ message: "Payroll deleted successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete payroll" });
  }
};
exports.createPayrollRun = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only admin allowed" });
    }

    const { month, year } = req.body;

    const existing = await prisma.payrollRun.findUnique({
      where: {
        organizationId_month_year: {
          organizationId: req.user.orgId,
          month,
          year
        }
      }
    });

    if (existing) {
      return res.status(400).json({ message: "Payroll run already exists" });
    }

    const run = await prisma.payrollRun.create({
      data: {
        organizationId: req.user.orgId,
        month,
        year,
        generatedById: req.user.id
      }
    });

    res.json(run);

  } catch (err) {
    res.status(500).json({ message: "Failed to create payroll run" });
  }
};
exports.generateRunPayrolls = async (req, res) => {
  try {
    const runId = Number(req.params.runId);

    const run = await prisma.payrollRun.findUnique({
      where: { id: runId },
      include: { payrolls: true }
    });

    if (!run) return res.status(404).json({ message: "Run not found" });

    if (run.status !== "DRAFT") {
      return res.status(400).json({ message: "Run already processed" });
    }

    const employees = await prisma.employee.findMany({
      where: {
        organizationId: run.organizationId,
        deletedAt: null
      },
      include: {
        payroll: true,
        jobInfo: true,
        company: true,
        department: true,
        Schedule: { where: { deletedAt: null }, orderBy: { id: "desc" } }
      }
    });

    const dayOverrides = await getDayOverrides({
      organizationId: run.organizationId,
      startDate: moment({ year: run.year, month: run.month - 1 }).subtract(1, "month").format("YYYY-MM-DD"),
      endDate: moment({ year: run.year, month: run.month - 1 }).add(1, "month").format("YYYY-MM-DD")
    });

    let totalGross = 0;
    let totalNet = 0;
    let count = 0;

    for (const emp of employees) {
      if (!emp.payroll) continue;

      const cycleDate = Number(emp.payroll.cycleDate) || 1;
      let periodStart, periodEnd;

      if (cycleDate <= 1) {
        periodStart = moment({ year: run.year, month: run.month - 1 }).startOf("month");
        periodEnd = moment({ year: run.year, month: run.month - 1 }).endOf("month");
      } else {
        periodEnd = moment({ year: run.year, month: run.month - 1 }).date(cycleDate - 1).endOf("day");
        periodStart = periodEnd.clone().subtract(1, "month").add(1, "day").startOf("day");
      }

      const hiringDate = emp.jobInfo?.hiringDate ? moment(emp.jobInfo.hiringDate) : null;

      // Skip if hired after periodEnd
      if (hiringDate && hiringDate.isAfter(periodEnd)) {
        continue;
      }

      // Prorate if hired during period
      if (hiringDate && hiringDate.isAfter(periodStart) && hiringDate.isSameOrBefore(periodEnd)) {
        periodStart = hiringDate.clone().startOf("day");
      }

      // Check existing payroll
      const existing = await prisma.payroll.findFirst({
        where: {
          employeeId: emp.id,
          deletedAt: null,
          OR: [
            { periodStart: periodStart.toDate(), periodEnd: periodEnd.toDate() },
            {
              periodStart: {
                gte: periodStart.clone().startOf("day").toDate(),
                lte: periodStart.clone().endOf("day").toDate()
              }
            }
          ]
        }
      });

      if (existing) {
        continue;
      }

      // Fetch Attendance
      const attendance = await prisma.attendance.findMany({
        where: {
          employeeId: emp.id,
          date: { gte: periodStart.toDate(), lte: periodEnd.toDate() },
          deletedAt: null
        }
      });

      // Fetch Approved Leaves
      const leaves = await prisma.leaveRequest.findMany({
        where: {
          employeeId: emp.id,
          status: "APPROVED",
          startDate: { lte: periodEnd.toDate() },
          endDate: { gte: periodStart.toDate() }
        }
      });

      // Fetch Approved Overtime
      const overtimes = await prisma.overtime.findMany({
        where: {
          employeeId: emp.id,
          status: "APPROVED",
          date: { gte: periodStart.toDate(), lte: periodEnd.toDate() }
        }
      });

      const hourlyRate = calculateHourlyRate(emp.payroll, emp.Schedule);
      const overtimeHours = overtimes.reduce((sum, o) => sum + (Number(o.hours) || 0), 0);
      const overtimeAmount = overtimes.reduce((sum, o) => {
        if (o.amount !== undefined && o.amount !== null && Number(o.amount) > 0) {
          return sum + Number(o.amount);
        }
        return sum + ((Number(o.hours) || 0) * hourlyRate * (Number(o.rate) || 1.5));
      }, 0);

      // Attendance, working days, absences calculation via shared helper
      const {
        workingDays,
        presentDays,
        absentDays,
        paidLeaves,
        unpaidLeaves,
        leaveDays,
        lateDays
      } = calculatePayrollAttendance({
        employee: emp,
        periodStart,
        periodEnd,
        attendances: attendance,
        leaves,
        dayOverrides
      });

      // Salary calculation based on payoutType
      const rate = Number(emp.payroll.rate) || 0;
      const payoutType = emp.payroll.payoutType || "monthly";
      let dailyRate = workingDays > 0 ? (rate / workingDays) : (rate / 30);
      let absentDeduction = 0;
      let baseSalary = rate;

      if (payoutType === "daily") {
        dailyRate = rate;
        baseSalary = (presentDays + paidLeaves) * dailyRate;
        absentDeduction = (absentDays + unpaidLeaves) * dailyRate;
      } else if (payoutType === "hourly") {
        const totalMinutes = attendance.reduce((sum, a) => sum + (Number(a.totalWorkedMinutes) || 0), 0);
        baseSalary = (totalMinutes / 60) * rate;
      } else {
        absentDeduction = (absentDays + unpaidLeaves) * dailyRate;
      }

      const grossSalary = Math.max(0, baseSalary + overtimeAmount);
      const netSalary = Math.max(0, grossSalary - absentDeduction);

      const payroll = await prisma.payroll.create({
        data: {
          employeeId: emp.id,
          organizationId: run.organizationId,
          runId: run.id,
          periodStart: periodStart.toDate(),
          periodEnd: periodEnd.toDate(),
          payoutType,
          rate,
          currency: emp.payroll.currency || "PKR",
          workingDays,
          presentDays,
          absentDays,
          leaveDays,
          lateDays,
          overtimeHours,
          grossSalary,
          netSalary,
          status: "GENERATED",
          createdById: req.user.id
        }
      });

      if (overtimeAmount > 0) {
        await prisma.payrollComponent.create({
          data: {
            payrollId: payroll.id,
            type: "OVERTIME",
            title: "Overtime",
            amount: Number(overtimeAmount),
            createdById: req.user.id
          }
        });
      }

      if (Number(absentDeduction) > 0) {
        await prisma.payrollComponent.create({
          data: {
            payrollId: payroll.id,
            type: "DEDUCTION",
            title: "Unpaid Days",
            amount: Math.round(Number(absentDeduction) * 100) / 100,
            createdById: req.user.id
          }
        });
      }

      await prisma.payrollAuditLog.create({
        data: {
          payrollId: payroll.id,
          action: "CREATED",
          performedById: req.user.id
        }
      });

      totalGross += grossSalary;
      totalNet += netSalary;
      count++;
    }

    await prisma.payrollRun.update({
      where: { id: run.id },
      data: {
        status: "GENERATED",
        totalEmployees: count,
        totalGross,
        totalNet
      }
    });

    res.json({
      success: true,
      message: `Payroll generated successfully for ${count} employees`,
      count,
      totalGross,
      totalNet
    });

  } catch (err) {
    console.error("Generate Run Payrolls Error:", err);
    res.status(500).json({ message: "Generation failed" });
  }
};
exports.approveRun = async (req, res) => {
  const runId = Number(req.params.runId);

  const run = await prisma.payrollRun.update({
    where: { id: runId },
    data: {
      status: "APPROVED",
      approvedById: req.user.id,
      approvedAt: new Date()
    }
  });

  res.json(run);
};
exports.lockRun = async (req, res) => {
  const runId = Number(req.params.runId);

  await prisma.payrollRun.update({
    where: { id: runId },
    data: {
      status: "LOCKED",
      lockedAt: new Date()
    }
  });

  await prisma.payroll.updateMany({
    where: { runId },
    data: { locked: true, isEditable: false }
  });

  res.json({ message: "Run locked successfully" });
};
exports.markRunPaid = async (req, res) => {
  const runId = Number(req.params.runId);
  const { paymentMethod, transactionRef } = req.body || {};

  await prisma.payrollRun.update({
    where: { id: runId },
    data: { status: "PAID" }
  });

  const payrollData = {
    status: "PAID",
    paidAt: new Date()
  };
  if (paymentMethod) payrollData.paymentMethod = paymentMethod;
  if (transactionRef) payrollData.transactionRef = transactionRef;

  await prisma.payroll.updateMany({
    where: { runId },
    data: payrollData
  });

  res.json({ message: "Payroll paid successfully" });
};
exports.getRuns = async (req, res) => {
  const runs = await prisma.payrollRun.findMany({
    where: { organizationId: req.user.orgId },
    orderBy: { createdAt: "desc" }
  });

  res.json(runs);
};
exports.getSingleRun = async (req, res) => {
  const run = await prisma.payrollRun.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      payrolls: {
        include: { employee: true }
      }
    }
  });

  res.json(run);
};
/**
 * Helper to recalculate and persist accurate grossSalary and netSalary for a payroll.
 * Preserves the employee's base salary (rate) if no explicit BASIC component exists,
 * sums all earnings components, subtracts all deductions, and updates DB.
 */
async function recalculatePayrollTotals(payrollId) {
  const payroll = await prisma.payroll.findUnique({
    where: { id: payrollId },
    include: { components: true }
  });

  if (!payroll) return null;

  const components = payroll.components || [];

  const hasBasicComponent = components.some(
    c => String(c.type || "").toUpperCase() === "BASIC"
  );

  const baseSalary = hasBasicComponent ? 0 : Number(payroll.rate || 0);

  const extraEarnings = components
    .filter(c =>
      ["BASIC", "ALLOWANCE", "BONUS", "COMMISSION", "OVERTIME", "INCREMENT", "KPIS", "BOUNTY", "ARREARS"].includes(
        String(c.type || "").toUpperCase()
      )
    )
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);

  const extraDeductions = components
    .filter(c =>
      ["TAX", "LOAN", "DEDUCTION", "TARDIES", "UNPAID", "FOOD", "CT", "GYM", "ADVANCE"].includes(
        String(c.type || "").toUpperCase()
      )
    )
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);

  const grossSalary = Math.max(0, baseSalary + extraEarnings);
  const netSalary = Math.max(0, grossSalary - extraDeductions);

  const updated = await prisma.payroll.update({
    where: { id: payrollId },
    data: {
      grossSalary,
      netSalary
    }
  });

  return { updated, grossSalary, netSalary };
}

exports.recalculatePayrollTotals = recalculatePayrollTotals;

exports.addComponent = async (req, res) => {
  try {
    const payrollId = Number(req.params.id);
    const { type, title, amount } = req.body;

    if (!title || !amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "Valid title and amount required" });
    }

    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId },
      include: { run: true }
    });

    if (!payroll) {
      return res.status(404).json({ message: "Payroll not found" });
    }

    // 🔒 Prevent editing locked payroll
    if (payroll.locked || payroll.isEditable === false) {
      return res.status(400).json({ message: "Payroll is locked and cannot be modified" });
    }

    // 🔒 Prevent editing paid payroll
    if (payroll.status === "PAID") {
      return res.status(400).json({ message: "Cannot modify paid payroll" });
    }

    // 🔥 Create component
    const component = await prisma.payrollComponent.create({
      data: {
        payrollId,
        type,
        title,
        amount: Number(amount),
        createdById: req.user.id
      }
    });

    // 🔥 Recalculate Payroll Totals preserving base salary
    const totals = await recalculatePayrollTotals(payrollId);

    // 🔥 Audit Log
    await prisma.payrollAuditLog.create({
      data: {
        payrollId,
        action: `COMPONENT_ADDED (${type})`,
        performedById: req.user.id
      }
    });

    res.json({
      success: true,
      component,
      grossSalary: totals?.grossSalary,
      netSalary: totals?.netSalary
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add component" });
  }
};

exports.updateComponent = async (req, res) => {
  try {
    const componentId = Number(req.params.componentId);
    const { type, title, amount } = req.body;

    const existingComponent = await prisma.payrollComponent.findUnique({
      where: { id: componentId },
      include: { payroll: true },
    });

    if (!existingComponent) {
      return res.status(404).json({ message: "Component not found" });
    }

    const payroll = existingComponent.payroll;
    if (payroll.locked || payroll.isEditable === false || payroll.status === "PAID") {
      return res.status(400).json({ message: "Payroll is locked or paid and cannot be modified" });
    }

    const updatedComponent = await prisma.payrollComponent.update({
      where: { id: componentId },
      data: {
        ...(type && { type }),
        ...(title && { title }),
        ...(amount !== undefined && { amount: Number(amount) }),
      },
    });

    const totals = await recalculatePayrollTotals(payroll.id);

    res.json({
      success: true,
      component: updatedComponent,
      grossSalary: totals?.grossSalary,
      netSalary: totals?.netSalary
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update component" });
  }
};

exports.deleteComponent = async (req, res) => {
  try {
    const componentId = Number(req.params.componentId);

    const existingComponent = await prisma.payrollComponent.findUnique({
      where: { id: componentId },
      include: { payroll: true },
    });

    if (!existingComponent) {
      return res.status(404).json({ message: "Component not found" });
    }

    const payroll = existingComponent.payroll;
    if (payroll.locked || payroll.isEditable === false || payroll.status === "PAID") {
      return res.status(400).json({ message: "Payroll is locked or paid and cannot be modified" });
    }

    await prisma.payrollComponent.delete({
      where: { id: componentId },
    });

    const totals = await recalculatePayrollTotals(payroll.id);

    res.json({
      success: true,
      message: "Component deleted successfully",
      grossSalary: totals?.grossSalary,
      netSalary: totals?.netSalary
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete component" });
  }
};
exports.getPayrollStats = async (req, res) => {
  try {
    const { month, year } = req.query;
    const monthNum = Number(month);
      const yearNum = Number(year);

  if (!month || !year || isNaN(monthNum) || isNaN(yearNum)) {
    return res.json({
      totalGross: 0,
      totalNet: 0,
      totalOvertime: 0,
      totalAbsentDays: 0,
      totalLeaveDays: 0,
      headcount: 0,
      averageCostPerEmployee: 0,
      variancePercent: 0,
      departmentBreakdown: []
    });
  }
    console.log(req.query)

    if (!month || !year) {
      return res.status(400).json({ message: "Month and year required" });
    }

    const orgId = req.user.orgId;

    const periodStart = moment({ year: Number(year), month: Number(month) - 1 })
      .startOf("month")
      .toDate();

    const periodEnd = moment(periodStart).endOf("month").toDate();

    // 🔥 Current Month Payrolls
    const payrolls = await prisma.payroll.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        employee: { deletedAt: null },
        OR: [
          {
            periodStart: {
              gte: periodStart,
              lte: periodEnd
            }
          },
          {
            periodEnd: {
              gt: periodStart,
              lte: periodEnd
            }
          }
        ]
      },
      include: {
        components: true,
        employee: {
          include: {
            department: true
          }
        }
      }
    });

    const totalGross = payrolls.reduce((s, p) => s + (p.grossSalary || 0), 0);
    const totalNet = payrolls.reduce((s, p) => s + (p.netSalary || 0), 0);
    const totalOvertime = payrolls.reduce((s, p) => {
      const otComp = (p.components || []).find(c => String(c.type || "").toUpperCase() === "OVERTIME");
      if (otComp) return s + (Number(otComp.amount) || 0);
      const hRate = p.payoutType === "hourly" ? (p.rate || 0) : (p.rate ? (p.rate / (26 * 9)) : 0);
      return s + ((Number(p.overtimeHours) || 0) * hRate);
    }, 0);
    const totalAbsentDays = payrolls.reduce((s, p) => s + (p.absentDays || 0), 0);
    const totalLeaveDays = payrolls.reduce((s, p) => s + (p.leaveDays || 0), 0);

    const headcount = payrolls.length;
    const averageCostPerEmployee =
      headcount > 0 ? totalNet / headcount : 0;

    // 🔥 Last Month Variance
    const lastMonthStart = moment(periodStart)
      .subtract(1, "month")
      .startOf("month")
      .toDate();

    const lastMonthEnd = moment(lastMonthStart)
      .endOf("month")
      .toDate();

    const lastMonthPayrolls = await prisma.payroll.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        employee: { deletedAt: null },
        OR: [
          {
            periodStart: {
              gte: lastMonthStart,
              lte: lastMonthEnd
            }
          },
          {
            periodEnd: {
              gt: lastMonthStart,
              lte: lastMonthEnd
            }
          }
        ]
      }
    });

    const lastMonthTotal = lastMonthPayrolls.reduce(
      (s, p) => s + p.netSalary,
      0
    );

    let variancePercent = 0;
    if (lastMonthTotal > 0) {
      variancePercent =
        ((totalNet - lastMonthTotal) / lastMonthTotal) * 100;
    }

    // 🔥 Department Breakdown
    const deptMap = {};

    payrolls.forEach(p => {
      const deptName = p.employee?.department?.title || "No Department";

      if (!deptMap[deptName]) {
        deptMap[deptName] = 0;
      }

      deptMap[deptName] += p.netSalary;
    });

    const departmentBreakdown = Object.keys(deptMap).map(key => ({
      department: key,
      total: deptMap[key]
    }));

    res.json({
      totalGross,
      totalNet,
      totalOvertime,
      totalAbsentDays,
      totalLeaveDays,
      headcount,
      averageCostPerEmployee,
      variancePercent: Number(variancePercent.toFixed(2)),
      departmentBreakdown
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch payroll stats" });
  }
};
exports.getPayrollTrend = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const months = 6;

    const data = [];


    for (let i = months - 1; i >= 0; i--) {
      const start = moment().subtract(i, "months").startOf("month");
      const end = moment(start).endOf("month");

      const payrolls = await prisma.payroll.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
          periodStart: {
            gte: start.toDate(),
            lte: end.toDate()
          }
        }
      });

      const total = payrolls.reduce((s, p) => s + p.netSalary, 0);

      data.push({
        month: start.format("MMM YYYY"),
        total
      });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch trend" });
  }
};
exports.getOvertimeTrend = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const months = 6;

    const data = [];

    for (let i = months - 1; i >= 0; i--) {
      const start = moment().subtract(i, "months").startOf("month");
      const end = moment(start).endOf("month");

      const overtime = await prisma.overtime.aggregate({
        where: {
          organizationId: orgId,
          status: "APPROVED",
          date: {
            gte: start.toDate(),
            lte: end.toDate()
          }
        },
        _sum: { amount: true }
      });

      data.push({
        month: start.format("MMM YYYY"),
        overtime: overtime._sum.amount || 0
      });
    }

    res.json(data);
  } catch(error) {
    console.log(error.message)
    res.status(500).json({ message: "Failed to fetch overtime trend" });
  }
};
exports.getDepartmentBreakdown = async (req, res) => {
  try {
    const { month, year } = req.query;
    const orgId = req.user.orgId;
    const monthNum = Number(month);
const yearNum = Number(year);

    if (!month || !year || isNaN(monthNum) || isNaN(yearNum)) {
      return res.json({
        totalGross: 0,
        totalNet: 0,
        totalOvertime: 0,
        totalAbsentDays: 0,
        totalLeaveDays: 0,
        headcount: 0,
        averageCostPerEmployee: 0,
        variancePercent: 0,
        departmentBreakdown: []
      });
    }

    const start = moment({ year, month: month - 1 }).startOf("month");
    const end = moment(start).endOf("month");

    const payrolls = await prisma.payroll.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        employee: { deletedAt: null },
        OR: [
          {
            periodStart: {
              gte: start.toDate(),
              lte: end.toDate()
            }
          },
          {
            periodEnd: {
              gt: start.toDate(),
              lte: end.toDate()
            }
          }
        ]
      },
      include: {
        employee: { include: { department: true } }
      }
    });

    const deptMap = {};

    payrolls.forEach(p => {
      const dept = p.employee?.department?.title || "No Department";
      deptMap[dept] = (deptMap[dept] || 0) + (p.netSalary || 0);
    });

    const result = Object.keys(deptMap).map(key => ({
      department: key,
      total: deptMap[key]
    }));

    res.json(result);
  } catch(error) {
    console.log(error.message)
    res.status(500).json({ message: "Failed to fetch department breakdown" });
  }
};
exports.getHeadcountStats = async (req, res) => {
  try {
    const orgId = req.user.orgId;

    const activeEmployees = await prisma.employee.count({
      where: { organizationId: orgId, deletedAt: null }
    });

    const payrollCount = await prisma.payroll.count({
      where: { organizationId: orgId, deletedAt: null }
    });

    res.json({
      activeEmployees,
      payrollGenerated: payrollCount,
      difference: activeEmployees - payrollCount
    });

  } catch (error){
    console.log(error.message)
    res.status(500).json({ message: "Failed to fetch headcount" });
  }
};
exports.getAttendanceImpact = async (req, res) => {
  try {
    const { month, year } = req.query;
    const orgId = req.user.orgId;
    const monthNum = Number(month);
    const yearNum = Number(year);

    if (!month || !year || isNaN(monthNum) || isNaN(yearNum)) {
      return res.json({
        totalGross: 0,
        totalNet: 0,
        totalOvertime: 0,
        totalAbsentDays: 0,
        totalLeaveDays: 0,
        headcount: 0,
        averageCostPerEmployee: 0,
        variancePercent: 0,
        departmentBreakdown: []
      });
    }

    const start = moment({ year, month: month - 1 }).startOf("month");
    const end = moment(start).endOf("month");

    const payrolls = await prisma.payroll.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        employee: { deletedAt: null },
        OR: [
          {
            periodStart: {
              gte: start.toDate(),
              lte: end.toDate()
            }
          },
          {
            periodEnd: {
              gt: start.toDate(),
              lte: end.toDate()
            }
          }
        ]
      }
    });

    const totalAbsentDays = payrolls.reduce((s, p) => s + (p.absentDays || 0), 0);
    const totalLeaveDays = payrolls.reduce((s, p) => s + (p.leaveDays || 0), 0);

    res.json({
      totalAbsentDays,
      totalLeaveDays
    });

  } catch {
    res.status(500).json({ message: "Failed to fetch attendance impact" });
  
  }
};
exports.getRiskAlerts = async (req, res) => {
  try {
    const { month, year } = req.query;
    const orgId = req.user.orgId;
    const monthNum = Number(month);
    const yearNum = Number(year);

    if (!month || !year || isNaN(monthNum) || isNaN(yearNum)) {
      return res.json({
        totalGross: 0,
        totalNet: 0,
        totalOvertime: 0,
        totalAbsentDays: 0,
        totalLeaveDays: 0,
        headcount: 0,
        averageCostPerEmployee: 0,
        variancePercent: 0,
        departmentBreakdown: []
      });
    }

    const start = moment({ year, month: month - 1 }).startOf("month");
    const end = moment(start).endOf("month");

    const payrolls = await prisma.payroll.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        employee: { deletedAt: null },
        OR: [
          {
            periodStart: {
              gte: start.toDate(),
              lte: end.toDate()
            }
          },
          {
            periodEnd: {
              gt: start.toDate(),
              lte: end.toDate()
            }
          }
        ]
      },
      include: {
        components: true,
      }
    });

    const totalNet = payrolls.reduce((s, p) => s + p.netSalary, 0);
    const totalOvertime = payrolls.reduce((s, p) => {
      const otComp = (p.components || []).find(c => String(c.type || "").toUpperCase() === "OVERTIME");
      if (otComp) return s + (Number(otComp.amount) || 0);
      const hRate = p.payoutType === "hourly" ? (p.rate || 0) : (p.rate ? (p.rate / (26 * 9)) : 0);
      return s + ((Number(p.overtimeHours) || 0) * hRate);
    }, 0);

    const overtimePercent = totalNet > 0 ? (totalOvertime / totalNet) * 100 : 0;

    const alerts = [];

    if (overtimePercent > 15) {
      alerts.push({
        type: "OVERTIME_HIGH",
        message: `Overtime exceeds 15% (${overtimePercent.toFixed(2)}%)`
      });
    }

    if (payrolls.some(p => p.absentDays > 5)) {
      alerts.push({
        type: "ABSENCE_HIGH",
        message: "High absenteeism detected"
      });
    }

    res.json(alerts);

  } catch (error){
    console.log(error.message)
    res.status(500).json({ message: "Failed to fetch alerts" });
  }
};

exports.updatePayroll = async (req, res) => {
  try {
    const payrollId = Number(req.params.id);
    const { rate, overtimeAmount, bonus, grossDeductions, status, paymentMethod, transactionRef, paidAt } = req.body;

    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId },
      include: { components: true }
    });

    if (!payroll) {
      return res.status(404).json({ message: "Payroll not found" });
    }

    if (payroll.locked) {
      return res.status(400).json({ message: "Locked payroll cannot be modified" });
    }

    const updateData = {};
    if (rate !== undefined && !isNaN(Number(rate))) {
      updateData.rate = Number(rate);
      updateData.grossSalary = Number(rate);
    }
    if (status !== undefined) {
      updateData.status = status;
      if (status === "PAID") {
        updateData.paidAt = paidAt ? new Date(paidAt) : new Date();
      } else {
        updateData.paidAt = null;
      }
    }
    if (paymentMethod !== undefined) {
      updateData.paymentMethod = paymentMethod;
    }
    if (transactionRef !== undefined) {
      updateData.transactionRef = transactionRef;
    }
    if (paidAt !== undefined && status === "PAID") {
      updateData.paidAt = new Date(paidAt);
    }

    if (overtimeAmount !== undefined && !isNaN(Number(overtimeAmount))) {
      const otComp = payroll.components.find(c => String(c.type).toUpperCase() === "OVERTIME");
      if (otComp) {
        await prisma.payrollComponent.update({
          where: { id: otComp.id },
          data: { amount: Number(overtimeAmount) }
        });
      } else if (Number(overtimeAmount) > 0) {
        await prisma.payrollComponent.create({
          data: {
            payrollId,
            type: "OVERTIME",
            title: "Overtime",
            amount: Number(overtimeAmount)
          }
        });
      }
    }

    if (bonus !== undefined && !isNaN(Number(bonus))) {
      const bonusComp = payroll.components.find(c => String(c.type).toUpperCase() === "BONUS");
      if (bonusComp) {
        await prisma.payrollComponent.update({
          where: { id: bonusComp.id },
          data: { amount: Number(bonus) }
        });
      } else if (Number(bonus) > 0) {
        await prisma.payrollComponent.create({
          data: {
            payrollId,
            type: "BONUS",
            title: "Bonus",
            amount: Number(bonus)
          }
        });
      }
    }

    if (grossDeductions !== undefined && !isNaN(Number(grossDeductions))) {
      const dedComp = payroll.components.find(c => String(c.type).toUpperCase() === "DEDUCTION");
      if (dedComp) {
        await prisma.payrollComponent.update({
          where: { id: dedComp.id },
          data: { amount: Number(grossDeductions) }
        });
      } else if (Number(grossDeductions) > 0) {
        await prisma.payrollComponent.create({
          data: {
            payrollId,
            type: "DEDUCTION",
            title: "General Deduction",
            amount: Number(grossDeductions)
          }
        });
      }
    }

    const allComponents = await prisma.payrollComponent.findMany({
      where: { payrollId }
    });

    const currentBaseSalary = updateData.rate !== undefined ? updateData.rate : payroll.rate;
    const extraEarnings = allComponents
      .filter(c => ["BASIC","ALLOWANCE","BONUS","COMMISSION","OVERTIME","INCREMENT","KPIS","BOUNTY","ARREARS"].includes(String(c.type || "").toUpperCase()))
      .reduce((s, c) => s + Number(c.amount || 0), 0);
    const extraDeductions = allComponents
      .filter(c => ["TAX","LOAN","DEDUCTION","TARDIES","UNPAID","FOOD","CT","GYM","ADVANCE"].includes(String(c.type || "").toUpperCase()))
      .reduce((s, c) => s + Number(c.amount || 0), 0);

    updateData.netSalary = Math.max(0, currentBaseSalary + extraEarnings - extraDeductions);

    const updated = await prisma.payroll.update({
      where: { id: payrollId },
      data: updateData,
      include: { components: true }
    });

    res.json({ success: true, message: "Payroll updated successfully", data: updated });
  } catch (error) {
    console.error("Update Payroll Error:", error);
    res.status(500).json({ message: "Failed to update payroll" });
  }
};

exports.calculatePayrollAttendance = calculatePayrollAttendance;