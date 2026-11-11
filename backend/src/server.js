require("dotenv").config();

// Global crash protection for uncaught exceptions and unhandled promise rejections
process.on("uncaughtException", (err) => {
  console.error("🔥 [UNCAUGHT EXCEPTION]:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("🔥 [UNHANDLED REJECTION]:", reason);
});

const app = require("./app");
const prisma = require("./config/prisma");
const { initMachineSyncCron, initAutoCheckoutCron } = require("./services/cron.service");
const { initHikvisionStreams } = require("./modules/devices/hikvision.service");
const { processBiometricPunch } = require("./modules/devices/device.controller");

const port = process.env.PORT || 4000;

app.listen(port, async () => {
  console.log(`API running on http://localhost:${port}`);
  try {
    await prisma.$connect();
    console.log("Database connected successfully to MySQL.");
    initMachineSyncCron();
    initAutoCheckoutCron();
    initHikvisionStreams(prisma, processBiometricPunch);
  } catch (err) {
    console.error("\n❌ [DATABASE CONNECTION ERROR]: Unable to reach MySQL database at localhost:3306.");
    console.error("👉 Please ensure MySQL is started in XAMPP Control Panel (or run C:\\xampp\\mysql_start.bat).\n");
  }
});

