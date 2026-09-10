const http = require("http");
const crypto = require("crypto");

function md5(str) {
  return crypto.createHash("md5").update(str).digest("hex");
}

function startHikvisionStream(ip, port, username, password) {
  const targetPort = port === 8000 ? 80 : (port || 80);
  const path = "/ISAPI/Event/notification/alertStream";

  console.log(`[Hikvision Stream] Initiating outgoing socket connection to ${ip}:${targetPort}...`);

  const options = {
    hostname: ip,
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

      const ha1 = md5(`${username}:${realm}:${password}`);
      const ha2 = md5(`GET:${path}`);
      const responseHash = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);

      const digestHeader = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${path}", response="${responseHash}", qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;

      const streamOptions = {
        ...options,
        headers: {
          Authorization: digestHeader,
        },
      };

      const streamReq = http.request(streamOptions, (streamRes) => {
        console.log(`[Hikvision Stream] Connected to ${ip}! Status:`, streamRes.statusCode);

        streamRes.on("data", (chunk) => {
          const str = chunk.toString();
          console.log(`[Hikvision Stream Data Received] Length:`, chunk.length);
          const matchNo =
            str.match(/"employeeNoString"\s*:\s*"([^"]+)"/) ||
            str.match(/"employeeNo"\s*:\s*"([^"]+)"/) ||
            str.match(/<employeeNoString>([^<]+)<\/employeeNoString>/) ||
            str.match(/<employeeNo>([^<]+)<\/employeeNo>/);

          if (matchNo) {
            console.log(`>>> REALTIME STREAM PUNCH DETECTED FOR BIOMETRIC ID: ${matchNo[1]}`);
          }
        });

        streamRes.on("end", () => {
          console.log(`[Hikvision Stream] Stream ended. Reconnecting in 5s...`);
          setTimeout(() => startHikvisionStream(ip, port, username, password), 5000);
        });

        streamRes.on("error", (err) => {
          console.error(`[Hikvision Stream Error]:`, err.message);
          setTimeout(() => startHikvisionStream(ip, port, username, password), 5000);
        });
      });

      streamReq.on("error", (err) => {
        console.error(`[Hikvision Auth Error]:`, err.message);
        setTimeout(() => startHikvisionStream(ip, port, username, password), 5000);
      });

      streamReq.end();
    }
  });

  req.on("error", (err) => {
    console.error(`[Hikvision Initial Request Error]:`, err.message);
    setTimeout(() => startHikvisionStream(ip, port, username, password), 5000);
  });

  req.end();
}

startHikvisionStream("192.168.88.56", 80, "admin", "Active@786");
