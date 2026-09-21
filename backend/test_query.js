const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const a = await prisma.attendance.findUnique({
    where: { id: 43659 },
    include: { punches: true }
  });
  console.log('Record 43659:', a);

  // Also check Raza R (id around 43660 or so)
  const raza = await prisma.employee.findFirst({
    where: { firstName: { contains: 'Raza' } },
    include: {
      Attendance: {
        where: {
          date: {
            gte: new Date('2026-09-20T00:00:00Z')
          }
        },
        include: { punches: true }
      }
    }
  });
  console.log('Raza attendance:', raza?.Attendance);
}

main().catch(console.error).finally(() => prisma.$disconnect());
