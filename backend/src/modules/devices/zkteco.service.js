const ZKLib = require("node-zklib");

/**
 * Connects to a ZKTeco device over socket (TCP/UDP) and fetches attendance logs
 * @param {string} ip - Device IP Address
 * @param {number} port - Device Port (default 4370)
 * @returns {Promise<Array>} List of attendance log objects
 */
async function fetchZkTecoLogs(ip, port = 4370) {
  const zk = new ZKLib(ip, port, 5000, 4000);
  try {
    // Create socket connection
    await zk.createSocket();
    try {
      zk.zklibTcp?.socket?.on?.("error", (e) => console.warn(`[ZKTeco TCP Socket Warn] ${ip}:`, e.message));
      zk.zklibUdp?.socket?.on?.("error", (e) => console.warn(`[ZKTeco UDP Socket Warn] ${ip}:`, e.message));
    } catch (ignore) {}

    // Get attendance logs from machine internal memory
    const logs = await zk.getAttendances();

    // Disconnect socket gracefully
    await zk.disconnect();

    return logs.data || [];
  } catch (error) {
    console.error(`[ZKTeco Error] Failed to fetch logs from ${ip}:${port}:`, error.message);
    try {
      await zk.disconnect();
    } catch (e) {}
    throw error;
  }
}

/**
 * Tests connection to a ZKTeco device
 * @param {string} ip 
 * @param {number} port 
 * @returns {Promise<boolean>} true if online, false if offline
 */
async function testZkTecoConnection(ip, port = 4370) {
  const zk = new ZKLib(ip, port, 4000, 4000);
  try {
    await zk.createSocket();
    try {
      zk.zklibTcp?.socket?.on?.("error", () => {});
      zk.zklibUdp?.socket?.on?.("error", () => {});
    } catch (ignore) {}
    const info = await zk.getInfo();
    await zk.disconnect();
    return true;
  } catch (error) {
    try {
      await zk.disconnect();
    } catch (e) {}
    return false;
  }
}

module.exports = {
  fetchZkTecoLogs,
  testZkTecoConnection,
};
