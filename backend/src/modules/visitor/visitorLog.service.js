const prisma = require("../../config/prisma");
const moment = require("moment-timezone");

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

    // Deduplication: prevent duplicate punch within 60 seconds for same visitor & punchType
    const windowStart = moment(pDate).subtract(60, "seconds").toDate();
    const windowEnd = moment(pDate).add(60, "seconds").toDate();

    const existingRecent = await prisma.$queryRawUnsafe(
      `SELECT id FROM visitor_log 
       WHERE visitorId = ? AND punchType = ? AND punchTime BETWEEN ? AND ? 
       LIMIT 1`,
      visitorId,
      punchType,
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
        punchType,
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
      status: punchType === "CHECK_OUT" ? "CHECKED_OUT" : "CHECKED_IN",
    };
    if (punchType === "CHECK_IN") {
      updateData.checkInTime = pDate;
    } else if (punchType === "CHECK_OUT") {
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
      punchType,
      date: dateStr,
      visitor: updatedVisitor,
    };
  } catch (error) {
    console.error("[VisitorLog] Error recording punch:", error);
    throw error;
  }
}

/**
 * Get all visitor logs for a specific organization, optionally filtered by date or visitorId
 */
async function getVisitorLogs({ organizationId, date = null, visitorId = null, limit = 100 }) {
  try {
    let sql = `
      SELECT l.id, l.visitorId, l.organizationId, l.punchTime, l.punchType, l.date, l.device, l.method, l.createdAt,
             v.fullName as visitorName, v.phone as visitorPhone, v.badgeNumber, v.visitorCompany, v.purpose, v.photo
      FROM visitor_log l
      INNER JOIN visitor v ON l.visitorId = v.id
      WHERE l.organizationId = ? AND v.deletedAt IS NULL
    `;
    const params = [organizationId];

    if (date) {
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
    return rows;
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
      if (!map[row.visitorId]) {
        map[row.visitorId] = [];
      }
      map[row.visitorId].push(row);
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
};
