const DEFAULT_SCHEDULE_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

/**
 * Build the default schedule payload for a newly created/provisioned employee.
 */
function buildDefaultScheduleData(employee, options = {}) {
  const overtimeAllowed = Boolean(options.overtimeAllowed);
  const overtimeMinutes =
    options.overtimeMinutes !== undefined && options.overtimeMinutes !== null
      ? Number(options.overtimeMinutes)
      : 120;

  return {
    employeeId: employee.id,
    companyId: options.companyId ?? employee.companyId ?? null,
    startTime: "09:00",
    endTime: "18:00",
    days: DEFAULT_SCHEDULE_DAYS,
    overtimeAllowed,
    overtimeMinutes,
    allowEarlyIn: true,
    earlyInMinutes: 15,
    allowEarlyOut: true,
    earlyOutMinutes: 15,
    allowHalfDay: false,
    halfDayMinutes: 240,
    breaksAllowed: true,
    breakDurations: [15, 15],
  };
}

/**
 * Ensures a non-admin employee has an initial schedule if they have never had one.
 */
async function ensureDefaultScheduleForEmployee(db, employee, options = {}) {
  if (!employee || !employee.id) return null;
  if (String(employee.role || "").toUpperCase() === "ADMIN") return null;

  const existing = await db.schedule.findFirst({
    where: {
      employeeId: employee.id,
      ...(options.onlyCheckActive ? { deletedAt: null } : {}),
    },
    select: { id: true },
  });

  if (existing) return null;

  return await db.schedule.create({
    data: buildDefaultScheduleData(employee, options),
  });
}

/**
 * Backfills default schedules for any active non-admin employees in an organization
 * that have zero schedule records in the database (e.g. auto-provisioned or imported).
 * Intentionally skips employees whose schedules were explicitly soft-deleted.
 */
async function backfillMissingSchedulesForOrg(db, orgId) {
  if (!orgId) return 0;

  const employeesWithoutAnySchedule = await db.employee.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
      NOT: { role: "ADMIN" },
      Schedule: { none: {} },
    },
    select: {
      id: true,
      companyId: true,
      role: true,
    },
  });

  if (!employeesWithoutAnySchedule.length) return 0;

  const rows = employeesWithoutAnySchedule.map((emp) =>
    buildDefaultScheduleData(emp)
  );

  await db.schedule.createMany({ data: rows });
  return rows.length;
}

module.exports = {
  DEFAULT_SCHEDULE_DAYS,
  buildDefaultScheduleData,
  ensureDefaultScheduleForEmployee,
  backfillMissingSchedulesForOrg,
};
