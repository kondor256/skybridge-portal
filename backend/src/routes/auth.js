const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { HttpError } = require('../middleware/error');
const { validateRegistration, validateLogin } = require('../middleware/validate');
const { adoptGuestCart } = require('../cart');

const router = express.Router();

const USER_COLUMNS = 'id, full_name AS "fullName", email, phone, role';
// Compared when the email is unknown, so both failure cases take the same time.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);
const COOKIE_NAME = 'skybridge.sid';

// Starts a fresh session for the user (new session id = no session fixation)
// and moves a guest cart into the user's cart.
async function startSession(req, user) {
  const guestCartId = req.session.cartId;
  await new Promise((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
  req.session.userId = user.id;
  req.session.role = user.role;
  if (user.role === 'customer') {
    await adoptGuestCart(user.id, guestCartId);
  }
}

router.post('/register', async (req, res) => {
  const { fullName, email, phone, password } = validateRegistration(req.body);
  const passwordHash = await bcrypt.hash(password, 10);

  let user;
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, 'customer')
       RETURNING ${USER_COLUMNS}`,
      [fullName, email, phone, passwordHash],
    );
    user = rows[0];
  } catch (err) {
    if (err.code === '23505') {
      throw new HttpError(409, 'Please correct the highlighted fields.', {
        email: 'An account with this email address already exists.',
      });
    }
    throw err;
  }

  await startSession(req, user);
  res.status(201).json({ user });
});

// body.portal = 'admin' is sent by the admin login page: only administrators may pass.
router.post('/login', async (req, res) => {
  const { email, password } = validateLogin(req.body);
  const { rows } = await pool.query(`SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = $1`, [email]);
  const found = rows[0];

  const passwordOk = await bcrypt.compare(password, found ? found.password_hash : DUMMY_HASH);
  if (!found || !passwordOk) {
    throw new HttpError(401, 'The email address or password is incorrect.');
  }
  if (req.body.portal === 'admin' && found.role !== 'admin') {
    throw new HttpError(403, 'This account does not have administrator access.');
  }

  const { password_hash: _hash, ...user } = found;
  await startSession(req, user);
  res.json({ user });
});

router.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie(COOKIE_NAME);
    res.json({ user: null });
  });
});

router.get('/me', async (req, res) => {
  if (!req.session.userId) {
    return res.json({ user: null });
  }
  const { rows } = await pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [req.session.userId]);
  res.json({ user: rows[0] ?? null });
});

module.exports = router;
module.exports.COOKIE_NAME = COOKIE_NAME;
