require("dotenv").config();
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

async function main() {
  console.log("🌱 Seeding database...");

  // 1️⃣ Create Organization
  const org = await prisma.organization.create({
    data: {
      name: "Renoranker Test Org",
      category: "HRM",
    },
  });

  console.log("✅ Organization created");

  // 2️⃣ Create Company (Location)
  const company = await prisma.company.create({
    data: {
      name: "Head Office",
      address: "Karachi",
      organizationId: org.id,
    },
  });

  console.log("✅ Company created");

  // Password hash
  const passwordHash = await bcrypt.hash("123456", 10);

  // 3️⃣ ADMIN
  await prisma.employee.create({
    data: {
      firstName: "Admin",
      lastName: "User",
      username: "admin",
      email: "admin@test.com",
      password: passwordHash,
      role: "ADMIN",
      organizationId: org.id,
      companyId: company.id,
    },
  });

  // 4️⃣ SUPERVISOR
  await prisma.employee.create({
    data: {
      firstName: "Supervisor",
      lastName: "User",
      username: "supervisor",
      email: "supervisor@test.com",
      password: passwordHash,
      role: "SUPERVISOR",
      organizationId: org.id,
      companyId: company.id,
    },
  });

  // 5️⃣ AGENT (USER)
  await prisma.employee.create({
    data: {
      firstName: "Agent",
      lastName: "User",
      username: "agent",
      email: "agent@test.com",
      password: passwordHash,
      role: "USER",
      organizationId: org.id,
      companyId: company.id,
    },
  });

  console.log("🎉 Users created successfully!");
  console.log("Login Password for all: 123456");
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
