// A3 migration: encrypts sensitive values that were saved as plain text before
// field encryption existed (A1 data, or rows inserted by SQL-Script-DML.txt).
// Safe to run more than once: values that already start with "v1:" are skipped.
//   node scripts/encrypt-existing.js             encrypt and print the counts
//   node scripts/encrypt-existing.js --dry-run   only print what would change
// Uses the PG* variables and DATA_KEY_V1 (backend/.env locally, app settings in the cloud).
const { pool, withTransaction } = require('../src/db');
const { encrypt, isEncrypted } = require('../src/crypto/fieldCrypto');
const { currentKeyId } = require('../src/crypto/keys');

const TARGETS = [
  { table: 'users', columns: ['phone'] },
  { table: 'orders', columns: ['company_name', 'contact_phone', 'notes'] },
];

async function migrateTable(client, { table, columns }, dryRun) {
  const counts = Object.fromEntries(columns.map((c) => [c, { encrypted: 0, skipped: 0, empty: 0 }]));
  // FOR UPDATE: the app cannot change these rows while the migration runs.
  const { rows } = await client.query(`SELECT id, ${columns.join(', ')} FROM ${table} ORDER BY id FOR UPDATE`);

  for (const row of rows) {
    const changes = {};
    for (const column of columns) {
      const value = row[column];
      if (value === null || value === '') counts[column].empty += 1;
      else if (isEncrypted(value)) counts[column].skipped += 1;
      else {
        changes[column] = encrypt(value);
        counts[column].encrypted += 1;
      }
    }
    const names = Object.keys(changes);
    if (names.length > 0 && !dryRun) {
      const set = names.map((name, i) => `${name} = $${i + 2}`).join(', ');
      await client.query(`UPDATE ${table} SET ${set} WHERE id = $1`, [row.id, ...names.map((name) => changes[name])]);
    }
  }
  return { rows: rows.length, counts };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const db = `${process.env.PGUSER}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE}`;
  console.log(`Database: ${db} | data key ${currentKeyId()}${dryRun ? ' | DRY RUN: nothing is changed' : ''}`);

  // One transaction: either every value is encrypted or none is.
  await withTransaction(async (client) => {
    for (const target of TARGETS) {
      const { rows, counts } = await migrateTable(client, target, dryRun);
      for (const [column, c] of Object.entries(counts)) {
        console.log(
          `${`${target.table}.${column}`.padEnd(22)} ${String(rows).padStart(3)} rows: ` +
            `${c.encrypted} ${dryRun ? 'to encrypt' : 'encrypted'}, ${c.skipped} already encrypted, ${c.empty} empty`,
        );
      }
    }
  });
  console.log(dryRun ? 'Dry run finished.' : 'Done. A second run should show 0 encrypted.');
}

main()
  .catch((err) => {
    console.error(`FAILED: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
