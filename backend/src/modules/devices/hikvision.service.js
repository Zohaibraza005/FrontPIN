const xml2js = require("xml2js");
const http = require("http");
const crypto = require("crypto");

function md5(str) {
  return crypto.createHash("md5").update(str).digest("hex");
}

function resolveHikvisionPort(port) {
  const p = Number(port);
  if (!p || p === 8000 || p === 4370) return 80;
  return p;
}

const VALID_MINOR_CODES = new Set([
  1,   // Legal card / Access granted
  25,  // Card and Face comparison passed
  38,  // Card + Face / Access granted
  75,  // Face verification / Access granted
  76,  // Fingerprint verification / Access granted
  77,  // Face and fingerprint passed
  78,  // Card and face and fingerprint passed
  79,  // Card and password passed
  80,  // Fingerprint and password passed
  81,  // Face and password passed
  82,  // Face, fingerprint, and password passed
  83,  // Card, fingerprint, and password passed
  84,  // Card, face, and password passed
  85,  // Card, face, fingerprint, and password passed
  86,  // Face authentication pass
  87,  // Face comparison pass
  113, // Bluetooth passed
  115, // QR code verification / Access granted
  120, // Iris passed
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
    const targetPort = resolveHikvisionPort(port);

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
      resolveHikvisionPort(device.port),
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

  const targetPort = resolveHikvisionPort(port);
  const path = "/ISAPI/Event/notification/alertStream";

  console.log(`[Hikvision Stream] Initiating persistent stream connection to ${name} (${ipAddress}:${targetPort})...`);

  const options = {
    hostname: ipAddress,
    port: targetPort,
    path: path,
    method: "GET",
    agent: false,
    headers: {
      Connection: "close",
    },
  };

  const req = http.request(options, (res) => {
    res.resume(); // Drain probe response
    const authHeader = res.headers["www-authenticate"];

    if (res.statusCode === 401 && authHeader) {
      req.destroy();

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
        hostname: ipAddress,
        port: targetPort,
        path: path,
        method: "GET",
        agent: false,
        headers: {
          Authorization: digestHeader,
        },
      };

      const streamReq = http.request(streamOptions, (streamRes) => {
        if (streamRes.statusCode !== 200) {
          console.warn(
            `[Hikvision Stream] ${name} (${ipAddress}) stream rejected [HTTP ${streamRes.statusCode}]. Will retry in 25s...`
          );
          streamRes.resume();
          streamReq.destroy();
          activeStreams.delete(id);
          setTimeout(() => startHikvisionStream(device, processPunchCallback), 25000);
          return;
        }

        console.log(`[Hikvision Stream] Real-time alert stream CONNECTED to ${name} (${ipAddress}) [HTTP 200 OK]`);
        activeStreams.set(id, streamReq);

        let streamBuffer = "";

        streamRes.on("data", (chunk) => {
          streamBuffer += chunk.toString("utf8");

          // Extract and process any complete JSON objects in the stream buffer
          while (true) {
            const startIdx = streamBuffer.indexOf("{");
            if (startIdx === -1) {
              if (streamBuffer.length > 20000) {
                streamBuffer = streamBuffer.slice(-2000);
              }
              break;
            }

            let depth = 0;
            let endIdx = -1;
            let inString = false;
            let escape = false;

            for (let i = startIdx; i < streamBuffer.length; i++) {
              const char = streamBuffer[i];
              if (escape) {
                escape = false;
                continue;
              }
              if (char === "\\") {
                escape = true;
                continue;
              }
              if (char === '"') {
                inString = !inString;
                continue;
              }
              if (!inString) {
                if (char === "{") depth++;
                else if (char === "}") {
                  depth--;
                  if (depth === 0) {
                    endIdx = i;
                    break;
                  }
                }
              }
            }

            if (endIdx !== -1) {
              const jsonStr = streamBuffer.slice(startIdx, endIdx + 1);
              streamBuffer = streamBuffer.slice(endIdx + 1);

              try {
                const parsed = JSON.parse(jsonStr);
                const eventObj = parsed?.AccessControllerEvent || parsed?.EventNotificationAlert || parsed;

                const major = Number(eventObj?.majorEventType ?? eventObj?.major ?? parsed?.majorEventType ?? 0);
                const minor = Number(eventObj?.subEventType ?? eventObj?.minor ?? parsed?.subEventType ?? 0);
                const eventType = parsed?.eventType || eventObj?.eventType;

                const bioId = eventObj?.employeeNoString || eventObj?.employeeNo || eventObj?.cardNo;
                const isPunchEvent =
                  (major === 5 || eventType === "AccessControllerEvent" || major === 0) &&
                  (VALID_MINOR_CODES.has(minor) || minor === 0);

                if (bioId && isPunchEvent) {
                  const rawTime = eventObj?.eventTime || eventObj?.time || eventObj?.dateTime || parsed?.dateTime;
                  const punchTime = rawTime ? new Date(rawTime) : null;

                  if (punchTime && !isNaN(punchTime.getTime())) {
                    console.log(
                      `[Hikvision Stream] Real-time punch verified: Bio ID ${bioId} (${eventObj?.name || "Unknown"}) at ${punchTime.toISOString()} from ${name}`
                    );
                    if (typeof processPunchCallback === "function") {
                      processPunchCallback({
                        biometricId: String(bioId).trim(),
                        punchTime,
                        brand: "HIKVISION",
                        deviceName: name,
                        method: eventObj?.currentVerifyMode || "HIKVISION_FACE",
                        employeeName: eventObj?.name ? String(eventObj.name).trim() : null,
                        direction: device.direction,
                      }).catch((err) => console.error("Error processing stream punch:", err));
                    }
                  }
                }
              } catch (e) {
                // Ignore parsing errors for non-event JSON fragments
              }
            } else {
              // Incomplete JSON object in buffer; keep buffer from startIdx and wait for next chunk
              streamBuffer = streamBuffer.slice(startIdx);
              break;
            }
          }

          if (streamBuffer.length > 200000) {
            streamBuffer = streamBuffer.slice(-50000);
          }
        });

        streamRes.on("end", () => {
          console.log(`[Hikvision Stream] Stream ended from ${name}. Reconnecting in 10s...`);
          streamReq.destroy();
          activeStreams.delete(id);
          setTimeout(() => startHikvisionStream(device, processPunchCallback), 10000);
        });

        streamRes.on("error", (err) => {
          console.error(`[Hikvision Stream Error] ${name}:`, err.message);
          streamReq.destroy();
          activeStreams.delete(id);
          setTimeout(() => startHikvisionStream(device, processPunchCallback), 10000);
        });
      });

      streamReq.on("error", (err) => {
        console.error(`[Hikvision Auth Stream Error] ${name}:`, err.message);
        streamReq.destroy();
        activeStreams.delete(id);
        setTimeout(() => startHikvisionStream(device, processPunchCallback), 10000);
      });

      streamReq.end();
    } else {
      req.destroy();
      console.warn(`[Hikvision Stream] Unexpected probe status HTTP ${res.statusCode} from ${name}`);
      setTimeout(() => startHikvisionStream(device, processPunchCallback), 15000);
    }
  });

  req.on("error", (err) => {
    req.destroy();
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

  const targetPort = resolveHikvisionPort(port);
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
        const rawTime = ev.time || ev.dateTime;
        const evDate = rawTime ? new Date(rawTime) : null;
        if (!evDate || isNaN(evDate.getTime())) continue;

        // Strictly enforce startTime and endTime boundaries
        if (startTime && evDate < new Date(startTime)) continue;
        if (endTime && evDate > new Date(endTime)) continue;

        allEvents.push({
          biometricId: bioId,
          name: ev.name ? String(ev.name).trim() : null,
          punchTime: rawTime,
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
        direction: device.direction,
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
        status: { not: "OFFLINE" },
      },
    });

    console.log(`[Hikvision Streams] Initializing for ${devices.length} registered online Hikvision device(s)...`);
    for (const device of devices) {
      // 1. Start live alert stream
      startHikvisionStream(device, processPunchCallback);

      // 2. Catch up today's logs immediately in background
      syncHikvisionDeviceLogs(device, processPunchCallback).catch((err) => {
        console.error(`[Hikvision Initial Sync Error] ${device.name}:`, err.message);
      });
    }

    // Note: Periodic machine sync is handled centrally by cron.service.js every 30 minutes
  } catch (error) {
    console.error(`[Hikvision Streams Init Error]:`, error.message);
  }
}

