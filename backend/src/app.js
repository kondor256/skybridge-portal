const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);

const config = require('./config');
const { pool } = require('./db');
const { apiNotFound, errorHandler } = require('./middleware/error');
const authRoutes = require('./routes/auth');
const products = require('./routes/products');

const publicDir = path.resolve(__dirname, '../public');
const indexFile = path.join(publicDir, 'index.html');

const app = express();

// A3: number of proxies in front of the app (TRUST_PROXY_HOPS): Azure App Service 1,
// AWS CloudFront + load balancer 2, local 0. With the right number, req.ip is the
// visitor's address (rate limit, audit log) and req.secure is true for HTTPS (CH-38).
// Too high lets a client fake its IP with X-Forwarded-For; too low makes every
// visitor look like the proxy and share one rate limit.
app.set('trust proxy', config.trustProxyHops);
app.disable('x-powered-by');

// A3 (AWS): CloudFront talks to the load balancer over HTTP, so the load balancer sets
// X-Forwarded-Proto: http even when the visitor used HTTPS. CloudFront adds
// CloudFront-Forwarded-Proto with the visitor's protocol; use it, so Express sees
// HTTPS and sends the Secure session cookie (CH-36).
if (config.trustCloudFrontProto) {
  app.use((req, res, next) => {
    if (req.get('cloudfront-forwarded-proto') === 'https') {
      req.headers['x-forwarded-proto'] = 'https';
    }
    next();
  });
}

// A3: in production both clouds serve the site over HTTPS only (Azure "HTTPS Only",
// CloudFront "Redirect HTTP to HTTPS"), so HSTS and upgrade-insecure-requests are on.
// Locally (http://localhost) they stay off.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        'img-src': ["'self'", 'data:', 'https:'],
        'upgrade-insecure-requests': config.isProduction ? [] : null,
      },
    },
    // Browsers use only HTTPS for this site for one year after the first visit.
    strictTransportSecurity: config.isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
    // Ignored on HTTP origins and only add browser console messages there.
    crossOriginOpenerPolicy: config.isProduction,
    originAgentCluster: config.isProduction,
  }),
);

// ---- API -------------------------------------------------------------------
const api = express.Router();

// Catalogue data must never come from a cache: admin changes show immediately.
api.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Before the session middleware: health checks do not need a session.
api.use('/health', require('./routes/health'));

api.use(express.json({ limit: '100kb' }));
api.use(
  session({
    name: authRoutes.COOKIE_NAME,
    secret: config.sessionSecret,
    // Sessions live in PostgreSQL, so any instance behind the load balancer can read them.
    store: config.sessionStore === 'memory' ? undefined : new PgSession({ pool, tableName: 'session' }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      // A3: production sends the cookie only over HTTPS (Secure flag). Behind a proxy this
      // needs the right TRUST_PROXY_HOPS, otherwise no cookie is set at all (CH-36).
      secure: config.isProduction ? true : 'auto',
      maxAge: 8 * 60 * 60 * 1000,
    },
  }),
);

api.use('/auth', authRoutes);
api.use('/categories', products.categories);
api.use('/products', products.catalogue);
api.use('/admin/products', products.admin);
api.use('/cart', require('./routes/cart'));
api.use('/orders', require('./routes/orders'));
api.use(apiNotFound);

app.use('/api', api);

// ---- Front end (Vue build copied to backend/public) ------------------------
app.use(
  express.static(publicDir, {
    index: false,
    setHeaders(res, filePath) {
      // File names under /assets contain a content hash, so they can be cached for a long time.
      const longLived = filePath.includes(`${path.sep}assets${path.sep}`);
      res.set('Cache-Control', longLived ? 'public, max-age=31536000, immutable' : 'public, max-age=300');
    },
  }),
);

// Every other GET is a front-end route (e.g. /cart): the Vue router handles it.
app.get('/{*path}', (req, res) => {
  if (!fs.existsSync(indexFile)) {
    return res
      .status(200)
      .type('text')
      .send('SkyBridge Services Portal API is running. Build the front end (npm run build in frontend/) to see the site.');
  }
  res.set('Cache-Control', 'no-cache');
  res.sendFile(indexFile);
});

app.use(errorHandler);

module.exports = app;
