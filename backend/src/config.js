// All settings come from environment variables; nothing is hard-coded for a
// particular cloud. See .env.example for the list.
require('./env');
const os = require('node:os');

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be set in production');
}

module.exports = {
  isProduction,
  port: Number(process.env.PORT) || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'dev-only-secret',
  sessionStore: process.env.SESSION_STORE || 'pg',
  platform: process.env.CLOUD_PLATFORM || 'local',
  // Azure App Service gives every instance an id; elsewhere the host name is unique per instance.
  instanceId: (process.env.WEBSITE_INSTANCE_ID || os.hostname()).slice(0, 12),
  gstRate: 0.15,
};
