const prisma = require("../../config/prisma");

// Canonical employment statuses. Older values are shown/compared under their new name.
const EMPLOYMENT_STATUSES = ["Internship", "Probation", "Permanent", "Contract", "Part-time"];
const STATUS_ALIASES = {
  "full-time": "Permanent",
  "fulltime": "Permanent",
  "active": "Permanent",
  "permanent": "Permanent",
  "on-contract": "Contract",
  "contract": "Contract",
  "intern": "Internship",
  "internship": "Internship",
  "probation": "Probation",
  "part-time": "Part-time",
  "parttime": "Part-time",
  "separated": "Separated",
};

const normalizeStatus = (v) => {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  return STATUS_ALIASES[String(v).trim().toLowerCase()] || String(v).trim();
};

const fullName = (p) => (p ? `${p.firstName || ""} ${p.lastName || ""}`.trim() || null : null);

// Everything a change log compares, as display values
async function loadSnapshot(employeeId) {
  const e = await prisma.employee.findUnique({
    where: { id: Number(employeeId) },
    include: {
      jobInfo: true,
      entity: { select: { name: true } },
      department: { select: { title: true } },
      company: { select: { name: true } },
      supervisor: { select: { firstName: true, lastName: true } },
    },
  });
  if (!e) return null;
  return {
    employmentStatus: normalizeStatus(e.jobInfo?.employmentStatus),
    entity: e.entity?.name || null,
    department: e.department?.title || null,
    location: e.company?.name || null,
    supervisor: fullName(e.supervisor),
    designation: e.jobInfo?.designation || null,
  };
}

async function getActorName(userId) {
  if (!userId) return null;
  try {
    const u = await prisma.employee.findUnique({
      where: { id: Number(userId) },
      select: { firstName: true, lastName: true },
    });
    return fullName(u);
  } catch {
    return null;
  }
}

const FIELD_LABELS = {
  employmentStatus: "Employment Status",
  entity: "Entity",
  department: "Department",
  location: "Location",
  supervisor: "Supervisor",
  designation: "Designation",
  separation: "Separation",
};

async function addLog(employeeId, { field, oldValue = null, newValue = null, note = null }, actor) {
  return prisma.employeeChangeLog.create({
    data: {
      employeeId: Number(employeeId),
      field,
      oldValue: oldValue === null || oldValue === undefined ? null : String(oldValue).slice(0, 255),
      newValue: newValue === null || newValue === undefined ? null : String(newValue).slice(0, 255),
      note,
      changedById: actor?.id ? Number(actor.id) : null,
      changedByName: actor?.name || null,
    },
  });
}

// Writes one log row per changed field. Never throws (logging must not break saves).
async function logSnapshotChanges(employeeId, before, after, actorUser) {
  try {
    if (!before || !after) return 0;
    const actor = { id: actorUser?.id, name: await getActorName(actorUser?.id) };
    let n = 0;
    for (const field of Object.keys(FIELD_LABELS)) {
      if (!(field in after)) continue;
      const a = before[field] ?? null;
      const b = after[field] ?? null;
      if (a === b) continue;
      await addLog(employeeId, { field, oldValue: a, newValue: b }, actor);
      n++;
    }
    return n;
  } catch (err) {
    console.error("[EmployeeChangeLog] failed to write log:", err.message);
    return 0;
  }
}

module.exports = {
  EMPLOYMENT_STATUSES,
  FIELD_LABELS,
  normalizeStatus,
  loadSnapshot,
  getActorName,
  addLog,
  logSnapshotChanges,
};
