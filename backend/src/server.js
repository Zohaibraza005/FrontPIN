require("dotenv").config();
const app = require("./app");
const prisma = require("./config/prisma");
const { initMachineSyncCron, initAutoCheckoutCron } = require("./services/cron.service");
const { initHikvisionStreams } = require("./modules/devices/hikvision.service");
const { processBiometricPunch } = require("./modules/devices/device.controller");

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
  initAutoCheckoutCron();

  // DEVICE_MODE=bridge → terminals are on a remote LAN; the on-premise HR Pro Bridge agent
  // relays punches to /api/devices/bridge/*, so this server must not connect to devices itself.
  if (process.env.DEVICE_MODE === "bridge") {
    console.log("[Devices] DEVICE_MODE=bridge: direct device connections disabled, waiting for HR Pro Bridge agent.");
  } else {
    initMachineSyncCron();
    initHikvisionStreams(prisma, processBiometricPunch);
  }
});

