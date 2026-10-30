const prisma = require("../../config/prisma");
const moment = require("moment-timezone");

/**
 * Determine punch direction based on biometric machine name / tag:
 * - Gate 1 & Gate Pass => Strictly CHECK_IN (Dedicated 2 Check-In Terminals)
 * - Gate 2 & Gate 3 => Strictly CHECK_OUT (Dedicated 2 Check-Out Terminals)
 */
function resolvePunchType(device, fallbackType = "CHECK_IN") {
  const combined = String(device || "").toLowerCase();
  if (
    /\b(gate[\s_-]*(pass|1|01))\b/i.test(combined) ||
    combined.includes("gate pass") ||
    combined.includes("gate 1")
  ) {
    return "CHECK_IN";
  }
  if (
    /\b(gate[\s_-]*(2|02|3|03))\b/i.test(combined) ||
    combined.includes("gate 2") ||
    combined.includes("gate 3")
  ) {
    return "CHECK_OUT";
  }
  if (fallbackType === "CHECK_OUT" || fallbackType === "CHECKED_OUT") {
    return "CHECK_OUT";
  }
  return "CHECK_IN";
}

/**
 * Auto-correct legacy records in visitor_log table to match the 2-in / 2-out machine rules
 */
async function autoHealLegacyVisitorLogs() {
  try {
    // 1. Gate Pass & Gate 1 are strictly CHECK_IN
    await prisma.$executeRawUnsafe(`
      UPDATE visitor_log 
      SET punchType = 'CHECK_IN' 
      WHERE (LOWER(device) LIKE '%gate%1%' OR LOWER(device) LIKE '%gate%pass%') 
        AND punchType != 'CHECK_IN'
    `);
    // 2. Gate 2 & Gate 3 are strictly CHECK_OUT
    await prisma.$executeRawUnsafe(`
      UPDATE visitor_log 
      SET punchType = 'CHECK_OUT' 
      WHERE (LOWER(device) LIKE '%gate%2%' OR LOWER(device) LIKE '%gate%3%') 
        AND punchType != 'CHECK_OUT'
    `);
    // 3. Fix CHECKED_IN / CHECKED_OUT typos
    await prisma.$executeRawUnsafe(`
      UPDATE visitor_log SET punchType = 'CHECK_IN' WHERE punchType = 'CHECKED_IN'
    `);
    await prisma.$executeRawUnsafe(`
      UPDATE visitor_log SET punchType = 'CHECK_OUT' WHERE punchType = 'CHECKED_OUT'
    `);
  } catch (e) {
    // Non-fatal if offline or DB updating
  }
}

/**
 * Record a single visitor punch in the separate `visitor_log` table
 * and update the Visitor's current status and timestamps.
 */
