// Rate limit for the login and registration routes (A3).
// Each client IP may make AUTH_RATE_LIMIT failed requests (status 400 or higher)
// in AUTH_RATE_WINDOW_MINUTES; after that it gets HTTP 429 until the window ends.
// Successful logins do not count, so staff of one client company behind a single
// public IP do not block each other.
// req.ip must be the real client address, so 'trust proxy' must match the number
// of proxies in front of the app (TRUST_PROXY_HOPS, see app.js and CH-38).
// Counters are kept in memory on each instance: with 2 instances an attacker gets
// at most twice the limit; the per-account lock-out in routes/auth.js is in the database.
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const config = require('../config');
const { audit } = require('../audit');
const { clientIp } = require('../clientIp');

const authLimiter = rateLimit({
  windowMs: config.authRateWindowMinutes * 60 * 1000,
  limit: config.authRateLimit,
  // Key = client IP without the port Azure adds (IPv6 grouped per /56 network).
  keyGenerator: (req) => ipKeyGenerator(clientIp(req)),
  // The IP check would warn about that port; clientIp() already removes it.
  validate: { ip: false },
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  async handler(req, res, next, options) {
    // One audit row per client and window (the first blocked request), not one per request.
    if (req.rateLimit.used === req.rateLimit.limit + 1) {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase().slice(0, 254) : null;
      await audit('rate_limited', { req, email, details: { path: req.originalUrl } });
    }
    res.status(options.statusCode).json({
      error: `Too many failed attempts. Please wait ${config.authRateWindowMinutes} minutes and try again.`,
    });
  },
});

module.exports = { authLimiter };
