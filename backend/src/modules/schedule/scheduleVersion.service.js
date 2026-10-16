const prisma = require("../../config/prisma");
const moment = require("moment-timezone");
const { addLog, getActorName } = require("../users/employeeLog.service");

// Schedule history. Every change is stored as a version that applies from `effectiveFrom`
// (local "YYYY-MM-DD") until the next version starts. Attendance for a date is evaluated with
// the version valid on that date, so days worked before a change keep their old timing.

const DEFAULT_TZ = "Asia/Karachi";
const BASELINE_DATE = "1970-01-01";
const SNAP_FIELDS = [
  "days", "startTime", "endTime", "companyId",
  "allowEarlyIn", "earlyInMinutes", "allowEarlyOut", "earlyOutMinutes",
  "overtimeAllowed", "overtimeMinutes", "allowHalfDay", "halfDayMinutes",
  "breaksAllowed", "breakDurations",
];

const todayLocal = (tz = DEFAULT_TZ) => moment().tz(tz).format("YYYY-MM-DD");

// "YYYY-MM-DD" from the request, or today when missing/invalid
function parseEffectiveFrom(value, tz = DEFAULT_TZ) {
  const s = String(value || "").slice(0, 10);
  return moment(s, "YYYY-MM-DD", true).isValid() ? s : todayLocal(tz);
}

function snapshotOf(sched) {
  if (!sched) return null;
  const snap = {};
  for (const f of SNAP_FIELDS) snap[f] = sched[f] === undefined ? null : sched[f];
  snap.allowEarlyIn = Boolean(snap.allowEarlyIn);
  snap.allowEarlyOut = Boolean(snap.allowEarlyOut);
  snap.overtimeAllowed = Boolean(snap.overtimeAllowed);
  snap.allowHalfDay = Boolean(snap.allowHalfDay);
  snap.breaksAllowed = Boolean(snap.breaksAllowed);
  if (!Array.isArray(snap.days)) snap.days = [];
  if (!Array.isArray(snap.breakDurations)) snap.breakDurations = [];
  return snap;
}

// ── human readable summaries for the History tab ────────────────────────────
const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const to12 = (t) => (t ? moment(t, "HH:mm").format("hh:mm A") : "—");
const dayKey = (d) => String(typeof d === "object" && d ? d.day || d.dayFull || d.name || d.short || "" : d || "")
  .trim().toLowerCase().slice(0, 3);

function summarize(snap) {
  if (!snap) return null;
  const days = (snap.days || [])
    .map((d) => ({ key: dayKey(d), start: (typeof d === "object" && d?.startTime) || snap.startTime, end: (typeof d === "object" && d?.endTime) || snap.endTime }))
    .filter((d) => DAY_ORDER.includes(d.key))
    .sort((a, b) => DAY_ORDER.indexOf(a.key) - DAY_ORDER.indexOf(b.key));
  const label = (k) => k.charAt(0).toUpperCase() + k.slice(1);
  if (!days.length) return `${to12(snap.startTime)} – ${to12(snap.endTime)}`;
  const sameTime = days.every((d) => d.start === days[0].start && d.end === days[0].end);
  if (sameTime) {
    // consecutive days as ranges: Mon–Fri, Mon–Sun, Mon, Wed
    const idx = days.map((d) => DAY_ORDER.indexOf(d.key));
    const runs = [];
    for (const i of idx) {
      const last = runs[runs.length - 1];
      if (last && i === last[1] + 1) last[1] = i;
      else runs.push([i, i]);
    }
    const dayText = runs
      .map(([a, b]) => (b - a >= 2 ? `${label(DAY_ORDER[a])}–${label(DAY_ORDER[b])}` : a === b ? label(DAY_ORDER[a]) : `${label(DAY_ORDER[a])}, ${label(DAY_ORDER[b])}`))
      .join(", ");
    return `${dayText} · ${to12(days[0].start)} – ${to12(days[0].end)}`;
  }
  return days.map((d) => `${label(d.key)} ${to12(d.start)}–${to12(d.end)}`).join(", ");
}

