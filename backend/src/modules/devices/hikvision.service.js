const xml2js = require("xml2js");
const http = require("http");
const crypto = require("crypto");

function md5(str) {
  return crypto.createHash("md5").update(str).digest("hex");
}

const VALID_MINOR_CODES = new Set([
  1,   // Legal card / Access granted
  38,  // Card + Face / Access granted
  75,  // Face verification / Access granted
  76,  // Fingerprint verification / Access granted
  115, // QR code verification / Access granted
]);

/**
 * Parses incoming Hikvision ISAPI Webhook payload (XML or JSON)
 * @param {Object|String} body - Express req.body or raw body
 * @returns {Object|null} normalized punch details { biometricId, punchTime, deviceName, method, employeeName, rawData }
 */
async function parseHikvisionEvent(body) {
  try {
    let parsedData = body;
    let rawStr = typeof body === "string" ? body : JSON.stringify(body);

    if (typeof body === "string") {
      try {
        parsedData = JSON.parse(body);
      } catch (e) {
        if (body.trim().startsWith("<")) {
          const parser = new xml2js.Parser({ explicitArray: false });
          parsedData = await parser.parseStringPromise(body);
        }
      }
    }

    // Extract Event fields from JSON or parsed XML structure
    const eventObj =
      parsedData?.AccessControllerEvent ||
      parsedData?.EventNotificationAlert ||
      parsedData;

    const major = Number(eventObj?.majorEventType ?? eventObj?.major ?? parsedData?.majorEventType ?? 0);
    const minor = Number(eventObj?.subEventType ?? eventObj?.minor ?? parsedData?.subEventType ?? 0);

    // Only accept genuine access control punch events
    if (major !== 5 && major !== 0) {
      return null;
    }
    if (!VALID_MINOR_CODES.has(minor) && minor !== 0) {
      return null;
    }

    let biometricId =
      eventObj?.employeeNoString ||
      eventObj?.employeeNo ||
      eventObj?.cardNo ||
      null;

    // Fallback regex extraction if multipart/form-data string
    if (!biometricId && typeof rawStr === "string") {
      const matchNo =
        rawStr.match(/"employeeNoString"\s*:\s*"([^"]+)"/) ||
        rawStr.match(/"employeeNo"\s*:\s*"([^"]+)"/) ||
        rawStr.match(/<employeeNoString>([^<]+)<\/employeeNoString>/) ||
        rawStr.match(/<employeeNo>([^<]+)<\/employeeNo>/);
      if (matchNo) biometricId = matchNo[1];
    }

    if (!biometricId) {
      return null;
    }

    const rawTime =
      eventObj?.eventTime ||
      eventObj?.time ||
      eventObj?.dateTime ||
      parsedData?.dateTime;

    if (!rawTime) {
      return null;
    }

    const punchTime = new Date(rawTime);
    if (isNaN(punchTime.getTime())) {
      return null;
    }

    const method =
      eventObj?.currentVerifyMode ||
      eventObj?.verifyMode ||
      "HIKVISION_FACE";

    const employeeName = eventObj?.name ? String(eventObj.name).trim() : null;

    return {
      biometricId: String(biometricId).trim(),
      punchTime,
      method: String(method),
      employeeName,
      rawData: parsedData,
    };
  } catch (error) {
    console.error("Error parsing Hikvision Event:", error);
    return null;
  }
}

/**
 * Sends a Digest-Authenticated HTTP Request to Hikvision ISAPI
 */
