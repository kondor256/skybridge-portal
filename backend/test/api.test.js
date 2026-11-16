// End-to-end API test against the database in the PG* variables (use the local
// one, with the sample data loaded). Run: npm test
// The test creates one customer, one order and one product and removes them at the end.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const config = require('../src/config');
const { pool } = require('../src/db');

let server;
let baseUrl;
const testStart = new Date();

// Changes one character in the middle of the ciphertext part of a stored value.
function tamper(stored) {
  const parts = stored.split(':');
  const chars = [...parts[4]];
  const i = Math.floor(chars.length / 2);
  chars[i] = chars[i] === 'A' ? 'B' : 'A';
  parts[4] = chars.join('');
  return parts.join(':');
}

async function auditEvents(where, params) {
  const { rows } = await pool.query(`SELECT event, details FROM audit_log WHERE created_at >= $1 AND ${where} ORDER BY id`, [
    testStart,
    ...params,
  ]);
  return rows;
}

// A tiny browser stand-in: keeps the session cookie between requests.
// Each client has its own IP address (X-Forwarded-For, trusted with TRUST_PROXY_HOPS=1),
// so the login rate limit of one client does not affect the others.
let nextIp = 0;
function client() {
  let cookie = '';
  const ip = `198.51.100.${++nextIp}`;
  return async function request(method, path, body) {
    const res = await fetch(baseUrl + path, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip, ...(cookie && { Cookie: cookie }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    const type = res.headers.get('content-type') || '';
    return { status: res.status, body: type.includes('json') ? await res.json() : await res.text(), headers: res.headers };
  };
}

const email = `test.user.${Date.now()}@apitest.example`;
const lockEmail = `lock.test.${Date.now()}@apitest.example`;
const password = 'TestUser2026';
const ADMIN = { email: 'admin@skybridge.example', password: 'SkyAdmin2026!' };
let createdProductId;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await pool.query('DELETE FROM audit_log WHERE created_at >= $1', [testStart]);
  await pool.query('DELETE FROM users WHERE email = ANY($1)', [[email, lockEmail]]);
  if (createdProductId) await pool.query('DELETE FROM products WHERE id = $1', [createdProductId]);
  await pool.query('DELETE FROM carts WHERE user_id IS NULL');
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test('health endpoints answer', async () => {
  const guest = client();
  const health = await guest('GET', '/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.status, 'ok');
  assert.equal(health.headers.get('set-cookie'), null);
  const db = await guest('GET', '/api/health/db');
  assert.equal(db.status, 200);
});

test('catalogue: list, filter, search, details, unknown id', async () => {
  const guest = client();
  const all = await guest('GET', '/api/products');
  assert.equal(all.status, 200);
  assert.ok(all.body.products.length >= 12);
  assert.equal(typeof all.body.products[0].price, 'number');
  assert.equal(all.headers.get('cache-control'), 'no-store');

  const devops = await guest('GET', '/api/products?category=devops');
  assert.ok(devops.body.products.length >= 4);
  assert.ok(devops.body.products.every((p) => p.categorySlug === 'devops'));

  const search = await guest('GET', '/api/products?q=penetration');
  assert.equal(search.body.products.length, 1);
  assert.equal((await guest('GET', '/api/products?q=100%25')).body.products.length, 0);

  const one = await guest('GET', '/api/products/1');
  assert.equal(one.body.product.name, 'Web Application Penetration Test');
  assert.ok(Array.isArray(one.body.product.features));

  assert.equal((await guest('GET', '/api/products/999999')).status, 404);
  assert.equal((await guest('GET', '/api/products/abc')).status, 404);
  assert.equal((await guest('GET', '/api/categories')).body.categories.length, 3);
  assert.equal((await guest('GET', '/api/nothing-here')).status, 404);
});

test('registration: validation, success, duplicate email', async () => {
  const guest = client();
  const empty = await guest('POST', '/api/auth/register', {});
  assert.equal(empty.status, 400);
  assert.deepEqual(Object.keys(empty.body.fields).sort(), ['email', 'fullName', 'password']);

  const bad = await guest('POST', '/api/auth/register', {
    fullName: 'T3st!', email: 'not-an-email', phone: 'abc', password: 'weak', confirmPassword: 'other',
  });
  assert.equal(bad.status, 400);
  assert.deepEqual(Object.keys(bad.body.fields).sort(), ['confirmPassword', 'email', 'fullName', 'password', 'phone']);

  const ok = await guest('POST', '/api/auth/register', {
    fullName: 'Test User', email: email.toUpperCase(), phone: '+64 21 555 0199', password, confirmPassword: password,
  });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.user.email, email);
  assert.equal(ok.body.user.role, 'customer');
  assert.equal(ok.body.user.password_hash, undefined);
  assert.equal((await guest('GET', '/api/auth/me')).body.user.email, email);

  const { rows } = await pool.query('SELECT password_hash FROM users WHERE email = $1', [email]);
  assert.match(rows[0].password_hash, /^\$2[aby]\$10\$/);

  // A3: the phone number is stored only as ciphertext, but the API returns the plain value.
  assert.equal(ok.body.user.phone, '+64 21 555 0199');
  const stored = (await pool.query('SELECT phone FROM users WHERE email = $1', [email])).rows[0].phone;
  assert.match(stored, /^v1:k\d+:/);
  assert.ok(!stored.includes('555 0199'));
  assert.equal((await guest('GET', '/api/auth/me')).body.user.phone, '+64 21 555 0199');
  assert.deepEqual((await auditEvents('email = $2', [email])).map((r) => r.event), ['register']);

  const again = await client()('POST', '/api/auth/register', {
    fullName: 'Test User', email, password, confirmPassword: password,
  });
  assert.equal(again.status, 409);
  assert.ok(again.body.fields.email);
});

test('login: validation, wrong password, success, logout', async () => {
  const c = client();
  assert.equal((await c('POST', '/api/auth/login', {})).status, 400);
  const wrong = await c('POST', '/api/auth/login', { email, password: 'WrongPass1' });
  assert.equal(wrong.status, 401);
  const unknown = await c('POST', '/api/auth/login', { email: 'nobody@apitest.example', password });
  assert.equal(unknown.status, 401);
  assert.equal(unknown.body.error, wrong.body.error);

  assert.equal((await c('POST', '/api/auth/login', { email, password })).status, 200);
  assert.equal((await c('GET', '/api/auth/me')).body.user.email, email);
  assert.equal((await c('POST', '/api/auth/logout')).status, 200);
  assert.equal((await c('GET', '/api/auth/me')).body.user, null);
  assert.equal((await c('GET', '/api/orders')).status, 401);

  // A3: every login attempt and the logout are in the audit log.
  const events = await auditEvents("(email = $2 OR email = 'nobody@apitest.example')", [email]);
  assert.deepEqual(
    events.map((r) => `${r.event}:${r.details.reason ?? ''}`),
    ['register:', 'login_failed:wrong_password', 'login_failed:unknown_email', 'login_success:'],
  );
  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  assert.equal((await auditEvents("event = 'logout' AND user_id = $2", [rows[0].id])).length, 1);
});

test('cart: guest add, edit, remove; merge on login; checkout; orders', async () => {
  const c = client();
  assert.equal((await c('GET', '/api/cart')).body.cart.items.length, 0);
  assert.equal((await c('POST', '/api/cart/items', { productId: 999999 })).status, 404);
  assert.equal((await c('POST', '/api/cart/items', { productId: 1, quantity: 0 })).status, 400);

  await c('POST', '/api/cart/items', { productId: 1 });
  await c('POST', '/api/cart/items', { productId: 4, quantity: 2 });
  let cart = (await c('POST', '/api/cart/items', { productId: 4, quantity: 1 })).body.cart;
  assert.equal(cart.items.length, 2);
  assert.equal(cart.count, 4);
  assert.equal(cart.subtotal, 9800 + 3 * 2400);

  cart = (await c('PATCH', '/api/cart/items/4', { quantity: 6 })).body.cart;
  assert.equal(cart.subtotal, 9800 + 6 * 2400);
  assert.equal(cart.gst, 3630);
  assert.equal(cart.total, 27830);
  assert.equal((await c('PATCH', '/api/cart/items/4', { quantity: 100 })).status, 400);
  assert.equal((await c('PATCH', '/api/cart/items/12', { quantity: 1 })).status, 404);

  cart = (await c('DELETE', '/api/cart/items/1')).body.cart;
  assert.equal(cart.items.length, 1);

  // Another visitor does not see this cart.
  assert.equal((await client()('GET', '/api/cart')).body.cart.items.length, 0);

  // Checkout needs a login; the guest cart follows the customer.
  assert.equal((await c('POST', '/api/orders', { companyName: 'Test Ltd', contactPhone: '021 555 0199' })).status, 401);
  await c('POST', '/api/auth/login', { email, password });
  cart = (await c('GET', '/api/cart')).body.cart;
  assert.equal(cart.items.length, 1);
  assert.equal(cart.items[0].quantity, 6);

  const invalid = await c('POST', '/api/orders', { companyName: '', contactPhone: 'x' });
  assert.equal(invalid.status, 400);
  assert.deepEqual(Object.keys(invalid.body.fields).sort(), ['companyName', 'contactPhone']);

  const placed = await c('POST', '/api/orders', { companyName: 'Test Ltd', contactPhone: '021 555 0199', notes: 'api test' });
  assert.equal(placed.status, 201);
  assert.equal(placed.body.order.status, 'pending');
  assert.equal(placed.body.order.subtotal, 14400);
  assert.equal(placed.body.order.total, 16560);
  assert.equal(placed.body.order.items[0].lineTotal, 14400);

  // A3: company name, phone and notes are ciphertext in the database, plain text for the customer.
  assert.equal(placed.body.order.companyName, 'Test Ltd');
  assert.equal(placed.body.order.notes, 'api test');
  const row = (await pool.query('SELECT company_name, contact_phone, notes FROM orders WHERE id = $1', [placed.body.order.id])).rows[0];
  for (const value of Object.values(row)) assert.match(value, /^v1:k\d+:/);

  // A3: a changed ciphertext is detected: the field is unavailable, the rest of the order still loads, and it is audited.
  await pool.query('UPDATE orders SET notes = $1 WHERE id = $2', [tamper(row.notes), placed.body.order.id]);
  const damaged = await c('GET', `/api/orders/${placed.body.order.id}`);
  assert.equal(damaged.status, 200);
  assert.equal(damaged.body.order.notes, null);
  assert.deepEqual(damaged.body.order.unavailableFields, ['notes']);
  assert.equal(damaged.body.order.companyName, 'Test Ltd');
  const failures = await auditEvents("event = 'decrypt_failed' AND (details->>'id')::int = $2", [placed.body.order.id]);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].details.field, 'notes');
  await pool.query('UPDATE orders SET notes = $1 WHERE id = $2', [row.notes, placed.body.order.id]);

  assert.equal((await c('GET', '/api/cart')).body.cart.items.length, 0);
  assert.equal((await c('POST', '/api/orders', { companyName: 'Test Ltd', contactPhone: '021 555 0199' })).status, 400);

  const orders = (await c('GET', '/api/orders')).body.orders;
  assert.equal(orders.length, 1);
  assert.equal((await c('GET', `/api/orders/${orders[0].id}`)).status, 200);
  // Another customer's order is not visible.
  assert.equal((await c('GET', '/api/orders/1')).status, 404);

  // The cart is stored per customer, so it is still there in a new session.
  await c('POST', '/api/cart/items', { productId: 9 });
  const second = client();
  await second('POST', '/api/auth/login', { email, password });
  assert.equal((await second('GET', '/api/cart')).body.cart.items[0].productId, 9);
});

