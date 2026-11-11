const cron = require("node-cron");
const moment = require("moment-timezone");
const prisma = require("../config/prisma");
const { syncAllActiveDevices, processBiometricPunch } = require("../modules/devices/device.controller");
const { autoCheckoutOverdueAttendances } = require("../modules/attendance/attendance.controller");

let machineSyncTask = null;
let deepMachineSyncTask = null;
let autoCheckoutTask = null;

/**
 * Initializes automatic machine punch sync cron jobs:
 * 1. Every 5 minutes: fast incremental sync (lastSyncedAt - 30m overlap) for near real-time speed.
 * 2. Every 30 minutes: full deep reconciliation sync (yesterday 00:00 -> now) so zero punches can ever be missed.
 */
function initMachineSyncCron() {
  if (machineSyncTask) {
    console.log("[Cron] Machine punch sync cron job is already active.");
    return;
  }

  console.log("[Cron] Scheduling fast 5-minute sync ('*/5 * * * *') and 30-minute deep full-catchup sync ('*/30 * * * *')...");

  // Fast incremental sync every 5 minutes (skips :00 and :30 when deep sync runs)
  machineSyncTask = cron.schedule("*/5 * * * *", async () => {
    const minute = new Date().getMinutes();
    if (minute % 30 === 0) return; // Deep sync handles :00 and :30
    const now = new Date().toISOString();
    console.log(`[Cron Machine Sync] [${now}] Starting scheduled 5-minute incremental punch sync...`);
    try {
      const summary = await syncAllActiveDevices(prisma, processBiometricPunch);
      console.log(
        `[Cron Machine Sync] [${now}] Finished: ${summary.count} punches processed from ${summary.devicesSynced}/${summary.totalDevices} machine(s).`
      );
    } catch (err) {
      console.error(`[Cron Machine Sync Error] [${now}]:`, err.message);
    }
  });

  // Full deep catchup sync every 30 minutes (yesterday 00:00 -> now + 15m)
  deepMachineSyncTask = cron.schedule("*/30 * * * *", async () => {
    const now = new Date().toISOString();
    const tz = "Asia/Karachi";
    const fullStart = moment().tz(tz).subtract(1, "day").startOf("day").format("YYYY-MM-DDTHH:mm:ssZ");
    const fullEnd = moment().tz(tz).add(15, "minutes").format("YYYY-MM-DDTHH:mm:ssZ");
    console.log(`[Cron Deep Sync] [${now}] Starting scheduled 30-minute full punch reconciliation (${fullStart} to ${fullEnd})...`);
    try {
      const summary = await syncAllActiveDevices(prisma, processBiometricPunch, fullStart, fullEnd);
      console.log(
        `[Cron Deep Sync] [${now}] Finished: ${summary.count} punches processed from ${summary.devicesSynced}/${summary.totalDevices} machine(s).`
      );
    } catch (err) {
      console.error(`[Cron Deep Sync Error] [${now}]:`, err.message);
    }
  });

  console.log("[Cron] Automatic 5-minute + 30-minute deep machine punch sync scheduled successfully.");
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
