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

// Both clouds put a reverse proxy / load balancer in front of the app. Trusting
// it lets Express see the original protocol (https on Azure, http on the
// default Elastic Beanstalk URL) and the visitor's IP address.
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        'img-src': ["'self'", 'data:', 'https:'],
        // The default Elastic Beanstalk URL is plain HTTP; this directive would
        // make the browser request every script and style over HTTPS and fail.
        'upgrade-insecure-requests': null,
      },
    },
    // These two headers are ignored on HTTP origins and only add browser console messages there.
    crossOriginOpenerPolicy: false,
    originAgentCluster: false,
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
      secure: 'auto', // Secure flag on HTTPS requests only
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
