const prisma = require("../../config/prisma");
const moment = require("moment");

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
        Schedule: { where: { deletedAt: null } }
      }
    });

    if (!employee || !employee.payroll) {
      return res.status(404).json({ message: "Employee payroll settings not found" });
    }

    const { payoutType, rate, currency, cycleDate } = employee.payroll;

    // 🔹 Calculate Payroll Period
    const periodEnd = moment({ year, month: month - 1, day: cycleDate });
    const periodStart = periodEnd.clone().subtract(1, "month");

    // 🔹 Hiring Date Adjustment
    if (employee.jobInfo?.hiringDate) {
      const hiringDate = moment(employee.jobInfo.hiringDate);
      if (hiringDate.isBetween(periodStart, periodEnd)) {
        periodStart = hiringDate.clone();
      }
    }

    // 🔥 Prevent Duplicate Payroll
    const existingPayroll = await prisma.payroll.findFirst({
      where: {
        employeeId: Number(employeeId),
        periodStart: periodStart.toDate(),
        periodEnd: periodEnd.toDate()
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

    const overtimeHours = overtimes.reduce((sum, o) => sum + o.hours, 0);
    const overtimeAmount = overtimes.reduce(
      (sum, o) => sum + (o.hours * rate * (o.rate || 1)),
      0
    );

    // 🔹 Day Calculation
    const totalDays = periodEnd.diff(periodStart, "days");
    const presentDays = attendances.filter(a => a.status === "PRESENT").length;
    const lateDays = attendances.filter(a => a.isLate).length;

    let leaveDays = 0;
    leaves.forEach(l => {
      leaveDays += moment(l.endDate).diff(moment(l.startDate), "days") + 1;
    });

    const absentDays = totalDays - presentDays - leaveDays;

    // 🔹 Salary Calculation
    let grossSalary = 0;

    if (payoutType === "daily") {
      grossSalary = rate * presentDays;
    }

    if (payoutType === "hourly") {
      const totalMinutes = attendances.reduce(
        (sum, a) => sum + a.totalWorkedMinutes,
        0
      );
      const hoursWorked = totalMinutes / 60;
      grossSalary = rate * hoursWorked;
    }

    if (payoutType === "monthly") {
      grossSalary = rate;
    }

    grossSalary += overtimeAmount;
    grossSalary += Number(bonus);
    grossSalary -= Number(deductions);

    const payroll = await prisma.payroll.create({
      data: {
        employeeId: Number(employeeId),
        organizationId: req.user.orgId,
        periodStart: periodStart.toDate(),
        periodEnd: periodEnd.toDate(),
        payoutType,
        rate,
        currency,
        workingDays: totalDays,
        presentDays,
        absentDays,
        leaveDays,
        lateDays,
        overtimeHours,
        overtimeAmount,
        bonus: Number(bonus),
        deductions: Number(deductions),
        grossSalary,
        netSalary: grossSalary,
        createdById: req.user.id
      }
    });

    res.json({ success: true, payroll });

  } catch (error) {
    console.error(error);
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
      Schedule: true
    };

    if (type === "INDIVIDUAL") {
      employees = await prisma.employee.findMany({
        where: { id: { in: employeeIds || [] }, deletedAt: null },
        include: baseInclude
      });
    }

    if (type === "DEPARTMENT") {
      employees = await prisma.employee.findMany({
        where: { departmentId: { in: departmentIds || [] }, deletedAt: null },
        include: baseInclude
      });
    }

    if (type === "LOCATION") {
      employees = await prisma.employee.findMany({
        where: { companyId: { in: locationIds || [] }, deletedAt: null },
        include: baseInclude
      });
    }

    let generated = 0;
    let skipped = 0;

    //////////////////////////////////////////////////////
    // LOOP EACH EMPLOYEE
    //////////////////////////////////////////////////////
    console.log(employees)

    for (const emp of employees) {

      if (!emp.payroll) continue;

      const cycleDate = emp.payroll.cycleDate;

      let periodEnd = moment({ year, month: month - 1 }).date(cycleDate);
      let periodStart = periodEnd.clone().subtract(1, "month");

      const hiringDate = emp.jobInfo?.hiringDate
        ? moment(emp.jobInfo.hiringDate)
        : null;

      // ❌ Skip if hired after cycle end
      if (hiringDate && hiringDate.isAfter(periodEnd)) {
        skipped++;
        continue;
      }

      // 🔥 Prorate start date
      if (hiringDate && hiringDate.isAfter(periodStart)) {
        periodStart = hiringDate.clone();
      }

      // 🔁 Prevent duplicate
      const existing = await prisma.payroll.findFirst({
        where: {
          employeeId: emp.id,
          periodStart: periodStart.toDate(),
          periodEnd: periodEnd.toDate(),
          deletedAt: null
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
          date: { gte: periodStart.toDate(), lte: periodEnd.toDate() }
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
      // WORKING DAYS USING SCHEDULE
      //////////////////////////////////////////////////////

      const rawScheduleDays = emp.Schedule?.[0]?.days || [];
      const scheduleDays = Array.isArray(rawScheduleDays)
        ? rawScheduleDays.map(d => typeof d === "object" && d !== null ? (d.day || d.dayFull || d.name || "") : String(d || "")).map(s => s.trim().toLowerCase())
        : [];

      let workingDays = 0;
      let cursor = periodStart.clone();

      while (cursor.isSameOrBefore(periodEnd)) {
        const dShort = cursor.format("ddd").toLowerCase();
        const dFull = cursor.format("dddd").toLowerCase();
        if (scheduleDays.includes(dShort) || scheduleDays.includes(dFull)) {
          workingDays++;
        }
        cursor.add(1, "day");
      }

      //////////////////////////////////////////////////////
      // ATTENDANCE COUNTS
      //////////////////////////////////////////////////////

      const presentDays = attendance.filter(a => a.status === "PRESENT").length;
      const absentDays  = attendance.filter(a => a.status === "ABSENT").length;
      const lateDays    = attendance.filter(a => a.isLate).length;

      //////////////////////////////////////////////////////
      // LEAVES
      //////////////////////////////////////////////////////

      let paidLeaves = 0;
      let unpaidLeaves = 0;

      for (const leave of leaves) {
        if (leave.payType === "PAID") paidLeaves += leave.days;
        if (leave.payType === "UNPAID") unpaidLeaves += leave.days;
      }

      //////////////////////////////////////////////////////
      // OVERTIME
      //////////////////////////////////////////////////////

      const overtime = await prisma.overtime.aggregate({
        where: {
          employeeId: emp.id,
          status: "APPROVED",
          date: { gte: periodStart.toDate(), lte: periodEnd.toDate() }
        },
        _sum: { hours: true, amount: true }
      });

      const overtimeHours = overtime._sum.hours || 0;
      const overtimeAmount = overtime._sum.amount || 0;

      //////////////////////////////////////////////////////
      // SALARY LOGIC
      //////////////////////////////////////////////////////

      let grossSalary = 0;
      let dailyRate = 0;

      if (emp.payroll.payoutType === "daily") {

        dailyRate = emp.payroll.rate;

        grossSalary =
          (presentDays + paidLeaves) * dailyRate;

        const deduction =
          (absentDays + unpaidLeaves) * dailyRate;

        grossSalary -= deduction;
      }

      if (emp.payroll.payoutType === "hourly") {

        const totalMinutes = attendance.reduce(
          (sum, a) => sum + (a.totalWorkedMinutes || 0),
          0
        );

        const totalHours = totalMinutes / 60;

        grossSalary = totalHours * emp.payroll.rate;
      }

      if (emp.payroll.payoutType === "monthly") {

        dailyRate = emp.payroll.rate / workingDays;

        grossSalary =
          (presentDays + paidLeaves) * dailyRate;

        const deduction =
          (absentDays + unpaidLeaves) * dailyRate;

        grossSalary -= deduction;
      }

      grossSalary += overtimeAmount;

      const netSalary = grossSalary;

      //////////////////////////////////////////////////////
      // CREATE PAYROLL
      //////////////////////////////////////////////////////

      await prisma.payroll.create({
        data: {
          employeeId: emp.id,
          organizationId: emp.organizationId,
          periodStart: periodStart.toDate(),
          periodEnd: periodEnd.toDate(),
          payoutType: emp.payroll.payoutType,
          rate: emp.payroll.rate,
          currency: emp.payroll.currency,
          workingDays,
          presentDays,
          absentDays,
          leaveDays: paidLeaves + unpaidLeaves,
          lateDays,
          overtimeHours,
          grossSalary,
          netSalary,
          createdById: user.id
        }
      });

      generated++;
    }

    res.json({ success: true, generated, skipped });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Payroll generation failed" });
  }
};
exports.getPayrolls = async (req, res) => {
  try {
    const { month, year, status } = req.query;
    // const monthNum = Number(month);
    // const yearNum = Number(year);

    // if (!month || !year || isNaN(monthNum) || isNaN(yearNum)) {
    //   return res.json({
    //     totalGross: 0,
    //     totalNet: 0,
    //     totalOvertime: 0,
    //     totalAbsentDays: 0,
    //     totalLeaveDays: 0,
    //     headcount: 0,
    //     averageCostPerEmployee: 0,
    //     variancePercent: 0,
    //     departmentBreakdown: []
    //   });
    // }
    

    const where = {
      organizationId: req.user.orgId,
      deletedAt: null
    };

    if (req.user.role !== "ADMIN") {
      where.employeeId = req.user.id;
    }

    if (month && year) {
      const startDate = moment({ year: Number(year), month: Number(month) - 1 })
        .startOf("month")
        .toDate();

      const endDate = moment(startDate).endOf("month").toDate();

      where.periodStart = {
        gte: startDate,
        lte: endDate
      };
    }

    if (status && status !== "all") {
      where.status = status;
    }

    const payrolls = await prisma.payroll.findMany({
      where,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true
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

      const extraEarnings = p.components
        .filter(c =>
          ["BASIC","ALLOWANCE","BONUS","COMMISSION","OVERTIME","INCREMENT","KPIS","BOUNTY","ARREARS"].includes(String(c.type || "").toUpperCase())
        )
        .reduce((s, c) => s + Number(c.amount || 0), 0);

      const extraDeductions = p.components
        .filter(c =>
          ["TAX","LOAN","DEDUCTION","TARDIES","UNPAID","FOOD","CT","GYM","ADVANCE"].includes(String(c.type || "").toUpperCase())
        )
        .reduce((s, c) => s + Number(c.amount || 0), 0);

      const overtimeAmount = p.components
        .filter(c => String(c.type).toUpperCase() === "OVERTIME")
        .reduce((s, c) => s + Number(c.amount || 0), 0);

      const bonus = p.components
        .filter(c => String(c.type).toUpperCase() === "BONUS")
        .reduce((s, c) => s + Number(c.amount || 0), 0);

      const grossEarnings = baseSalary + extraEarnings;
      const grossDeductions = extraDeductions;
      const netSalary = Math.max(0, grossEarnings - grossDeductions);

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
    console.error(error);
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

    const rawScheduleDays = payroll.employee.Schedule?.[0]?.days || [];
    const scheduleDays = Array.isArray(rawScheduleDays)
      ? rawScheduleDays.map(d => typeof d === "object" && d !== null ? (d.day || d.dayFull || d.name || "") : String(d || "")).map(s => s.trim().toLowerCase())
      : [];

    let workingDaysCalculated = 0;
    let cursor = moment(payroll.periodStart);

    while (cursor.isSameOrBefore(payroll.periodEnd)) {
      const dShort = cursor.format("ddd").toLowerCase();
      const dFull = cursor.format("dddd").toLowerCase();
      if (scheduleDays.includes(dShort) || scheduleDays.includes(dFull)) {
        workingDaysCalculated++;
      }
      cursor.add(1, "day");
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

    const grossEarnings = baseSalary + extraEarnings;
    const grossDeductions = extraDeductions;
    const computedNetSalary = Math.max(0, grossEarnings - grossDeductions);

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
    const { status } = req.body;
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

    const updated = await prisma.payroll.update({
      where: { id: payrollId },
      data: {
        status,
        paidAt: status === "PAID" ? new Date() : null
      }
    });

    // Optional: Add audit log
    await prisma.payrollAuditLog.create({
      data: {
        payrollId,
        action: status,
        performedById: user.id,
        note: `Payroll marked as ${status}`
      }
    });

    res.json(updated);

  } catch (err) {
    res.status(500).json({ message: "Failed to update status" });
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
      include: { payroll: true }
    });

    let totalGross = 0;
    let totalNet = 0;
    let count = 0;

    for (const emp of employees) {
      if (!emp.payroll) continue;

      const grossSalary = emp.payroll.rate;
      const netSalary = grossSalary;

      const payroll = await prisma.payroll.create({
        data: {
          employeeId: emp.id,
          organizationId: run.organizationId,
          runId: run.id,
          periodStart: moment({ year: run.year, month: run.month - 1 }).startOf("month").toDate(),
          periodEnd: moment({ year: run.year, month: run.month - 1 }).endOf("month").toDate(),
          payoutType: emp.payroll.payoutType,
          rate: emp.payroll.rate,
          currency: emp.payroll.currency,
          workingDays: 30,
          presentDays: 30,
          absentDays: 0,
          leaveDays: 0,
          lateDays: 0,
          grossSalary,
          netSalary,
          createdById: req.user.id
        }
      });

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

    res.json({ message: "Payroll generated successfully" });

  } catch (err) {
    console.log(err);
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

  await prisma.payrollRun.update({
    where: { id: runId },
    data: { status: "PAID" }
  });

  await prisma.payroll.updateMany({
    where: { runId },
    data: {
      status: "PAID",
      paidAt: new Date()
    }
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

    // 🔥 Recalculate Payroll Totals
    const components = await prisma.payrollComponent.findMany({
      where: { payrollId }
    });

    const earnings = components
      .filter(c =>
        ["BASIC", "ALLOWANCE", "BONUS", "COMMISSION", "OVERTIME"].includes(c.type)
      )
      .reduce((sum, c) => sum + c.amount, 0);

    const deductions = components
      .filter(c =>
        ["TAX", "LOAN", "DEDUCTION"].includes(c.type)
      )
      .reduce((sum, c) => sum + c.amount, 0);

    const netSalary = earnings - deductions;

    await prisma.payroll.update({
      where: { id: payrollId },
      data: {
        netSalary
      }
    });

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
      netSalary
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

    const components = await prisma.payrollComponent.findMany({
      where: { payrollId: payroll.id }
    });

    const earnings = components
      .filter(c => ["BASIC", "ALLOWANCE", "BONUS", "COMMISSION", "OVERTIME"].includes(c.type))
      .reduce((sum, c) => sum + c.amount, 0);

    const deductions = components
      .filter(c => ["TAX", "LOAN", "DEDUCTION"].includes(c.type))
      .reduce((sum, c) => sum + c.amount, 0);

    const netSalary = earnings - deductions;

    await prisma.payroll.update({
      where: { id: payroll.id },
      data: { netSalary }
    });

    res.json({ success: true, component: updatedComponent, netSalary });
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

    const components = await prisma.payrollComponent.findMany({
      where: { payrollId: payroll.id }
    });

    const earnings = components
      .filter(c => ["BASIC", "ALLOWANCE", "BONUS", "COMMISSION", "OVERTIME"].includes(c.type))
      .reduce((sum, c) => sum + c.amount, 0);

    const deductions = components
      .filter(c => ["TAX", "LOAN", "DEDUCTION"].includes(c.type))
      .reduce((sum, c) => sum + c.amount, 0);

    const netSalary = earnings - deductions;

    await prisma.payroll.update({
      where: { id: payroll.id },
      data: { netSalary }
    });

    res.json({ success: true, message: "Component deleted successfully", netSalary });
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
        periodStart: {
          gte: periodStart,
          lte: periodEnd
        }
      },
      include: {
        employee: {
          include: {
            department: true
          }
        }
      }
    });

    const totalGross = payrolls.reduce((s, p) => s + p.grossSalary, 0);
    const totalNet = payrolls.reduce((s, p) => s + p.netSalary, 0);
    const totalOvertime = payrolls.reduce((s, p) => s + p.overtimeHours * p.rate, 0);
    const totalAbsentDays = payrolls.reduce((s, p) => s + p.absentDays, 0);
    const totalLeaveDays = payrolls.reduce((s, p) => s + p.leaveDays, 0);

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
        periodStart: {
          gte: lastMonthStart,
          lte: lastMonthEnd
        }
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
        periodStart: {
          gte: start.toDate(),
          lte: end.toDate()
        }
      },
      include: {
        employee: { include: { department: true } }
      }
    });

    const deptMap = {};

    payrolls.forEach(p => {
      const dept = p.employee?.department?.title || "No Department";
      deptMap[dept] = (deptMap[dept] || 0) + p.netSalary;
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
    console.log(start)
    console.log(end)

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

    const totalAbsentDays = payrolls.reduce((s, p) => s + p.absentDays, 0);
    const totalLeaveDays = payrolls.reduce((s, p) => s + p.leaveDays, 0);

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
        periodStart: {
          gte: start.toDate(),
          lte: end.toDate()
        }
      }
    });

    const totalNet = payrolls.reduce((s, p) => s + p.netSalary, 0);
    const totalOvertime = payrolls.reduce((s, p) => s + p.overtimeHours * p.rate, 0);

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
    const { rate, overtimeAmount, bonus, grossDeductions, status } = req.body;

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
        updateData.paidAt = new Date();
      }
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
            title: "Overtime Pay",
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