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

sendHikvisionDigest('192.168.88.56', 80, 'admin', 'Active@786', 'PUT', '/ISAPI/AccessControl/UserInfo/SetUp?format=json', {
  UserInfo: {
    employeeNo: '1919',
    name: 'Maryam M',
    userType: 'normal',
    closeDelayEnabled: false,
    Valid: {
      enable: true,
      beginTime: '2026-01-01T00:00:00',
      endTime: '2037-12-31T23:59:59'
    }
  }
}).then(res => console.log('RESPONSE:', res)).catch(err => console.error('ERROR:', err));
