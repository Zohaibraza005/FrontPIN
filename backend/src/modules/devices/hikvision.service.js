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

module.exports = {
  parseHikvisionEvent,
  pushUserToHikvision,
};
