#!/usr/bin/env node
/**
 * HR Pro Bridge Agent
 *
 * Runs on any PC/Mac inside the office LAN. Connects to the Hikvision terminals
 * (ISAPI alertStream + periodic AcsEvent catch-up) and relays every punch to the
 * live HR Pro server over HTTPS:
 *
 *   Hikvision (LAN) ──► HR Pro Bridge (this program) ──HTTPS──► backend /api/devices/bridge/*
 *
 * Punches are queued on disk, so nothing is lost while the internet is down.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const crypto = require("crypto");
const readline = require("readline");

const VERSION = "1.0.0";
const STATUS_PORT = 47811;

// When packaged with pkg, keep config/logs next to the executable
const BASE_DIR = process.pkg ? path.dirname(process.execPath) : path.resolve(__dirname, "..");
const CONFIG_FILE = path.join(BASE_DIR, "config.json");
const QUEUE_FILE = path.join(BASE_DIR, "queue.json");
const SENT_FILE = path.join(BASE_DIR, "sent.json");
const LOG_FILE = path.join(BASE_DIR, "bridge.log");

const DEFAULT_CONFIG = {
  serverUrl: "https://backend.attendance.frontforcecrm.com",
  bridgeToken: "",
  timezoneOffset: "+05:00", // device local time offset, used for AcsEvent catch-up queries
  catchUpEveryMinutes: 1,
  catchUpWindowHours: 2,
  initialCatchUpHours: 24,
  deviceRefreshMinutes: 5,
};

// Same access-granted minor codes the backend accepts
const VALID_MINOR_CODES = new Set([1, 25, 38, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 113, 115, 120]);

/* ───────────────────────────── Logging ───────────────────────────── */

function log(level, ...args) {
  const line = `[${new Date().toISOString()}] [${level}] ${args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ")}`;
  console.log(line);
  try {
    if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > 5 * 1024 * 1024) {
      fs.renameSync(LOG_FILE, LOG_FILE + ".1");
    }
    fs.appendFileSync(LOG_FILE, line + os.EOL);
  } catch (e) {}
}
const info = (...a) => log("INFO", ...a);
const warn = (...a) => log("WARN", ...a);
const error = (...a) => log("ERROR", ...a);

/* ───────────────────────────── Config ───────────────────────────── */

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    return fallback;
  }
}

function writeJson(file, data) {
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

async function ask(rl, question, def) {
  return new Promise((resolve) => {
    rl.question(def ? `${question} [${def}]: ` : `${question}: `, (ans) => resolve(ans.trim() || def || ""));
  });
}

async function loadConfig(forceSetup) {
  const existing = readJson(CONFIG_FILE, null);
  if (existing && existing.serverUrl && existing.bridgeToken && !forceSetup) {
    return { ...DEFAULT_CONFIG, ...existing };
  }

  const base = { ...DEFAULT_CONFIG, ...(existing || {}) };
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log("\n=== HR Pro Bridge setup ===\n");
  base.serverUrl = (await ask(rl, "Backend URL", base.serverUrl)).replace(/\/+$/, "");
  base.bridgeToken = await ask(rl, "Bridge token (BRIDGE_TOKEN from server .env)", base.bridgeToken);
  base.timezoneOffset = await ask(rl, "Device timezone offset", base.timezoneOffset);
  rl.close();

  if (!base.bridgeToken) {
    console.error("Bridge token is required.");
    process.exit(1);
  }
  writeJson(CONFIG_FILE, base);
  console.log(`\nSaved ${CONFIG_FILE}\n`);
  return base;
}

/* ───────────────────────────── Server API ───────────────────────────── */

let CONFIG = null;

async function api(method, route, body) {
  const res = await fetch(`${CONFIG.serverUrl}/api/devices/bridge${route}`, {
    method,
    headers: { "Content-Type": "application/json", "x-bridge-token": CONFIG.bridgeToken },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60000),
  });
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch (e) {}
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${data?.message || text.slice(0, 200)}`);
  }
  return data;
}

/* ───────────────────────────── Hikvision ISAPI ───────────────────────────── */

function md5(s) {
  return crypto.createHash("md5").update(s).digest("hex");
}

function resolvePort(port) {
  const p = Number(port);
  if (!p || p === 8000 || p === 4370) return 80;
  return p;
}

function buildDigestHeader(challenge, username, password, method, uri) {
  const pick = (k) => {
    const m = challenge.match(new RegExp(`${k}="?([^",]+)"?`, "i"));
    return m ? m[1] : null;
  };
  const realm = pick("realm") || "";
  const nonce = pick("nonce") || "";
  const opaque = pick("opaque");
  const qopRaw = pick("qop");
  const qop = qopRaw ? (qopRaw.split(",").map((s) => s.trim()).includes("auth") ? "auth" : qopRaw.split(",")[0].trim()) : null;
  const nc = "00000001";
  const cnonce = crypto.randomBytes(8).toString("hex");

  const ha1 = md5(`${username}:${realm}:${password}`);
  const ha2 = md5(`${method}:${uri}`);
  const response = qop ? md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`) : md5(`${ha1}:${nonce}:${ha2}`);

  let header = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"`;
  if (qop) header += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;
  if (opaque) header += `, opaque="${opaque}"`;
  return header;
}