test('admin: access control, add, edit, delete, visible in the catalogue at once', async () => {
  const guest = client();
  const customer = client();
  const admin = client();
  const draft = {
    name: 'API Test Package', categoryId: 2, summary: 'Created by the automated API test.',
    description: 'Temporary.', features: ['One', 'Two'], price: 1234.5, unit: 'project',
    duration: '1 week', imageUrl: '/img/devops-pipeline.svg',
  };

  assert.equal((await guest('GET', '/api/admin/products')).status, 401);
  await customer('POST', '/api/auth/login', { email, password });
  assert.equal((await customer('POST', '/api/admin/products', draft)).status, 403);
  assert.equal((await customer('POST', '/api/auth/login', { email, password, portal: 'admin' })).status, 403);

  assert.equal((await admin('POST', '/api/auth/login', { ...ADMIN, password: 'nope' })).status, 401);
  const login = await admin('POST', '/api/auth/login', { ...ADMIN, portal: 'admin' });
  assert.equal(login.body.user.role, 'admin');
  assert.equal((await admin('POST', '/api/orders', { companyName: 'X Ltd', contactPhone: '021 555 0199' })).status, 403);

  const invalid = await admin('POST', '/api/admin/products', { name: 'x', price: -1, unit: 'year', imageUrl: 'javascript:alert(1)' });
  assert.equal(invalid.status, 400);
  assert.deepEqual(Object.keys(invalid.body.fields).sort(), ['categoryId', 'imageUrl', 'name', 'price', 'summary', 'unit']);
  assert.equal((await admin('POST', '/api/admin/products', { ...draft, categoryId: 999 })).status, 400);
  assert.equal((await admin('POST', '/api/admin/products', { ...draft, price: 1.005 })).status, 400);

  const created = await admin('POST', '/api/admin/products', draft);
  assert.equal(created.status, 201);
  createdProductId = created.body.product.id;
  assert.equal(created.body.product.price, 1234.5);
  assert.equal((await guest('GET', `/api/products/${createdProductId}`)).status, 200);
  assert.ok((await guest('GET', '/api/products')).body.products.some((p) => p.id === createdProductId));

  const updated = await admin('PUT', `/api/admin/products/${createdProductId}`, { ...draft, name: 'API Test Package v2', price: 999 });
  assert.equal(updated.status, 200);
  const seen = (await guest('GET', `/api/products/${createdProductId}`)).body.product;
  assert.equal(seen.name, 'API Test Package v2');
  assert.equal(seen.price, 999);

  // Hidden packages leave the catalogue but stay in the admin list.
  await admin('PUT', `/api/admin/products/${createdProductId}`, { ...draft, isActive: false });
  assert.equal((await guest('GET', `/api/products/${createdProductId}`)).status, 404);
  assert.ok((await admin('GET', '/api/admin/products')).body.products.some((p) => p.id === createdProductId));
  await admin('PUT', `/api/admin/products/${createdProductId}`, draft);

  // A package that was ordered can still be deleted; the order keeps its copy.
  await customer('POST', '/api/cart/items', { productId: createdProductId, quantity: 2 });
  const order = (await customer('POST', '/api/orders', { companyName: 'Test Ltd', contactPhone: '021 555 0199' })).body.order;
  await customer('POST', '/api/cart/items', { productId: createdProductId });

  assert.equal((await admin('DELETE', `/api/admin/products/${createdProductId}`)).status, 204);
  assert.equal((await guest('GET', `/api/products/${createdProductId}`)).status, 404);
  assert.ok(!(await guest('GET', '/api/products')).body.products.some((p) => p.id === createdProductId));
  assert.equal((await admin('DELETE', `/api/admin/products/${createdProductId}`)).status, 404);
  assert.equal((await admin('PUT', `/api/admin/products/${createdProductId}`, draft)).status, 404);

  const kept = (await customer('GET', `/api/orders/${order.id}`)).body.order;
  assert.equal(kept.items.find((i) => i.name === 'API Test Package').productId, null);
  // The deleted package also left the customer's cart (it held product 9 and this one).
  assert.ok(!(await customer('GET', '/api/cart')).body.cart.items.some((i) => i.productId === createdProductId));
  createdProductId = undefined;

  // A3: admin changes are audited.
  const adminEvents = await auditEvents("event LIKE 'admin_product_%' AND user_id = 1", []);
  assert.deepEqual(
    adminEvents.map((r) => r.event),
    ['admin_product_created', 'admin_product_updated', 'admin_product_updated', 'admin_product_updated', 'admin_product_deleted'],
  );

  assert.equal((await admin('POST', '/api/auth/logout')).status, 200);
  assert.equal((await admin('GET', '/api/admin/products')).status, 401);
});

