// Production behaviour behind proxies (A3), as on AWS: visitor -> CloudFront -> load balancer -> app.
// node --test runs this file in its own process, so these settings do not affect api.test.js.
// Uses the local database from .env (audit rows and guest carts are removed at the end);
// npm test runs the test files one after another (--test-concurrency=1) for that reason.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'production';
process.env.SESSION_SECRET ||= 'test-only-session-secret';
process.env.SESSION_STORE = 'memory';
process.env.TRUST_PROXY_HOPS = '2';
process.env.TRUST_CLOUDFRONT_PROTO = 'true';

const app = require('../src/app');
const { pool } = require('../src/db');
const { clientIp } = require('../src/clientIp');

let server;
let baseUrl;
const testStart = new Date();
const email = `proxy.test.${Date.now()}@apitest.example`;

// Headers as they arrive from the load balancer: CloudFront added the visitor's IP to
// X-Forwarded-For and CloudFront-Forwarded-Proto; the load balancer added the CloudFront
// edge IP and X-Forwarded-Proto: http (the CloudFront -> load balancer hop is HTTP).
function viaCloudFront(viewerProto, forwardedFor = '203.0.113.9, 130.176.1.1') {
  return {
    'Content-Type': 'application/json',
    'X-Forwarded-For': forwardedFor,
    'X-Forwarded-Proto': 'http',
    'CloudFront-Forwarded-Proto': viewerProto,
  };
}

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await pool.query('DELETE FROM audit_log WHERE email = $1', [email]);
  await pool.query('DELETE FROM carts WHERE user_id IS NULL AND created_at >= $1', [testStart]);
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test('production headers: HSTS, upgrade-insecure-requests, no X-Powered-By', async () => {
  const res = await fetch(`${baseUrl}/api/health`, { headers: viaCloudFront('https') });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('strict-transport-security'), /max-age=31536000; includeSubDomains/);
  assert.match(res.headers.get('content-security-policy'), /upgrade-insecure-requests/);
  assert.equal(res.headers.get('x-powered-by'), null);
});

test('secure cookie: set when the visitor used HTTPS through CloudFront, never for plain HTTP', async () => {
  const add = (proto) =>
    fetch(`${baseUrl}/api/cart/items`, { method: 'POST', headers: viaCloudFront(proto), body: JSON.stringify({ productId: 1 }) });

  const https = await add('https');
  assert.ok(https.ok);
  const cookie = https.headers.get('set-cookie');
  assert.match(cookie, /^skybridge\.sid=/);
  assert.match(cookie, /; Secure/);
  assert.match(cookie, /; HttpOnly/);
  assert.match(cookie, /; SameSite=Lax/);

  const http = await add('http');
  assert.ok(http.ok);
  assert.equal(http.headers.get('set-cookie'), null);
});

test('client IP: two trusted hops give the visitor address; a faked X-Forwarded-For entry is ignored', async () => {
  const login = (forwardedFor) =>
    fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: viaCloudFront('https', forwardedFor),
      body: JSON.stringify({ email, password: 'WrongPass1' }),
    });
  // The visitor sent its own fake X-Forwarded-For value first; only the last two hops are trusted.
  assert.equal((await login('6.6.6.6, 203.0.113.9, 130.176.1.1')).status, 401);
  // Azure App Service style: address with a port.
  assert.equal((await login('203.0.113.10:51234, 130.176.1.1')).status, 401);

  const { rows } = await pool.query('SELECT ip FROM audit_log WHERE email = $1 ORDER BY id', [email]);
  assert.deepEqual(rows.map((r) => r.ip), ['203.0.113.9', '203.0.113.10']);
});

test('clientIp() removes the port that Azure App Service adds', () => {
  assert.equal(clientIp({ ip: '203.0.113.5:51234' }), '203.0.113.5');
  assert.equal(clientIp({ ip: '[2001:db8::1]:443' }), '2001:db8::1');
  assert.equal(clientIp({ ip: '2001:db8::1' }), '2001:db8::1');
  assert.equal(clientIp({ ip: '::1' }), '::1');
});
