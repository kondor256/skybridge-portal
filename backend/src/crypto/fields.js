// Decrypts the sensitive fields of one database row before it is sent to the browser (A3).
// A field that fails the GCM tag check (changed in the database, or a wrong key) is
// returned as null and listed in row.unavailableFields, and a decrypt_failed audit row
// is written; the request itself still succeeds. Values saved before the migration
// (legacy plain text) are returned as they are, with a warning in the log.
const { decrypt, isEncrypted, DecryptionError } = require('./fieldCrypto');
const { audit } = require('../audit');

async function decryptRow(row, fields, { req, table }) {
  if (!row) return row;
  const unavailable = [];
  for (const field of fields) {
    const stored = row[field];
    if (stored && !isEncrypted(stored)) {
      console.warn(`Legacy plain text in ${table}.${field} (id ${row.id}): run scripts/encrypt-existing.js`);
      continue;
    }
    try {
      row[field] = decrypt(stored);
    } catch (err) {
      if (!(err instanceof DecryptionError)) throw err;
      row[field] = null;
      unavailable.push(field);
      await audit('decrypt_failed', { req, details: { table, id: row.id, field, reason: err.reason } });
    }
  }
  if (unavailable.length > 0) row.unavailableFields = unavailable;
  return row;
}

module.exports = { decryptRow };