test('rate limit: too many failed logins from one IP give 429; other IPs are not affected', async () => {
  const attacker = client();
  const guess = { email: 'nobody@apitest.example', password: 'WrongPass1' };
  const statuses = [];
  for (let i = 0; i <= config.authRateLimit; i++) {
    statuses.push((await attacker('POST', '/api/auth/login', guess)).status);
  }
  assert.deepEqual(statuses, [...Array(config.authRateLimit).fill(401), 429]);
  const blocked = await attacker('POST', '/api/auth/login', guess);
  assert.equal(blocked.status, 429);
  assert.ok(blocked.headers.get('ratelimit'), 'standard RateLimit header is sent');

  assert.equal((await client()('POST', '/api/auth/login', guess)).status, 401);
  // One audit row per blocked client, not one per blocked request.
  assert.equal((await auditEvents("event = 'rate_limited'", [])).length, 1);
});

test('lock-out: 5 wrong passwords lock the account for 15 minutes, even for the right password', async () => {
  const c = client();
  assert.equal((await c('POST', '/api/auth/register', { fullName: 'Lock Test', email: lockEmail, password, confirmPassword: password })).status, 201);
  await c('POST', '/api/auth/logout');

  const statuses = [];
  for (let i = 0; i < config.lockoutThreshold; i++) {
    statuses.push((await c('POST', '/api/auth/login', { email: lockEmail, password: 'WrongPass1' })).status);
  }
  assert.deepEqual(statuses, [...Array(config.lockoutThreshold - 1).fill(401), 423]);
  const right = await c('POST', '/api/auth/login', { email: lockEmail, password });
  assert.equal(right.status, 423);
  assert.match(right.body.error, /locked/);

  const { rows } = await pool.query(
    'SELECT id, failed_logins, extract(epoch FROM locked_until - now()) / 60 AS minutes FROM users WHERE email = $1',
    [lockEmail],
  );
  assert.ok(rows[0].minutes > config.lockoutMinutes - 1 && rows[0].minutes <= config.lockoutMinutes);
  assert.deepEqual(
    (await auditEvents('user_id = $2', [rows[0].id])).map((r) => `${r.event}:${r.details.reason ?? ''}`),
    [
      'register:', 'logout:',
      ...Array(config.lockoutThreshold).fill('login_failed:wrong_password'),
      'account_locked:', 'login_failed:account_locked',
    ],
  );

  // When the lock has ended, the right password works again and the counter is reset.
  await pool.query("UPDATE users SET locked_until = now() - interval '1 second' WHERE id = $1", [rows[0].id]);
  assert.equal((await c('POST', '/api/auth/login', { email: lockEmail, password })).status, 200);
  const after = (await pool.query('SELECT failed_logins, locked_until FROM users WHERE id = $1', [rows[0].id])).rows[0];
  assert.deepEqual(after, { failed_logins: 0, locked_until: null });
});

test('malformed JSON gives 400, not a server error', async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{oops',
  });
  assert.equal(res.status, 400);
});