function rawRequest(options, payload, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => resolve({ req, res }));
    req.setTimeout(timeoutMs, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function readBody(res) {
  return new Promise((resolve, reject) => {
    let body = "";
    res.setEncoding("utf8");
    res.on("data", (c) => (body += c));
    res.on("end", () => resolve(body));
    res.on("error", reject);
  });
}

/**
 * Digest-authenticated ISAPI request. With stream=true the open response is returned
 * (used for the long-lived alertStream), otherwise { status, body }.
 */
async function isapi(dev, method, uri, body, { stream = false, timeoutMs = 15000 } = {}) {
  const payload = body ? JSON.stringify(body) : null;
  const base = {
    hostname: dev.ipAddress,
    port: resolvePort(dev.port),
    path: uri,
    method,
    agent: false,
    headers: payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {},
  };

  let { req, res } = await rawRequest(base, payload, timeoutMs);
  if (res.statusCode === 401 && res.headers["www-authenticate"]) {
    res.resume();
    req.destroy();
    const auth = buildDigestHeader(res.headers["www-authenticate"], dev.username || "admin", dev.password || "", method, uri);
    ({ req, res } = await rawRequest({ ...base, headers: { ...base.headers, Authorization: auth } }, payload, timeoutMs));
  }

  if (stream) return { req, res };
  const text = await readBody(res);
  return { status: res.statusCode, body: text };
}

function normalizeEvent(dev, ev) {
  const major = Number(ev?.majorEventType ?? ev?.major ?? 0);
  const minor = Number(ev?.subEventType ?? ev?.minor ?? 0);
  if (major !== 5 && major !== 0) return null;
  if (!VALID_MINOR_CODES.has(minor) && minor !== 0) return null;

  const bioId = ev?.employeeNoString || ev?.employeeNo || ev?.cardNo;
  const rawTime = ev?.eventTime || ev?.time || ev?.dateTime;
  if (!bioId || !rawTime || isNaN(new Date(rawTime).getTime())) return null;

  return {
    biometricId: String(bioId).trim(),
    punchTime: String(rawTime),
    brand: "HIKVISION",
    deviceName: dev.name,
    method: ev?.currentVerifyMode || ev?.verifyMode || "HIKVISION_FACE",
    employeeName: ev?.name ? String(ev.name).trim() : null,
    direction: dev.direction || undefined,
  };
}

function formatDeviceTime(date, offset) {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(offset || "+00:00");
  const mins = m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
  return new Date(date.getTime() + mins * 60000).toISOString().slice(0, 19) + (m ? offset : "+00:00");
}

async function fetchAcsEvents(dev, start, end) {
  const events = [];
  const searchID = `bridge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  let position = 0;

  while (true) {
    const { status, body } = await isapi(dev, "POST", "/ISAPI/AccessControl/AcsEvent?format=json", {
      AcsEventCond: {
        searchID,
        searchResultPosition: position,
        maxResults: 30,
        major: 0,
        minor: 0,
        startTime: formatDeviceTime(start, CONFIG.timezoneOffset),
        endTime: formatDeviceTime(end, CONFIG.timezoneOffset),
      },
    });
    if (status !== 200) throw new Error(`AcsEvent HTTP ${status}`);

    const data = JSON.parse(body);
    const list = data?.AcsEvent?.InfoList || [];
    const total = data?.AcsEvent?.totalMatches || 0;
    for (const ev of list) {
      const p = normalizeEvent(dev, ev);
      if (p) events.push(p);
    }
    position += list.length;
    if (list.length === 0 || position >= total) break;
  }
  return events;
}

/* ───────────────────────────── Queue & de-duplication ───────────────────────────── */

let queue = readJson(QUEUE_FILE, []);
const sent = new Map(Object.entries(readJson(SENT_FILE, {}))); // key -> punch epoch ms
const queuedKeys = new Set(queue.map((p) => p.key));
let flushing = false;
let flushBackoffMs = 0;
let lastFlushAt = null;
let lastFlushError = null;
let totalDelivered = 0;

function punchKey(p) {
  return `${p.deviceName}|${p.biometricId}|${new Date(p.punchTime).getTime()}`;
}

function enqueue(punches, source) {
  let added = 0;
  for (const p of punches) {
    const key = punchKey(p);
    if (sent.has(key) || queuedKeys.has(key)) continue;
    queue.push({ ...p, key });
    queuedKeys.add(key);
    added++;
  }
  if (added > 0) {
    writeJson(QUEUE_FILE, queue);
    info(`Queued ${added} new punch(es) from ${source}. Pending: ${queue.length}`);
    flushQueue();
  }
}

function pruneSent() {
  const cutoff = Date.now() - 3 * 24 * 3600 * 1000;
  for (const [k, t] of sent) if (t < cutoff) sent.delete(k);
  writeJson(SENT_FILE, Object.fromEntries(sent));
}

async function flushQueue() {
  if (flushing || queue.length === 0) return;
  flushing = true;
  try {
    while (queue.length > 0) {
      const batch = queue.slice(0, 500);
      const data = await api("POST", "/punches", { punches: batch.map(({ key, ...p }) => p) });

      for (const p of batch) {
        sent.set(p.key, new Date(p.punchTime).getTime());
        queuedKeys.delete(p.key);
      }
      queue = queue.slice(batch.length);
      writeJson(QUEUE_FILE, queue);
      pruneSent();

      totalDelivered += batch.length;
      lastFlushAt = new Date();
      lastFlushError = null;
      flushBackoffMs = 0;

      const failed = (data?.results || []).filter((r) => !r.success);
      info(`Delivered ${batch.length} punch(es) to server (${data?.processed ?? "?"} recorded).`);
      for (const f of failed) {
        const p = batch[f.idx];
        if (p) warn(`Server skipped punch Bio ID ${p.biometricId} @ ${p.punchTime}: ${f.reason || f.type || "not recorded"}`);
      }
    }
  } catch (err) {
    lastFlushError = err.message;
    flushBackoffMs = Math.min(Math.max(flushBackoffMs * 2, 5000), 60000);
    warn(`Server unreachable (${err.message}). ${queue.length} punch(es) kept in queue, retrying in ${flushBackoffMs / 1000}s.`);
    setTimeout(flushQueue, flushBackoffMs);
  } finally {
    flushing = false;
  }
}

/* ───────────────────────────── Device management ───────────────────────────── */

const devices = new Map(); // id -> state

function deviceSignature(d) {
  return JSON.stringify([d.name, d.ipAddress, d.port, d.username, d.password, d.direction]);
}

function startStream(state) {
  if (state.stopped) return;
  const dev = state.dev;
  const uri = "/ISAPI/Event/notification/alertStream";

  const retry = (delay, reason) => {
    if (state.stopped) return;
    if (state.streamOnline) warn(`[${dev.name}] stream lost (${reason}). Reconnecting in ${delay / 1000}s...`);
    state.streamOnline = false;
    state.lastError = reason;
    clearTimeout(state.retryTimer);
    state.retryTimer = setTimeout(() => startStream(state), delay);
  };

  isapi(dev, "GET", uri, null, { stream: true, timeoutMs: 120000 })
    .then(({ req, res }) => {
      if (state.stopped) return req.destroy();
      if (res.statusCode !== 200) {
        res.resume();
        req.destroy();
        return retry(25000, `HTTP ${res.statusCode}`);
      }

      state.req = req;
      state.streamOnline = true;
      state.lastError = null;
      info(`[${dev.name}] live stream CONNECTED (${dev.ipAddress})`);

      let buf = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        buf += chunk;
        while (true) {
          const start = buf.indexOf("{");
          if (start === -1) {
            if (buf.length > 20000) buf = buf.slice(-2000);
            break;
          }
          let depth = 0, end = -1, inStr = false, esc = false;
          for (let i = start; i < buf.length; i++) {
            const c = buf[i];
            if (esc) { esc = false; continue; }
            if (c === "\\") { esc = true; continue; }
            if (c === '"') { inStr = !inStr; continue; }
            if (inStr) continue;
            if (c === "{") depth++;
            else if (c === "}" && --depth === 0) { end = i; break; }
          }
          if (end === -1) {
            buf = buf.slice(start);
            break;
          }
          const json = buf.slice(start, end + 1);
          buf = buf.slice(end + 1);
          try {
            const parsed = JSON.parse(json);
            const ev = parsed?.AccessControllerEvent || parsed?.EventNotificationAlert || parsed;
            const p = normalizeEvent(dev, { ...ev, dateTime: ev?.dateTime || parsed?.dateTime });
            if (p) {
              info(`[${dev.name}] punch: Bio ID ${p.biometricId} (${p.employeeName || "?"}) at ${p.punchTime}`);
              enqueue([p], `${dev.name} (live)`);
            }
          } catch (e) {}
        }
        if (buf.length > 200000) buf = buf.slice(-50000);
      });
      res.on("end", () => retry(10000, "stream ended"));
      res.on("error", (err) => retry(10000, err.message));
    })
    .catch((err) => retry(15000, err.message));
}

function stopDevice(state) {
  state.stopped = true;
  clearTimeout(state.retryTimer);
  try { state.req?.destroy(); } catch (e) {}
}

async function refreshDevices() {
  let list;
  try {
    const data = await api("GET", "/devices");
    list = (data?.data || []).filter((d) => d.brand === "HIKVISION" && d.ipAddress);
  } catch (err) {
    warn(`Could not fetch device list from server: ${err.message}`);
    return;
  }

  const seen = new Set();
  for (const dev of list) {
    seen.add(dev.id);
    const sig = deviceSignature(dev);
    const existing = devices.get(dev.id);
    if (existing && existing.sig === sig) continue;
    if (existing) {
      info(`[${dev.name}] settings changed, reconnecting...`);
      stopDevice(existing);
    } else {
      info(`[${dev.name}] registered (${dev.ipAddress}:${resolvePort(dev.port)})`);
    }
    const state = { dev, sig, stopped: false, streamOnline: false, lastCatchUpOk: null, lastCatchUpAt: null, lastError: null };
    devices.set(dev.id, state);
    startStream(state);
    catchUpDevice(state, CONFIG.initialCatchUpHours);
  }

  for (const [id, state] of devices) {
    if (!seen.has(id)) {
      info(`[${state.dev.name}] removed on server, disconnecting.`);
      stopDevice(state);
      devices.delete(id);
    }
  }
}

async function catchUpDevice(state, hours) {
  if (state.stopped || state.catchingUp) return;
  state.catchingUp = true;
  const end = new Date();
  const start = new Date(end.getTime() - hours * 3600 * 1000);
  try {
    const events = await fetchAcsEvents(state.dev, start, end);
    state.lastCatchUpOk = true;
    state.lastCatchUpAt = new Date();
    enqueue(events, `${state.dev.name} (sync)`);
  } catch (err) {
    if (state.lastCatchUpOk !== false) warn(`[${state.dev.name}] catch-up sync failed: ${err.message}`);
    state.lastCatchUpOk = false;
    state.lastError = err.message;
  } finally {
    state.catchingUp = false;
  }
}

async function heartbeat() {
  const payload = [...devices.values()].map((s) => ({ id: s.dev.id, online: s.streamOnline || s.lastCatchUpOk === true }));
  try {
    await api("POST", "/heartbeat", { devices: payload, agent: { version: VERSION, host: os.hostname(), queue: queue.length } });
  } catch (err) {
    // flushQueue already reports connectivity problems
  }
}

/* ───────────────────────────── Status page / single instance ───────────────────────────── */

function statusSnapshot() {
  return {
    version: VERSION,
    server: CONFIG.serverUrl,
    pendingPunches: queue.length,
    totalDelivered,
    lastFlushAt,
    lastFlushError,
    devices: [...devices.values()].map((s) => ({
      name: s.dev.name,
      ip: s.dev.ipAddress,
      liveStream: s.streamOnline ? "CONNECTED" : "DISCONNECTED",
      lastCatchUpAt: s.lastCatchUpAt,
      lastError: s.lastError,
    })),
  };
}

function startStatusServer() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(statusSnapshot(), null, 2));
    });
    srv.on("error", (err) => resolve(err.code === "EADDRINUSE" ? false : true));
    srv.listen(STATUS_PORT, "127.0.0.1", () => resolve(true));
  });
}

/* ───────────────────────────── Autostart install ───────────────────────────── */

function installAutostart() {
  const exe = process.execPath;
  if (!process.pkg) {
    console.error("--install only works with the packaged executable.");
    process.exit(1);
  }

  if (process.platform === "win32") {
    const startup = path.join(process.env.APPDATA, "Microsoft", "Windows", "Start Menu", "Programs", "Startup");
    const vbs = path.join(startup, "HRProBridge.vbs");
    fs.writeFileSync(vbs, `CreateObject("WScript.Shell").Run """${exe}""", 0, False\r\n`);
    console.log(`Installed: HR Pro Bridge will start hidden on every login.\n  ${vbs}`);
  } else if (process.platform === "darwin") {
    const plist = path.join(os.homedir(), "Library", "LaunchAgents", "com.hrpro.bridge.plist");
    fs.mkdirSync(path.dirname(plist), { recursive: true });
    fs.writeFileSync(
      plist,
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.hrpro.bridge</string>
  <key>ProgramArguments</key><array><string>${exe}</string></array>
  <key>WorkingDirectory</key><string>${BASE_DIR}</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${path.join(BASE_DIR, "launchd.out.log")}</string>
  <key>StandardErrorPath</key><string>${path.join(BASE_DIR, "launchd.err.log")}</string>
</dict></plist>
`
    );
    require("child_process").execSync(`launchctl unload "${plist}" 2>/dev/null; launchctl load "${plist}"`);
    console.log(`Installed: HR Pro Bridge now runs in the background and on every login.\n  ${plist}`);
  } else {
    console.log("Use systemd on Linux to run this executable as a service.");
  }
}

