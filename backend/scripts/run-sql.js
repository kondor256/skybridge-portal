// Runs the SQL scripts against the database named in the PG* environment
// variables. Use it when psql is not installed:
//   node --env-file=.env scripts/run-sql.js            (DDL + DML: all data replaced)
//   node --env-file=.env scripts/run-sql.js schema     (SQL-Script-DDL.txt only)
//   node --env-file=.env scripts/run-sql.js data       (SQL-Script-DML.txt only)
//   node --env-file=.env scripts/run-sql.js upgrade    (A1 database -> A3 schema, keeps the data)
const fs = require('node:fs');
const path = require('node:path');
const { pool } = require('../src/db');

const sqlDir = process.env.SQL_DIR || path.resolve(__dirname, '../../sql');
const scripts = {
  schema: 'SQL-Script-DDL.txt',
  data: 'SQL-Script-DML.txt',
  upgrade: '03_a3_upgrade_existing.sql',
};

async function main() {
  const which = process.argv[2];
  const names = which ? [scripts[which]] : [scripts.schema, scripts.data];
  if (names.includes(undefined)) {
    throw new Error(`Unknown script "${which}". Use "schema", "data" or "upgrade".`);
  }

  console.log(`Database: ${process.env.PGUSER}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE}`);
  for (const name of names) {
    const sql = fs.readFileSync(path.join(sqlDir, name), 'utf8');
    await pool.query(sql);
    console.log(`OK  ${name}`);
  }

  const tables = ['users', 'categories', 'products', 'carts', 'cart_items', 'orders', 'order_items', 'audit_log'];
  for (const table of tables) {
    const { rows } = await pool.query(`SELECT count(*)::int AS n FROM ${table}`);
    console.log(`${table.padEnd(12)} ${rows[0].n} rows`);
  }
}

main()
  .catch((err) => {
    console.error(`FAILED: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
