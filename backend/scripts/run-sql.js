// Runs the two SQL scripts against the database named in the PG* environment
// variables. Use it when psql is not installed:
//   node --env-file=.env scripts/run-sql.js            (both scripts)
//   node --env-file=.env scripts/run-sql.js schema     (01 only)
//   node --env-file=.env scripts/run-sql.js data       (02 only)
const fs = require('node:fs');
const path = require('node:path');
const { pool } = require('../src/db');

const sqlDir = process.env.SQL_DIR || path.resolve(__dirname, '../../../sql');
const scripts = {
  schema: '01_create_schema.sql',
  data: '02_insert_sample_data.sql',
};

async function main() {
  const which = process.argv[2];
  const names = which ? [scripts[which]] : Object.values(scripts);
  if (names.includes(undefined)) {
    throw new Error(`Unknown script "${which}". Use "schema" or "data".`);
  }

  console.log(`Database: ${process.env.PGUSER}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE}`);
  for (const name of names) {
    const sql = fs.readFileSync(path.join(sqlDir, name), 'utf8');
    await pool.query(sql);
    console.log(`OK  ${name}`);
  }

  const tables = ['users', 'categories', 'products', 'carts', 'cart_items', 'orders', 'order_items'];
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