function uninstallAutostart() {
  if (process.platform === "win32") {
    const vbs = path.join(process.env.APPDATA, "Microsoft", "Windows", "Start Menu", "Programs", "Startup", "HRProBridge.vbs");
    if (fs.existsSync(vbs)) fs.unlinkSync(vbs);
  } else if (process.platform === "darwin") {
    const plist = path.join(os.homedir(), "Library", "LaunchAgents", "com.hrpro.bridge.plist");
    try { require("child_process").execSync(`launchctl unload "${plist}"`); } catch (e) {}
    if (fs.existsSync(plist)) fs.unlinkSync(plist);
  }
  console.log("Autostart removed.");
}

/* ───────────────────────────── Main ───────────────────────────── */

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--version")) return console.log(VERSION);
  if (args.includes("--uninstall")) return uninstallAutostart();

  CONFIG = await loadConfig(args.includes("--setup"));
  if (args.includes("--install")) return installAutostart();

  if (!(await startStatusServer())) {
    console.log(`HR Pro Bridge is already running on this computer (status: http://127.0.0.1:${STATUS_PORT}).`);
    return setTimeout(() => process.exit(0), 4000);
  }

  info(`HR Pro Bridge v${VERSION} started. Server: ${CONFIG.serverUrl}`);
  info(`Status page: http://127.0.0.1:${STATUS_PORT}  |  Logs: ${LOG_FILE}`);
  if (queue.length) info(`${queue.length} punch(es) pending from previous run.`);

  await refreshDevices();
  flushQueue();
  heartbeat();

  setInterval(refreshDevices, CONFIG.deviceRefreshMinutes * 60000);
  setInterval(() => {
    for (const state of devices.values()) catchUpDevice(state, CONFIG.catchUpWindowHours);
  }, CONFIG.catchUpEveryMinutes * 60000);
  setInterval(heartbeat, 60000);
  setInterval(flushQueue, 30000);
}

process.on("uncaughtException", (err) => error("Uncaught:", err.stack || err.message));
process.on("unhandledRejection", (err) => error("Unhandled:", err?.stack || String(err)));

main();
