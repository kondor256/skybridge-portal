// PostgreSQL connection pool. Host, port, database, user and password are read
// by the pg library from PGHOST, PGPORT, PGDATABASE, PGUSER and PGPASSWORD.
require('./env');
const fs = require('node:fs');
const { Pool, types } = require('pg');

// NUMERIC columns arrive as strings by default; prices fit safely in a JS number.
types.setTypeParser(types.builtins.NUMERIC, (value) => Number(value));

// PGSSLMODE follows the libpq meaning:
//   disable      no TLS (local development)
//   require      TLS, server certificate not checked (works on Azure and RDS without extra files)
//   verify-full  TLS and the certificate is checked; PGSSLROOTCERT may point to a CA bundle
function sslConfig() {
  const mode = (process.env.PGSSLMODE || 'disable').toLowerCase();
  if (mode === 'disable') return false;
  if (mode === 'verify-full' || mode === 'verify-ca') {
    const ca = process.env.PGSSLROOTCERT ? fs.readFileSync(process.env.PGSSLROOTCERT, 'utf8') : undefined;
    return { rejectUnauthorized: true, ca };
  }
  return { rejectUnauthorized: false };
}

const pool = new Pool({
  ssl: sslConfig(),
  max: Number(process.env.PGPOOL_MAX) || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// An idle client can be dropped by the server or the network; log it, keep running.
pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message);
});

// Runs fn inside one transaction and returns its result.
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, withTransaction };
