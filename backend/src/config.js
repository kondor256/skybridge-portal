// All settings come from environment variables; nothing is hard-coded for a
// particular cloud. See .env.example for the list.
require('./env');
const os = require('node:os');

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be set in production');
}

// A3: the data-encryption key is checked at start-up, so a missing or wrong key
// stops the app at once instead of failing on the first order.
const { loadKeys } = require('./crypto/keys');
const dataKeys = loadKeys();

module.exports = {
  isProduction,
  port: Number(process.env.PORT) || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'dev-only-secret',
  sessionStore: process.env.SESSION_STORE || 'pg',
  platform: process.env.CLOUD_PLATFORM || 'local',
  // Azure App Service gives every instance an id; elsewhere the host name is unique per instance.
  instanceId: (process.env.WEBSITE_INSTANCE_ID || os.hostname()).slice(0, 12),
  gstRate: 0.15,
  dataKeyIds: dataKeys.keyIds,
  // A3: proxies in front of the app: local 0, Azure App Service 1, AWS CloudFront + load balancer 2
  trustProxyHops: Number(process.env.TRUST_PROXY_HOPS) || 0,
  // A3 (AWS): take the visitor's protocol from CloudFront-Forwarded-Proto (CH-36)
  trustCloudFrontProto: process.env.TRUST_CLOUDFRONT_PROTO === 'true',
  // A3: login protection (middleware/rateLimit.js, routes/auth.js)
  lockoutThreshold: Number(process.env.LOCKOUT_THRESHOLD) || 5,
  lockoutMinutes: Number(process.env.LOCKOUT_MINUTES) || 15,
  authRateLimit: Number(process.env.AUTH_RATE_LIMIT) || 10,
  authRateWindowMinutes: Number(process.env.AUTH_RATE_WINDOW_MINUTES) || 15,
};
