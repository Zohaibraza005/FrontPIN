const http = require('http');
const crypto = require('crypto');

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

function sendHikvisionDigest(ip, port, username, password, method, path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: ip,
      port: port || 8000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 401 && res.headers['www-authenticate']) {
        const authHeader = res.headers['www-authenticate'];
        const realmMatch = authHeader.match(/realm="([^"]+)"/);
        const nonceMatch = authHeader.match(/nonce="([^"]+)"/);
        const qopMatch = authHeader.match(/qop="([^"]+)"/);

        const realm = realmMatch ? realmMatch[1] : 'DS-K1T671TMFW';
        const nonce = nonceMatch ? nonceMatch[1] : '';
        const qop = qopMatch ? qopMatch[1] : 'auth';
        const nc = '00000001';
        const cnonce = crypto.randomBytes(8).toString('hex');

        const ha1 = md5(`${username}:${realm}:${password}`);
        const ha2 = md5(`${method}:${path}`);
        const responseHash = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);

        const digestHeader = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${path}", response="${responseHash}", qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;

        const authOptions = {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': digestHeader
          }
        };

        const req2 = http.request(authOptions, (res2) => {
          let body = '';
          res2.on('data', chunk => body += chunk);
          res2.on('end', () => resolve({ status: res2.statusCode, body }));
        });
        req2.on('error', reject);
        req2.write(postData);
        req2.end();
      } else {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body }));
      }
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function run() {
  const ip = '192.168.88.240', port = 80, user = 'admin', pass = 'admin123';

  console.log('--- FETCHING ALL USERS FROM MACHINE 192.168.88.240 (Gate 1) ---');
  let allUsers = [];
  let pos = 0;
  while (true) {
    const res = await sendHikvisionDigest(ip, port, user, pass, 'POST', '/ISAPI/AccessControl/UserInfo/Search?format=json', {
      UserInfoSearchCond: { searchID: '1', searchResultPosition: pos, maxResults: 50 }
    });
    if (res.status !== 200) break;
    const data = JSON.parse(res.body);
    const total = data?.UserInfoSearch?.totalMatches || 0;
    const users = data?.UserInfoSearch?.UserInfo || [];
    if (users.length === 0) break;
    allUsers = allUsers.concat(users);
    pos += users.length;
    if (pos >= total) break;
  }

  console.log(`Found ${allUsers.length} enrolled users on machine 192.168.88.240.`);
  let updated = 0, failed = 0;

  for (const u of allUsers) {
    if (u.doorRight === '1' && u.RightPlan?.[0]?.planTemplateNo === '1') {
      continue;
    }

    const payload = {
      UserInfo: {
        employeeNo: u.employeeNo,
        name: u.name || `User ${u.employeeNo}`,
        userType: u.userType || 'normal',
        doorRight: '1',
        RightPlan: [{ doorNo: 1, planTemplateNo: '1' }],
        Valid: { enable: true, beginTime: '2026-01-01T00:00:00', endTime: '2037-12-31T23:59:59' }
      }
    };

    try {
      const res = await sendHikvisionDigest(ip, port, user, pass, 'PUT', '/ISAPI/AccessControl/UserInfo/SetUp?format=json', payload);
      if (res.status === 200) {
        updated++;
      } else {
        failed++;
      }
    } catch (e) {
      failed++;
    }
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n=== DOOR RIGHTS UPDATE COMPLETE FOR GATE 1 (192.168.88.240) ===`);
  console.log(`Users updated with Door 1 Rights: ${updated}`);
  console.log(`Users failed: ${failed}`);
}

run();