function sendHikvisionDigest(ip, port, username, password, method, path, data) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(data);
    const targetPort = port || 80;

    const options = {
      hostname: ip,
      port: targetPort,
      path: path,
      method: method,
      timeout: 3000,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 401 && res.headers["www-authenticate"]) {
        const authHeader = res.headers["www-authenticate"];
        const realmMatch = authHeader.match(/realm="([^"]+)"/);
        const nonceMatch = authHeader.match(/nonce="([^"]+)"/);
        const qopMatch = authHeader.match(/qop="([^"]+)"/);

        const realm = realmMatch ? realmMatch[1] : "DS-K1T671TMFW";
        const nonce = nonceMatch ? nonceMatch[1] : "";
        const qop = qopMatch ? qopMatch[1] : "auth";
        const nc = "00000001";
        const cnonce = crypto.randomBytes(8).toString("hex");

        const ha1 = md5(`${username}:${realm}:${password}`);
        const ha2 = md5(`${method}:${path}`);
        const responseHash = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);

        const digestHeader = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${path}", response="${responseHash}", qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;

        const authOptions = {
          ...options,
          headers: {
            ...options.headers,
            Authorization: digestHeader,
          },
        };

        const req2 = http.request(authOptions, (res2) => {
          let body = "";
          res2.on('data', (chunk) => (body += chunk));
          res2.on('end', () => resolve({ status: res2.statusCode, body }));
        });
        req2.on('timeout', () => { req2.destroy(); resolve({ status: 408, error: 'timeout' }); });
        req2.on('error', (err) => resolve({ status: 500, error: err.message }));
        req2.write(postData);
        req2.end();
      } else {
        let body = "";
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      }
    });

    req.on('timeout', () => { req.destroy(); resolve({ status: 408, error: 'timeout' }); });
    req.on('error', (err) => resolve({ status: 500, error: err.message }));
    req.write(postData);
    req.end();
  });
}

/**
 * Pushes a new User (Employee) to Hikvision Terminal via ISAPI
 * @param {Object} device - BiometricDevice DB record { ipAddress, port, username, password }
 * @param {Object} user - { biometricId, name }
 */
async function pushUserToHikvision(device, { biometricId, name }) {
  if (!device || !biometricId) return false;

  const payload = {
    UserInfo: {
      employeeNo: String(biometricId),
      name: String(name || `User ${biometricId}`),
      userType: "normal",
      doorRight: "1",
      RightPlan: [
        {
          doorNo: 1,
          planTemplateNo: "1",
        },
      ],
      closeDelayEnabled: false,
      Valid: {
        enable: true,
        beginTime: "2026-01-01T00:00:00",
        endTime: "2037-12-31T23:59:59",
      },
    },
  };

  try {
    const res = await sendHikvisionDigest(
      device.ipAddress,
      device.port || 80,
      device.username || "admin",
      device.password || "",
      "PUT",
      "/ISAPI/AccessControl/UserInfo/SetUp?format=json",
      payload
    );

    console.log(`[Hikvision User Push] Pushed user ${name} (${biometricId}) to ${device.ipAddress}:`, res);
    return res.status === 200;
  } catch (error) {
    console.error(`[Hikvision User Push Error] Failed to push user to ${device.ipAddress}:`, error.message);
    return false;
  }
}

/**
 * Real-time Outgoing TCP Socket Stream Handler for Hikvision Devices
 */
const activeStreams = new Map();

