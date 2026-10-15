const prisma = require("../../config/prisma");
const { processBiometricPunch } = require("./device.controller");

/**
 * Endpoints used by the on-premise HR Pro Bridge agent.
 * The agent runs inside the office LAN, talks to the biometric terminals directly,
 * and relays punches to this (cloud) server over HTTPS.
 */

// Bridge pulls the list of terminals (with credentials) it should connect to
exports.getBridgeDevices = async (req, res) => {
  try {
    const devices = await prisma.biometricDevice.findMany({
      where: { deletedAt: null },
      orderBy: { id: "asc" },
    });

    return res.json({
      success: true,
      data: devices.map((d) => ({
        id: d.id,
        name: d.name,
        brand: d.brand,
        ipAddress: d.ipAddress,
        port: d.port,
        username: d.username,
        password: d.password,
        direction: d.direction || null,
      })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Bridge pushes a batch of punches (live stream + catch-up sync)
exports.receiveBridgePunches = async (req, res) => {
  try {
    const punches = Array.isArray(req.body?.punches) ? req.body.punches : [];
    if (punches.length === 0) {
      return res.json({ success: true, processed: 0, results: [] });
    }
    if (punches.length > 2000) {
      return res.status(413).json({ success: false, message: "Too many punches in one batch (max 2000)" });
    }

    // Process strictly in chronological order so CHECK_IN is always recorded before CHECK_OUT
    const ordered = punches
      .map((p, idx) => ({ ...p, _idx: idx }))
      .filter((p) => p.biometricId && p.punchTime && !isNaN(new Date(p.punchTime).getTime()))
      .sort((a, b) => new Date(a.punchTime) - new Date(b.punchTime));

    const results = [];
    let processed = 0;

    for (const p of ordered) {
      try {
        const r = await processBiometricPunch({
          biometricId: String(p.biometricId).trim(),
          punchTime: new Date(p.punchTime),
          brand: p.brand || "HIKVISION",
          deviceName: p.deviceName,
          method: p.method,
          employeeName: p.employeeName || null,
          direction: p.direction || undefined,
        });
        if (r?.success) processed++;
        results.push({ idx: p._idx, success: !!r?.success, type: r?.type, reason: r?.reason });
      } catch (err) {
        results.push({ idx: p._idx, success: false, reason: err.message });
      }
    }

    return res.json({ success: true, received: punches.length, processed, results });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Bridge reports which terminals it can currently reach
exports.bridgeHeartbeat = async (req, res) => {
  try {
    const statuses = Array.isArray(req.body?.devices) ? req.body.devices : [];
    const now = new Date();

    for (const s of statuses) {
      const id = Number(s.id);
      if (!id) continue;
      await prisma.biometricDevice.updateMany({
        where: { id, deletedAt: null },
        data: {
          status: s.online ? "ONLINE" : "OFFLINE",
          ...(s.online ? { lastSyncedAt: now } : {}),
        },
      });
    }

    return res.json({ success: true, serverTime: now.toISOString() });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
