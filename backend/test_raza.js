const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const razaAtt = await prisma.attendance.findUnique({
    where: { id: 43762 },
    include: { punches: true }
  });
  console.log('Raza attendance 43762:', razaAtt);
}

main().catch(console.error).finally(() => prisma.$disconnect());
