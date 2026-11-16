const app = require('./app');
const config = require('./config');
const { pool } = require('./db');

const server = app.listen(config.port, () => {
  console.log(`SkyBridge Services Portal listening on port ${config.port} (${config.platform}, instance ${config.instanceId}, data keys ${config.dataKeyIds.join(',')})`);
});

// When the platform scales in or restarts an instance it sends SIGTERM:
// finish the open requests, close the database connections, then exit.
function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