/**
 * Fetches all enrolled users from a Hikvision terminal via ISAPI with pagination
 */
async function fetchHikvisionUsers(device) {
  if (!device || !device.ipAddress) return [];
  const allUsers = [];
  let position = 0;
  const pageSize = 30;

  try {
    while (true) {
      const payload = {
        UserInfoSearchCond: {
          searchID: "scan",
          searchResultPosition: position,
          maxResults: pageSize,
        },
      };

      const res = await sendHikvisionDigest(
        device.ipAddress,
        resolveHikvisionPort(device.port),
        device.username || "admin",
        device.password || "",
        "POST",
        "/ISAPI/AccessControl/UserInfo/Search?format=json",
        payload
      );

      if (!res || res.status !== 200 || !res.body) break;
      let data;
      try {
        data = JSON.parse(res.body);
      } catch (e) {
        break;
      }
      const list = data?.UserInfoSearch?.UserInfo || [];
      const total = data?.UserInfoSearch?.totalMatches || 0;
      if (list.length === 0) break;
      allUsers.push(...list);
      position += list.length;
      if (position >= total) break;
    }
  } catch (error) {
    console.error(`[Hikvision Fetch Users Error] ${device.name || device.ipAddress}:`, error.message);
  }
  return allUsers;
}

/**
 * Fetches enrolled fingerprint template(s) for an employee from a Hikvision terminal
 */
