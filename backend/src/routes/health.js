const express = require('express');
const { pool } = require('../db');
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

router.get('/db', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT current_database() AS database, version() AS version');
    res.json({ status: 'ok', database: rows[0].database, version: rows[0].version.split(' on ')[0] });
  } catch (err) {
    console.error('Database health check failed:', err.message);
    res.status(503).json({ status: 'error', error: 'The database is not reachable.' });
  }
});

module.exports = router;