function detailChanges(before, after) {
  if (!before || !after) return [];
  const out = [];
  const mins = (on, m) => (on ? `${Number(m) || 0} min` : "off");
  const pairs = [
    ["Early in", mins(before.allowEarlyIn, before.earlyInMinutes), mins(after.allowEarlyIn, after.earlyInMinutes)],
    ["Early out", mins(before.allowEarlyOut, before.earlyOutMinutes), mins(after.allowEarlyOut, after.earlyOutMinutes)],
    ["Overtime", mins(before.overtimeAllowed, before.overtimeMinutes), mins(after.overtimeAllowed, after.overtimeMinutes)],
    ["Half day", mins(before.allowHalfDay, before.halfDayMinutes), mins(after.allowHalfDay, after.halfDayMinutes)],
    [
      "Breaks",
      before.breaksAllowed ? (before.breakDurations || []).join("+") + " min" : "off",
      after.breaksAllowed ? (after.breakDurations || []).join("+") + " min" : "off",
    ],
  ];
  for (const [name, a, b] of pairs) if (a !== b) out.push(`${name}: ${a} → ${b}`);
  return out;
}

// ── reading ─────────────────────────────────────────────────────────────────
async function loadVersionMap(employeeIds) {
  const ids = [...new Set((employeeIds || []).map(Number).filter(Boolean))];
  const map = new Map();
  if (!ids.length) return map;
  const rows = await prisma.scheduleVersion.findMany({
    where: { employeeId: { in: ids } },
    orderBy: [{ employeeId: "asc" }, { effectiveFrom: "asc" }],
  });
  for (const r of rows) {
    if (!map.has(r.employeeId)) map.set(r.employeeId, []);
    map.get(r.employeeId).push(r);
  }
  return map;
}

function pickVersion(versions, dateStr) {
  if (!versions || !versions.length) return null;
  let found = null;
  for (const v of versions) {
    if (v.effectiveFrom <= dateStr) found = v;
    else break;
  }
  return found || versions[0];
}

// The schedule that applied on dateStr: the current schedule row with the dated version's values
function scheduleForDate(currentSched, versions, dateStr) {
  const v = pickVersion(versions, String(dateStr).slice(0, 10));
  if (!v) return currentSched || null;
  const merged = { ...(currentSched || {}), deletedAt: null };
  for (const f of SNAP_FIELDS) merged[f] = v[f];
  merged.versionEffectiveFrom = v.effectiveFrom;
  return merged;
}

// Convenience for single-employee code paths: [schedule valid on dateStr] in the shape of employee.Schedule
async function schedulesOnDate(employee, dateStr) {
  const list = Array.isArray(employee?.Schedule) ? employee.Schedule : employee?.Schedule ? [employee.Schedule] : [];
  const current = list.find((s) => s && !s.deletedAt) || list[0] || null;
  if (!employee?.id) return list;
  const versions = (await loadVersionMap([employee.id])).get(employee.id);
  const sched = scheduleForDate(current, versions, dateStr);
  return sched ? [sched] : list;
}

// ── writing ─────────────────────────────────────────────────────────────────
/**
 * Record a schedule change. `before` = schedule in force until now (null for a first schedule),
 * `after` = new values. Returns { effectiveFrom, appliesNow }.
 * When appliesNow is false the caller must NOT update the schedule row yet;
 * applyDueScheduleVersions() does it when the date arrives.
 */