async function recordVisitorPunch({
  visitorId,
  organizationId,
  punchTime = new Date(),
  punchType = "CHECK_IN", // "CHECK_IN" | "CHECK_OUT"
  device = "BIOMETRIC",
  method = "BIOMETRIC",
  timezone = "Asia/Karachi",
}) {
  try {
    const pMoment = moment(punchTime).tz(timezone);
    const dateStr = pMoment.format("YYYY-MM-DD");
    const pDate = pMoment.toDate();

    // Enforce exact punch direction: Gate 1 & Gate Pass => CHECK_IN, Gate 2 & Gate 3 => CHECK_OUT
    const exactPunchType = resolvePunchType(device, punchType);

    // Deduplication: prevent duplicate punch within 60 seconds for same visitor & punchType
    const windowStart = moment(pDate).subtract(60, "seconds").toDate();
    const windowEnd = moment(pDate).add(60, "seconds").toDate();

    const existingRecent = await prisma.$queryRawUnsafe(
      `SELECT id FROM visitor_log 
       WHERE visitorId = ? AND (punchType = ? OR punchType = ?) AND punchTime BETWEEN ? AND ? 
       LIMIT 1`,
      visitorId,
      exactPunchType,
      exactPunchType === "CHECK_IN" ? "CHECKED_IN" : "CHECKED_OUT",
      windowStart,
      windowEnd
    );

    let logId = null;
    if (existingRecent && existingRecent.length > 0) {
      logId = existingRecent[0].id;
    } else {
      await prisma.$executeRawUnsafe(
        `INSERT INTO visitor_log (visitorId, organizationId, punchTime, punchType, date, device, method, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        visitorId,
        organizationId,
        pDate,
        exactPunchType,
        dateStr,
        device || "Biometric Terminal",
        method || "BIOMETRIC"
      );

      const inserted = await prisma.$queryRawUnsafe(
        `SELECT id FROM visitor_log WHERE visitorId = ? ORDER BY id DESC LIMIT 1`,
        visitorId
      );
      if (inserted && inserted.length > 0) {
        logId = inserted[0].id;
      }
    }

    // Update Visitor profile state
    const updateData = {
      status: exactPunchType === "CHECK_OUT" ? "CHECKED_OUT" : "CHECKED_IN",
    };
    if (exactPunchType === "CHECK_IN") {
      updateData.checkInTime = pDate;
    } else if (exactPunchType === "CHECK_OUT") {
      updateData.checkOutTime = pDate;
    }

    const updatedVisitor = await prisma.visitor.update({
      where: { id: visitorId },
      data: updateData,
    });

    return {
      success: true,
      logId,
      punchTime: pDate,
      punchType: exactPunchType,
      date: dateStr,
      visitor: updatedVisitor,
    };
  } catch (error) {
    console.error("[VisitorLog] Error recording punch:", error);
    throw error;
  }
}

/**
 * Get all visitor logs for a specific organization, optionally filtered by date or visitorId,
 * or strictly filtered by the last 24 hours.
 */
async function getVisitorLogs({ organizationId, date = null, visitorId = null, limit = 100, last24Hours = false }) {
  try {
    await autoHealLegacyVisitorLogs();

    let sql = `
      SELECT l.id, l.visitorId, l.organizationId, l.punchTime, l.punchType, l.date, l.device, l.method, l.createdAt,
             v.fullName as visitorName, v.phone as visitorPhone, v.badgeNumber, v.visitorCompany, v.purpose, v.photo
      FROM visitor_log l
      INNER JOIN visitor v ON l.visitorId = v.id
      WHERE l.organizationId = ? AND v.deletedAt IS NULL
    `;
    const params = [organizationId];

    if (last24Hours) {
      // Show only punches recorded in the last 24 hours
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      sql += ` AND l.punchTime >= ?`;
      params.push(cutoff);
    } else if (date) {
      sql += ` AND l.date = ?`;
      params.push(date);
    }

    if (visitorId) {
      sql += ` AND l.visitorId = ?`;
      params.push(parseInt(visitorId));
    }

    sql += ` ORDER BY l.punchTime DESC LIMIT ?`;
    params.push(limit);

    const rows = await prisma.$queryRawUnsafe(sql, ...params);
    return rows.map((r) => ({
      ...r,
      punchType: resolvePunchType(r.device, r.punchType),
    }));
  } catch (error) {
    console.error("[VisitorLog] Error fetching logs:", error);
    return [];
  }
}

/**
 * Get punches for all visitors for a specific date, grouped by visitorId
 */
async function getPunchesGroupedByVisitor({ organizationId, date }) {
  try {
    const sql = `
      SELECT id, visitorId, punchTime, punchType, device, method
      FROM visitor_log
      WHERE organizationId = ? AND date = ?
      ORDER BY punchTime ASC
    `;
    const rows = await prisma.$queryRawUnsafe(sql, organizationId, date);

    const map = {};
    for (const row of rows) {
      const fixedPunchType = resolvePunchType(row.device, row.punchType);
      const normalizedRow = {
        ...row,
        punchType: fixedPunchType,
      };

      if (!map[row.visitorId]) {
        map[row.visitorId] = [];
      }
      map[row.visitorId].push(normalizedRow);
    }
    return map;
  } catch (error) {
    console.error("[VisitorLog] Error grouping punches:", error);
    return {};
  }
}

module.exports = {
  recordVisitorPunch,
  getVisitorLogs,
  getPunchesGroupedByVisitor,
  resolvePunchType,
};
