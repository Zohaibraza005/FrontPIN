const xml2js = require("xml2js");
const http = require("http");
const crypto = require("crypto");

function md5(str) {
  return crypto.createHash("md5").update(str).digest("hex");
}

/**
 * Parses incoming Hikvision ISAPI Webhook payload (XML or JSON)
 * @param {Object|String} body - Express req.body or raw body
 * @returns {Object} normalized punch details { biometricId, punchTime, deviceName, method, rawData }
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

    let biometricId =
      eventObj?.employeeNoString ||
      eventObj?.employeeNo ||
      eventObj?.cardNo ||
      eventObj?.serialNo ||
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

    const rawTime =
      eventObj?.eventTime ||
      eventObj?.time ||
      eventObj?.dateTime ||
      new Date().toISOString();

    const punchTime = new Date(rawTime);

    const method =
      eventObj?.currentVerifyMode ||
      eventObj?.verifyMode ||
      "HIKVISION_FACE";

    return {
      biometricId: biometricId ? String(biometricId).trim() : null,
      punchTime: isNaN(punchTime.getTime()) ? new Date() : punchTime,
      method: String(method),
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
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const targetPort = port === 8000 ? 80 : (port || 80);

    const options = {
      hostname: ip,
      port: targetPort,
      path: path,
      method: method,
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
        req2.on('error', reject);
        req2.write(postData);
        req2.end();
      } else {
        let body = "";
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      }
    });

    req.on('error', reject);
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

  const targetPort = port === 8000 ? 80 : (port || 80);
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

        streamRes.on("data", (chunk) => {
          const str = chunk.toString();
          const matchNo =
            str.match(/"employeeNoString"\s*:\s*"([^"]+)"/) ||
            str.match(/"employeeNo"\s*:\s*"([^"]+)"/) ||
            str.match(/<employeeNoString>([^<]+)<\/employeeNoString>/) ||
            str.match(/<employeeNo>([^<]+)<\/employeeNo>/);

          if (matchNo) {
            const bioId = matchNo[1].trim();
            console.log(`[Hikvision Stream] Real-time punch detected for Biometric ID: ${bioId} on ${name}`);
            if (typeof processPunchCallback === "function") {
              processPunchCallback({
                biometricId: bioId,
                punchTime: new Date(),
                brand: "HIKVISION",
                deviceName: name,
                method: "HIKVISION_FACE",
              }).catch((err) => console.error("Error processing real-time punch:", err));
            }
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

async function initHikvisionStreams(prisma, processPunchCallback) {
  try {
    const devices = await prisma.biometricDevice.findMany({
      where: {
        brand: "HIKVISION",
        deletedAt: null,
      },
    });

    console.log(`[Hikvision Streams] Starting alertStream listeners for ${devices.length} registered Hikvision device(s)...`);
    for (const device of devices) {
      startHikvisionStream(device, processPunchCallback);
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

module.exports = {
  parseHikvisionEvent,
  pushUserToHikvision,
  startHikvisionStream,
  initHikvisionStreams,
  fetchHikvisionUsers,
};


