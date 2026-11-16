const express = require('express');
const { pool, sslMode } = require('../db');
const config = require('../config');

const router = express.Router();

// No database call: safe as a load balancer health check and shows which
// instance answered (useful when the app is scaled out).
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    platform: config.platform,
    instance: config.instanceId,
    uptimeSeconds: Math.round(process.uptime()),
    time: new Date().toISOString(),
  });
});

// A3: also shows how this connection is protected (evidence D12): the TLS protocol
// from pg_stat_ssl, and whether the server certificate was checked (sslMode).
router.get('/db', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT current_database() AS database, version() AS version, s.ssl, s.version AS protocol, s.cipher
       FROM pg_stat_ssl s WHERE s.pid = pg_backend_pid()`,
    );
    const db = rows[0];
    res.json({
      status: 'ok',
      database: db.database,
      version: db.version.split(' on ')[0],
      tls: {
        sslMode,
        encrypted: db.ssl,
        protocol: db.protocol,
        cipher: db.cipher,
        serverCertificateVerified: db.ssl && (sslMode === 'verify-full' || sslMode === 'verify-ca'),
      },
    });
  } catch (err) {
    console.error('Database health check failed:', err.message);
    res.status(503).json({ status: 'error', error: 'The database is not reachable.' });
  }
});

module.exports = router;