async function recordScheduleChange({ employeeId, before, after, effectiveFrom, actorUser, tz = DEFAULT_TZ }) {
  const empId = Number(employeeId);
  const eff = parseEffectiveFrom(effectiveFrom, tz);
  const today = todayLocal(tz);
  const appliesNow = eff <= today;
  const beforeSnap = snapshotOf(before);
  const afterSnap = snapshotOf(after);
  // Saving without any real change must not touch history (or cancel a planned change)
  if (beforeSnap && afterSnap && JSON.stringify(beforeSnap) === JSON.stringify(afterSnap)) {
    return { effectiveFrom: eff, appliesNow: true, unchanged: true };
  }
  const actorName = await getActorName(actorUser?.id);

  const existing = await prisma.scheduleVersion.findMany({ where: { employeeId: empId }, orderBy: { effectiveFrom: "asc" } });

  // First time we see this employee: what they had so far covers all earlier dates
  if (!existing.length) {
    const baseline = beforeSnap || afterSnap;
    if (baseline) {
      await prisma.scheduleVersion.create({
        data: { employeeId: empId, effectiveFrom: BASELINE_DATE, ...baseline, appliedAt: new Date(), changedByName: "Baseline" },
      });
    }
    if (!beforeSnap) {
      // brand-new schedule: the baseline above already is the new schedule
      return { effectiveFrom: BASELINE_DATE, appliesNow: true };
    }
  }

  // A newer instruction replaces any change that was planned for a later date
  await prisma.scheduleVersion.deleteMany({ where: { employeeId: empId, effectiveFrom: { gt: eff } } });

  const versionData = {
    ...afterSnap,
    appliedAt: appliesNow ? new Date() : null,
    changedById: actorUser?.id ? Number(actorUser.id) : null,
    changedByName: actorName,
  };
  await prisma.scheduleVersion.upsert({
    where: { employeeId_effectiveFrom: { employeeId: empId, effectiveFrom: eff } },
    update: versionData,
    create: { employeeId: empId, effectiveFrom: eff, ...versionData },
  });

  // History tab entry
  try {
    const oldSummary = summarize(beforeSnap);
    const newSummary = summarize(afterSnap);
    const details = detailChanges(beforeSnap, afterSnap);
    if (oldSummary !== newSummary || details.length) {
      const effLabel = moment(eff, "YYYY-MM-DD").format("DD MMM YYYY");
      await addLog(
        empId,
        {
          field: "schedule",
          oldValue: oldSummary,
          newValue: newSummary,
          note: [`Effective from ${effLabel}${appliesNow ? "" : " (scheduled)"}`, ...details].join("\n"),
        },
        { id: actorUser?.id, name: actorName }
      );
    }
  } catch (err) {
    console.error("[ScheduleVersion] log failed:", err.message);
  }

  return { effectiveFrom: eff, appliesNow };
}

// Copies versions whose date has arrived onto the employee's live schedule row
async function applyDueScheduleVersions() {
  const due = await prisma.scheduleVersion.findMany({
    where: { appliedAt: null, effectiveFrom: { lte: todayLocal() } },
    orderBy: { effectiveFrom: "asc" },
  });
  let applied = 0;
  for (const v of due) {
    try {
      const row = await prisma.schedule.findFirst({ where: { employeeId: v.employeeId, deletedAt: null }, orderBy: { id: "desc" } });
      const data = {};
      for (const f of SNAP_FIELDS) data[f] = v[f] === null && (f === "days" || f === "breakDurations") ? [] : v[f];
      if (row) await prisma.schedule.update({ where: { id: row.id }, data });
      else await prisma.schedule.create({ data: { employeeId: v.employeeId, ...data } });
      await prisma.scheduleVersion.update({ where: { id: v.id }, data: { appliedAt: new Date() } });
      applied++;
    } catch (err) {
      console.error(`[ScheduleVersion] apply ${v.id} failed:`, err.message);
    }
  }
  if (applied) console.log(`[ScheduleVersion] applied ${applied} scheduled change(s)`);
  return applied;
}

module.exports = {
  BASELINE_DATE,
  todayLocal,
  parseEffectiveFrom,
  snapshotOf,
  summarize,
  loadVersionMap,
  pickVersion,
  scheduleForDate,
  schedulesOnDate,
  recordScheduleChange,
  applyDueScheduleVersions,
};