async function fetchHikvisionFingerprints(device, employeeNo) {
  if (!device || !device.ipAddress || !employeeNo) return [];
  try {
    const res = await sendHikvisionDigest(
      device.ipAddress,
      resolveHikvisionPort(device.port),
      device.username || "admin",
      device.password || "",
      "POST",
      "/ISAPI/AccessControl/FingerPrintUpload?format=json",
      { FingerPrintCond: { searchID: "1", employeeNo: String(employeeNo) } }
    );
    if (res && res.status === 200 && res.body) {
      const data = JSON.parse(res.body);
      if (data?.FingerPrintInfo?.status === "OK") {
        return data?.FingerPrintInfo?.FingerPrintList || [];
      }
    }
  } catch (error) {
    console.error(`[Hikvision FP Fetch Error] ${device.name || device.ipAddress} (emp ${employeeNo}):`, error.message);
  }
  return [];
}

/**
 * Pushes/configures an enrolled fingerprint template onto a Hikvision terminal
 */
async function pushHikvisionFingerprint(device, employeeNo, fp) {
  if (!device || !device.ipAddress || !employeeNo || !fp?.fingerData) return false;
  try {
    const res = await sendHikvisionDigest(
      device.ipAddress,
      resolveHikvisionPort(device.port),
      device.username || "admin",
      device.password || "",
      "POST",
      "/ISAPI/AccessControl/FingerPrintDownload?format=json",
      {
        FingerPrintCfg: {
          employeeNo: String(employeeNo),
          enableCardReader: [fp.cardReaderNo || 1],
          fingerPrintID: fp.fingerPrintID || 1,
          fingerType: fp.fingerType || "normalFP",
          fingerData: fp.fingerData,
        },
      }
    );
    return res && res.status === 200;
  } catch (error) {
    console.error(`[Hikvision FP Push Error] ${device.name || device.ipAddress} (emp ${employeeNo}):`, error.message);
    return false;
  }
}