function startHikvisionStream(device, processPunchCallback) {
  const { id, name, ipAddress, port, username, password } = device;
  if (!ipAddress) return;

  if (activeStreams.has(id)) {
    try {
      activeStreams.get(id).destroy();
    } catch (e) {}
    activeStreams.delete(id);
  }

  const targetPort = port || 80;
  const path = "/ISAPI/Event/notification/alertStream";

  console.log(`[Hikvision Stream] Initiating persistent stream connection to ${name} (${ipAddress}:${targetPort})...`);

  const options = {
    hostname: ipAddress,
    port: targetPort,
    path: path,
    method: "GET",
  };

  const req = http.request(options, (res) => {
    if (res.statusCode === 401 && res.headers["www-authenticate"]) {
      const authHeader = res.headers["www-authenticate"];
      const realmMatch = authHeader.match(/realm="([^"]+)"/);
      const nonceMatch = authHeader.match(/nonce="([^"]+)"/);
      const qopMatch = authHeader.match(/qop="([^"]+)"/);

      const realm = realmMatch ? realmMatch[1] : "DS-K1T671TMFW";
      const nonce = nonceMatch ? nonceMatch[1] : "";
      const qop = qopMatch ? qopMatch[1] : "auth";
      const nc = "00000001";
      const cnonce = crypto.randomBytes(8).toString("hex");

      const ha1 = md5(`${username || "admin"}:${realm}:${password || ""}`);
      const ha2 = md5(`GET:${path}`);
      const responseHash = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);

      const digestHeader = `Digest username="${username || "admin"}", realm="${realm}", nonce="${nonce}", uri="${path}", response="${responseHash}", qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;

      const streamOptions = {
        ...options,
        headers: {
          Authorization: digestHeader,
        },
      };

      const streamReq = http.request(streamOptions, (streamRes) => {
        console.log(`[Hikvision Stream] Real-time socket connected to ${name} (${ipAddress}) [HTTP ${streamRes.statusCode}]`);
        activeStreams.set(id, streamReq);

        let streamBuffer = "";

        streamRes.on("data", (chunk) => {
          streamBuffer += chunk.toString();

          // Process parts split by MIME boundary
          const boundaryIdx = streamBuffer.indexOf("--");
          if (boundaryIdx !== -1) {
            const rawPart = streamBuffer.slice(0, boundaryIdx);
            streamBuffer = streamBuffer.slice(boundaryIdx + 2);

            const jsonStart = rawPart.indexOf("{");
            const jsonEnd = rawPart.lastIndexOf("}");

            if (jsonStart !== -1 && jsonEnd > jsonStart) {
              try {
                const parsed = JSON.parse(rawPart.slice(jsonStart, jsonEnd + 1));
                const eventObj = parsed?.AccessControllerEvent || parsed?.EventNotificationAlert || parsed;

                const major = Number(eventObj?.majorEventType ?? eventObj?.major ?? parsed?.majorEventType ?? 0);
                const minor = Number(eventObj?.subEventType ?? eventObj?.minor ?? parsed?.subEventType ?? 0);
                const eventType = parsed?.eventType || eventObj?.eventType;

                const isPunchEvent = (major === 5 || eventType === "AccessControllerEvent" || major === 0) &&
                                     (VALID_MINOR_CODES.has(minor) || minor === 0);

                const bioId = eventObj?.employeeNoString || eventObj?.employeeNo || eventObj?.cardNo;

                if (bioId && isPunchEvent) {
                  const rawTime = eventObj?.eventTime || eventObj?.time || eventObj?.dateTime || parsed?.dateTime;
                  const punchTime = rawTime ? new Date(rawTime) : null;

                  if (punchTime && !isNaN(punchTime.getTime())) {
                    console.log(`[Hikvision Stream] Punch verified: Bio ID ${bioId} (${eventObj?.name || 'Unknown'}) at ${punchTime.toISOString()}`);
                    if (typeof processPunchCallback === "function") {
                      processPunchCallback({
                        biometricId: String(bioId).trim(),
                        punchTime,
                        brand: "HIKVISION",
                        deviceName: name,
                        method: eventObj?.currentVerifyMode || "HIKVISION_FACE",
                        employeeName: eventObj?.name ? String(eventObj.name).trim() : null,
                      }).catch((err) => console.error("Error processing stream punch:", err));
                    }
                  }
                }
              } catch (e) {
                // Incomplete JSON fragment, continue
              }
            }
          }

          // Cap streamBuffer size to avoid runaway memory
          if (streamBuffer.length > 500000) {
            streamBuffer = streamBuffer.slice(-100000);
          }
        });

        streamRes.on("end", () => {
          console.log(`[Hikvision Stream] Stream disconnected from ${name}. Reconnecting in 10s...`);
          activeStreams.delete(id);
          setTimeout(() => startHikvisionStream(device, processPunchCallback), 10000);
        });

        streamRes.on("error", (err) => {
          console.error(`[Hikvision Stream Error] ${name}:`, err.message);
          activeStreams.delete(id);
          setTimeout(() => startHikvisionStream(device, processPunchCallback), 10000);
        });
      });

      streamReq.on("error", (err) => {
        console.error(`[Hikvision Auth Stream Error] ${name}:`, err.message);
        activeStreams.delete(id);
        setTimeout(() => startHikvisionStream(device, processPunchCallback), 10000);
      });

      streamReq.end();
    } else {
      console.warn(`[Hikvision Stream] Unexpected status HTTP ${res.statusCode} from ${name}`);
      setTimeout(() => startHikvisionStream(device, processPunchCallback), 15000);
    }
  });

  req.on("error", (err) => {
    console.error(`[Hikvision Stream Req Error] ${name}:`, err.message);
    setTimeout(() => startHikvisionStream(device, processPunchCallback), 15000);
  });

  req.end();
}

/**
 * Directly queries Hikvision ISAPI AcsEvent storage for exact punch logs
 */
async function fetchHikvisionAcsEvents(device, startTime, endTime) {
  const { ipAddress, port, username, password } = device;
  if (!ipAddress) return [];

  const targetPort = port || 80;
  let allEvents = [];
  let position = 0;
  const pageSize = 30;

  while (true) {
    const payload = {
      AcsEventCond: {
        searchID: `sync_${Date.now()}`,
        searchResultPosition: position,
        maxResults: pageSize,
        major: 0,
        minor: 0,
        startTime,
        endTime,
      },
    };

    const res = await sendHikvisionDigest(
      ipAddress,
      targetPort,
      username || "admin",
      password || "",
      "POST",
      "/ISAPI/AccessControl/AcsEvent?format=json",
      payload
    );

    if (res.status !== 200 || !res.body) break;

    let data;
    try {
      data = JSON.parse(res.body);
    } catch (e) {
      break;
    }

    const list = data?.AcsEvent?.InfoList || [];
    const totalMatches = data?.AcsEvent?.totalMatches || 0;
    if (list.length === 0) break;

    for (const ev of list) {
      const bioId = ev.employeeNoString ? String(ev.employeeNoString).trim() : null;
      const major = Number(ev.major ?? ev.majorEventType ?? 0);
      const minor = Number(ev.minor ?? ev.subEventType ?? 0);
      const isAccessEvent = major === 5 || major === 0;
      const isValidMinor = VALID_MINOR_CODES.has(minor);

      if (bioId && isAccessEvent && isValidMinor) {
        allEvents.push({
          biometricId: bioId,
          name: ev.name ? String(ev.name).trim() : null,
          punchTime: ev.time || ev.dateTime,
          minor: minor,
          verifyMode: ev.currentVerifyMode || "HIKVISION_FACE",
          serialNo: ev.serialNo,
        });
      }
    }

    position += list.length;
    if (position >= totalMatches) break;
  }

  allEvents.sort((a, b) => new Date(a.punchTime) - new Date(b.punchTime));
  return allEvents;
}

/**
 * Synchronizes real punch logs from a Hikvision terminal into the database
 */
async function syncHikvisionDeviceLogs(device, processPunchCallback, startTime = null, endTime = null) {
  try {
    const moment = require("moment-timezone");
    const timezone = "Asia/Karachi";
    const start = startTime || moment().tz(timezone).startOf("day").format("YYYY-MM-DDTHH:mm:ssZ");
    const end = endTime || moment().tz(timezone).endOf("day").format("YYYY-MM-DDTHH:mm:ssZ");

    const events = await fetchHikvisionAcsEvents(device, start, end);
    let processedCount = 0;

    for (const ev of events) {
      const res = await processPunchCallback({
        biometricId: ev.biometricId,
        punchTime: ev.punchTime,
        brand: "HIKVISION",
        deviceName: device.name,
        method: ev.verifyMode || "HIKVISION_FACE",
        employeeName: ev.name,
      });
      if (res?.success) processedCount++;
    }

    console.log(`[Hikvision Sync] ${device.name}: Processed ${processedCount} / ${events.length} punches (${start} to ${end})`);
    return { success: true, count: processedCount, totalEvents: events.length };
  } catch (error) {
    console.error(`[Hikvision Sync Error] ${device.name}:`, error.message);
    return { success: false, error: error.message };
  }
}

let syncIntervalHandle = null;

async function initHikvisionStreams(prisma, processPunchCallback) {
  try {
    const devices = await prisma.biometricDevice.findMany({
      where: {
        brand: "HIKVISION",
        deletedAt: null,
      },
    });

    console.log(`[Hikvision Streams] Initializing for ${devices.length} registered Hikvision device(s)...`);
    for (const device of devices) {
      // 1. Start live alert stream
      startHikvisionStream(device, processPunchCallback);

      // 2. Catch up today's logs immediately
      syncHikvisionDeviceLogs(device, processPunchCallback).catch((err) => {
        console.error(`[Hikvision Initial Sync Error] ${device.name}:`, err.message);
      });
    }

    // 3. Periodic safety-net sync every 60 seconds
    if (!syncIntervalHandle) {
      syncIntervalHandle = setInterval(async () => {
        try {
          const activeDevices = await prisma.biometricDevice.findMany({
            where: { brand: "HIKVISION", deletedAt: null },
          });
          for (const dev of activeDevices) {
            await syncHikvisionDeviceLogs(dev, processPunchCallback);
          }
        } catch (e) {
          console.error("[Hikvision Periodic Sync Error]:", e.message);
        }
      }, 300 * 1000);
    }
  } catch (error) {
    console.error(`[Hikvision Streams Init Error]:`, error.message);
  }
}

/**
 * Fetches all enrolled users from a Hikvision terminal via ISAPI
 */
async function fetchHikvisionUsers(device) {
  if (!device || !device.ipAddress) return [];
  const payload = {
    UserInfoSearchCond: {
      searchID: "1",
      searchResultPosition: 0,
      maxResults: 500,
    },
  };

  try {
    const res = await sendHikvisionDigest(
      device.ipAddress,
      device.port || 80,
      device.username || "admin",
      device.password || "",
      "POST",
      "/ISAPI/AccessControl/UserInfo/Search?format=json",
      payload
    );

    if (res && res.status === 200 && res.body) {
      const data = JSON.parse(res.body);
      return data?.UserInfoSearch?.UserInfo || [];
    }
  } catch (error) {
    console.error(`[Hikvision Fetch Error] ${device.ipAddress}:`, error.message);
  }
  return [];
}

/**
 * Cross-syncs enrolled users and biometric profiles across all active Hikvision devices
 */
async function syncBiometricsAcrossDevices(prisma) {
  try {
    const devices = await prisma.biometricDevice.findMany({
      where: { brand: "HIKVISION", deletedAt: null },
    });

    if (devices.length < 2) {
      console.log("[Hikvision Sync] 1 or no devices registered. Single device active.");
      return { success: true, message: "Sync complete." };
    }

    console.log(`[Hikvision Cross-Sync] Starting user profile cross-sync across ${devices.length} devices...`);

    // 1️⃣ Fetch enrolled users from all active terminals
    const deviceUserMap = new Map();
    const allUsers = new Map();

    for (const dev of devices) {
      const uList = await fetchHikvisionUsers(dev);
      deviceUserMap.set(dev.id, uList);
      uList.forEach((u) => {
        if (u.employeeNo) {
          allUsers.set(String(u.employeeNo).trim(), u.name || `User ${u.employeeNo}`);
        }
      });
    }

    // 2️⃣ Cross-push missing user profiles so all terminals contain every user
    let pushedCount = 0;
    for (const [employeeNo, name] of allUsers.entries()) {
      for (const dev of devices) {
        const devUsers = deviceUserMap.get(dev.id) || [];
        const exists = devUsers.some((u) => String(u.employeeNo).trim() === employeeNo);
        if (!exists) {
          console.log(`[Hikvision Cross-Sync] Copying user ${name} (${employeeNo}) -> ${dev.name} (${dev.ipAddress}:${dev.port})`);
          await pushUserToHikvision(dev, { biometricId: employeeNo, name });
          pushedCount++;
        }
      }
    }

    console.log(`[Hikvision Cross-Sync] Completed. ${pushedCount} profile(s) synced across devices.`);
    return { success: true, pushedCount };
  } catch (error) {
    console.error("[Hikvision Cross-Sync Error]:", error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  parseHikvisionEvent,
  pushUserToHikvision,
  startHikvisionStream,
  initHikvisionStreams,
  fetchHikvisionUsers,
  fetchHikvisionAcsEvents,
  syncHikvisionDeviceLogs,
  syncBiometricsAcrossDevices,
};


