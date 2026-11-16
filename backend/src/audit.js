// Security audit log (A3). One row per event in the audit_log table:
//   register, login_success, login_failed, account_locked, logout,
//   admin_product_created, admin_product_updated, admin_product_deleted, decrypt_failed
// Never put passwords, keys or decrypted field values into details.
const { pool } = require('./db');
const { clientIp } = require('./clientIp');

async function audit(event, { req, userId, email = null, details = {} } = {}) {
  const user = userId !== undefined ? userId : (req?.session?.userId ?? null);
  try {
    await pool.query('INSERT INTO audit_log (event, user_id, email, ip, details) VALUES ($1, $2, $3, $4, $5)', [
      event,
      user,
      email,
      req ? clientIp(req) : null,
      details,
    ]);
  } catch (err) {
    // A failed audit write is logged, but it does not break the user's request.
    console.error(`Audit write failed (${event}): ${err.message}`);
  }
}

module.exports = { audit };