/**
 * Cross-syncs enrolled users and biometric profiles (including fingerprints) across all active Hikvision devices
 */
async function syncBiometricsAcrossDevices(prisma) {
  try {
    const devices = await prisma.biometricDevice.findMany({
      where: { brand: "HIKVISION", deletedAt: null, status: { not: "OFFLINE" } },
    });

    if (devices.length < 2) {
      console.log("[Hikvision Cross-Sync] 1 or no devices registered. Single device active.");
      return { success: true, message: "Sync complete." };
    }

    console.log(`[Hikvision Cross-Sync] Starting biometrics cross-sync across ${devices.length} devices...`);

    // 1️⃣ Fetch enrolled users from all active terminals
    const deviceUserMap = new Map();
    const allUsersMap = new Map();

    for (const dev of devices) {
      const uList = await fetchHikvisionUsers(dev);
      deviceUserMap.set(dev.id, uList);
      console.log(`[Hikvision Cross-Sync] ${dev.name} (${dev.ipAddress}) has ${uList.length} user(s), ${uList.filter(u => (u.numOfFP || 0) > 0).length} with FP.`);
      uList.forEach((u) => {
        const empNo = String(u.employeeNo).trim();
        if (empNo && !allUsersMap.has(empNo)) {
          allUsersMap.set(empNo, {
            employeeNo: empNo,
            name: u.name || `User ${empNo}`,
            userType: u.userType || "normal",
            Valid: u.Valid,
            sourceDevice: dev,
          });
        }
      });
    }

    // 2️⃣ Cross-push missing user profiles so all terminals contain every user
    let pushedUsers = 0;
    for (const [employeeNo, uInfo] of allUsersMap.entries()) {
      for (const dev of devices) {
        const devUsers = deviceUserMap.get(dev.id) || [];
        const exists = devUsers.some((u) => String(u.employeeNo).trim() === employeeNo);
        if (!exists) {
          console.log(`[Hikvision Cross-Sync] Copying user ${uInfo.name} (${employeeNo}) -> ${dev.name}`);
          const pushed = await pushUserToHikvision(dev, {
            biometricId: employeeNo,
            name: uInfo.name,
          });
          if (pushed) {
            pushedUsers++;
            devUsers.push({ employeeNo, name: uInfo.name, numOfFP: 0 });
          }
        }
      }
    }

    // 3️⃣ Cross-sync missing fingerprints across terminals
    let pushedFPs = 0;
    for (const [employeeNo, uInfo] of allUsersMap.entries()) {
      let donorDev = null;
      const targetDevs = [];

      for (const dev of devices) {
        const devUsers = deviceUserMap.get(dev.id) || [];
        const u = devUsers.find((x) => String(x.employeeNo).trim() === employeeNo);
        if (u && (u.numOfFP || 0) > 0) {
          if (!donorDev) donorDev = dev;
        } else {
          targetDevs.push(dev);
        }
      }

      if (donorDev && targetDevs.length > 0) {
        const fps = await fetchHikvisionFingerprints(donorDev, employeeNo);
        if (fps && fps.length > 0) {
          for (const targetDev of targetDevs) {
            for (const fp of fps) {
              const ok = await pushHikvisionFingerprint(targetDev, employeeNo, fp);
              if (ok) {
                console.log(`[Hikvision Cross-Sync] Cloned FP for emp ${employeeNo} (${uInfo.name}) from ${donorDev.name} -> ${targetDev.name}`);
                pushedFPs++;
              }
            }
          }
        }
      }
    }

    console.log(`[Hikvision Cross-Sync] Completed. ${pushedUsers} user(s) and ${pushedFPs} fingerprint(s) synced.`);
    return { success: true, pushedUsers, pushedFPs };
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
  fetchHikvisionFingerprints,
  pushHikvisionFingerprint,
  fetchHikvisionAcsEvents,
  syncHikvisionDeviceLogs,
  syncBiometricsAcrossDevices,
};


