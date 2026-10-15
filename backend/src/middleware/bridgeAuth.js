const crypto = require("crypto");

/**
 * Authenticates the on-premise HR Pro Bridge agent using a shared secret
 * sent in the `x-bridge-token` header (configured via BRIDGE_TOKEN in .env).
 */
exports.bridgeAuth = (req, res, next) => {
  const expected = process.env.BRIDGE_TOKEN;
  if (!expected) {
    return res.status(503).json({ success: false, message: "Bridge is not enabled on this server (BRIDGE_TOKEN missing)" });
  }

  const provided = String(req.headers["x-bridge-token"] || "");
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ success: false, message: "Invalid bridge token" });
  }

  next();
};
