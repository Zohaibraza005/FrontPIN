const prisma = require('./src/config/prisma');

async function fixPayrollRecords() {
  try {
    const payrolls = await prisma.payroll.findMany({
      include: { components: true }
    });
    console.log(`Found ${payrolls.length} payroll records in database.`);

    for (const p of payrolls) {
      const base = Number(p.rate || p.grossSalary || 0);

      const extraEarnings = (p.components || [])
        .filter(c => ['BASIC','ALLOWANCE','BONUS','COMMISSION','OVERTIME','INCREMENT','KPIS','BOUNTY','ARREARS'].includes(String(c.type || '').toUpperCase()))
        .reduce((s, c) => s + Number(c.amount || 0), 0);

      const extraDeductions = (p.components || [])
        .filter(c => ['TAX','LOAN','DEDUCTION','TARDIES','UNPAID','FOOD','CT','GYM','ADVANCE'].includes(String(c.type || '').toUpperCase()))
        .reduce((s, c) => s + Number(c.amount || 0), 0);

      const grossSalary = base + extraEarnings;
      const netSalary = Math.max(0, grossSalary - extraDeductions);

      console.log(`Updating Payroll ID ${p.id} for employee ${p.employeeId}: Old Net: ${p.netSalary} => New Net: ${netSalary}`);

      await prisma.payroll.update({
        where: { id: p.id },
        data: {
          grossSalary,
          netSalary,
        }
      });
    }

    console.log("Successfully updated all database payroll records!");
  } catch (err) {
    console.error("Error updating payroll records:", err);
  } finally {
    await prisma.$disconnect();
  }
}

fixPayrollRecords();
