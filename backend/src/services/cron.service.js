const cron = require("node-cron");
const prisma = require("../config/prisma");
const { syncAllActiveDevices, processBiometricPunch } = require("../modules/devices/device.controller");
const { autoCheckoutOverdueAttendances } = require("../modules/attendance/attendance.controller");

let machineSyncTask = null;
let autoCheckoutTask = null;

/**
 * Initializes a cron job to automatically sync attendance punches
 * from all registered biometric machines every 30 minutes.
 */
function initMachineSyncCron() {
  if (machineSyncTask) {
    console.log("[Cron] Machine punch sync cron job is already active.");
    return;
  }

  console.log("[Cron] Scheduling automatic machine punch sync every 30 minutes (cron: '*/30 * * * *')...");

  // Schedule task every 30 minutes
  machineSyncTask = cron.schedule("*/30 * * * *", async () => {
    const now = new Date().toISOString();
    console.log(`[Cron Machine Sync] [${now}] Starting scheduled 30-minute punch sync...`);
    try {
      const summary = await syncAllActiveDevices(prisma, processBiometricPunch);
      console.log(
        `[Cron Machine Sync] [${now}] Finished: ${summary.count} punches processed from ${summary.devicesSynced}/${summary.totalDevices} machine(s).`
      );
    } catch (err) {
      console.error(`[Cron Machine Sync Error] [${now}]:`, err.message);
    }
  });

  console.log("[Cron] Automatic 30-minute machine punch sync scheduled successfully.");
}

/**
 * Initializes a cron job to automatically check out employees whose shift
 * and allowed extra overtime (shift end + 2h) has passed.
 * Runs every 2 minutes.
 */
function initAutoCheckoutCron() {
  if (autoCheckoutTask) {
    console.log("[Cron] Auto-checkout cron job is already active.");
    return;
  }

  console.log("[Cron] Scheduling automatic shift checkout every 2 minutes (cron: '*/2 * * * *')...");

  autoCheckoutTask = cron.schedule("*/2 * * * *", async () => {
    try {
      await autoCheckoutOverdueAttendances();
    } catch (err) {
      console.error("[Cron Auto-Checkout Error]:", err.message);
    }
  });

  console.log("[Cron] Automatic shift checkout scheduled successfully.");
}

module.exports = {
  initMachineSyncCron,
  initAutoCheckoutCron,
};
