const prisma = require("../../config/prisma");

/**
 * Fetch all active day overrides for an organization, optionally filtered by date range
 */
async function getDayOverrides({ organizationId, startDate, endDate, date }) {
  let query = `
    SELECT d.id, d.date, d.type, d.reason, d.scope, d.departmentId, d.companyId, d.employeeId, d.organizationId, d.createdById, d.createdAt,
           dept.title as departmentTitle, 
           c.name as companyName, 
           CONCAT(e.firstName, ' ', e.lastName) as employeeName
    FROM day_override d
    LEFT JOIN department dept ON d.departmentId = dept.id
    LEFT JOIN company c ON d.companyId = c.id
    LEFT JOIN employee e ON d.employeeId = e.id
    WHERE d.organizationId = ? AND d.deletedAt IS NULL
  `;
  const params = [organizationId];

  if (date) {
    query += ` AND d.date = ?`;
    params.push(date.slice(0, 10));
  } else {
    if (startDate) {
      query += ` AND d.date >= ?`;
      params.push(startDate.slice(0, 10));
    }
    if (endDate) {
      query += ` AND d.date <= ?`;
      params.push(endDate.slice(0, 10));
    }
  }

  query += ` ORDER BY d.date DESC, d.createdAt DESC`;

  const rows = await prisma.$queryRawUnsafe(query, ...params);
  return rows;
}

/**
 * Create or replace a day override
 */
async function createDayOverride({
  date,
  type,
  reason,
  scope,
  departmentId,
  companyId,
  employeeId,
  organizationId,
  createdById,
}) {
  const cleanDate = date.slice(0, 10);
  const cleanScope = scope ? scope.toUpperCase() : "ALL";
  const cleanType = type ? type.toUpperCase() : "WORK_DAY";
  const deptId = departmentId ? Number(departmentId) : null;
  const compId = companyId ? Number(companyId) : null;
  const empId = employeeId ? Number(employeeId) : null;

  // Deactivate any existing identical scope override for this date
  let deleteQuery = `
    UPDATE day_override 
    SET deletedAt = NOW() 
    WHERE organizationId = ? AND date = ? AND scope = ? AND deletedAt IS NULL
  `;
  const deleteParams = [organizationId, cleanDate, cleanScope];

  if (cleanScope === "DEPARTMENT" && deptId) {
    deleteQuery += ` AND departmentId = ?`;
    deleteParams.push(deptId);
  } else if (cleanScope === "LOCATION" && compId) {
    deleteQuery += ` AND companyId = ?`;
    deleteParams.push(compId);
  } else if (cleanScope === "EMPLOYEE" && empId) {
    deleteQuery += ` AND employeeId = ?`;
    deleteParams.push(empId);
  }

  await prisma.$executeRawUnsafe(deleteQuery, ...deleteParams);

  // Insert new override
  await prisma.$executeRawUnsafe(
    `INSERT INTO day_override 
      (date, type, reason, scope, departmentId, companyId, employeeId, organizationId, createdById)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    cleanDate,
    cleanType,
    reason || "",
    cleanScope,
    deptId,
    compId,
    empId,
    organizationId,
    createdById || null
  );

  const rows = await prisma.$queryRawUnsafe(
    `SELECT * FROM day_override WHERE organizationId = ? AND date = ? AND deletedAt IS NULL ORDER BY id DESC LIMIT 1`,
    organizationId,
    cleanDate
  );

  return rows[0] || null;
}

/**
 * Delete / cancel a day override
 */
async function deleteDayOverride(id, organizationId) {
  await prisma.$executeRawUnsafe(
    `UPDATE day_override SET deletedAt = NOW() WHERE id = ? AND organizationId = ?`,
    Number(id),
    organizationId
  );
  return { success: true };
}

/**
 * Resolve the matching DayOverride for a specific employee on a specific date
 * Resolution Priority:
 * 1. Specific EMPLOYEE override
 * 2. DEPARTMENT override
 * 3. LOCATION override
 * 4. ALL organization override
 */
function resolveOverrideForEmployee(employee, dateStr, overrides) {
  if (!overrides || overrides.length === 0) return null;

  const targetDate = String(dateStr).slice(0, 10);
  const matchingDateOverrides = overrides.filter(
    (o) => String(o.date).slice(0, 10) === targetDate && !o.deletedAt
  );

  if (matchingDateOverrides.length === 0) return null;

  // 1. Specific Employee
  const empMatch = matchingDateOverrides.find(
    (o) => o.scope === "EMPLOYEE" && Number(o.employeeId) === Number(employee.id)
  );
  if (empMatch) return empMatch;

  // 2. Department
  if (employee.departmentId) {
    const deptMatch = matchingDateOverrides.find(
      (o) => o.scope === "DEPARTMENT" && Number(o.departmentId) === Number(employee.departmentId)
    );
    if (deptMatch) return deptMatch;
  }

  // 3. Location / Company
  if (employee.companyId) {
    const compMatch = matchingDateOverrides.find(
      (o) => o.scope === "LOCATION" && Number(o.companyId) === Number(employee.companyId)
    );
    if (compMatch) return compMatch;
  }

  // 4. All Employees
  const allMatch = matchingDateOverrides.find((o) => o.scope === "ALL");
  if (allMatch) return allMatch;

  return null;
}

module.exports = {
  getDayOverrides,
  createDayOverride,
  deleteDayOverride,
  resolveOverrideForEmployee,
};
