// PostgreSQL connection pool. Host, port, database, user and password are read
// by the pg library from PGHOST, PGPORT, PGDATABASE, PGUSER and PGPASSWORD.
require('./env');
const fs = require('node:fs');
const path = require('node:path');
const { Pool, types } = require('pg');

// NUMERIC columns arrive as strings by default; prices fit safely in a JS number.
types.setTypeParser(types.builtins.NUMERIC, (value) => Number(value));

const sslMode = (process.env.PGSSLMODE || 'disable').toLowerCase();

// PGSSLMODE follows the libpq meaning:
//   disable      no TLS (local development)
//   require      TLS, but the server certificate is not checked (A1; open to a man-in-the-middle)
//   verify-ca    TLS, the certificate must chain to a CA in PGSSLROOTCERT
//   verify-full  as verify-ca, and the certificate must also match the host name (A3 default in the cloud)
// A3: PGSSLROOTCERT is the CA bundle shipped in certs/ (a path relative to backend/ or absolute):
//   Azure: certs/azure-postgres-roots.pem (DigiCert Global Root G2, Microsoft RSA Root CA 2017, DigiCert Global Root CA)
//   AWS:   certs/rds-global-bundle.pem (Amazon RDS global trust bundle)
// Only these CAs are trusted for the database, not every CA in Node's default list.
function sslConfig() {
  if (sslMode === 'disable') return false;
  if (sslMode === 'verify-full' || sslMode === 'verify-ca') {
    const file = process.env.PGSSLROOTCERT ? path.resolve(__dirname, '..', process.env.PGSSLROOTCERT) : null;
    if (file && !fs.existsSync(file)) {
      throw new Error(`PGSSLROOTCERT file not found: ${file}`);
    }
    return {
      rejectUnauthorized: true,
      ca: file ? fs.readFileSync(file, 'utf8') : undefined,
      // verify-ca checks the chain only; verify-full keeps Node's host name check.
      ...(sslMode === 'verify-ca' && { checkServerIdentity: () => undefined }),
    };
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

module.exports = { pool, withTransaction, sslMode };
