// AES-256-GCM encryption for sensitive database fields (A3).
// Stored format: v1:<keyId>:<iv base64>:<tag base64>:<ciphertext base64>
//   v1     format version
//   keyId  which key encrypted the value (k1, k2, ...), so keys can be rotated
//   iv     12 random bytes, new for every value
//   tag    16-byte GCM authentication tag: any change to the value is detected
const crypto = require('node:crypto');
const { getKey, currentKeyId } = require('./keys');

const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;

// Thrown when a stored value cannot be decrypted (changed, wrong key, bad format).
// Callers show the field as unavailable and write an audit row.
class DecryptionError extends Error {
  constructor(reason) {
    super(`Encrypted field could not be decrypted: ${reason}`);
    this.name = 'DecryptionError';
    this.reason = reason;
  }
}

function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(`${VERSION}:`);
}

function encrypt(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === '') return plaintext;
  const keyId = currentKeyId();
  const iv = crypto.randomBytes(IV_BYTES); // never reuse an IV with the same key
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(keyId), iv, { authTagLength: TAG_BYTES });
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, keyId, iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join(':');
}

function decrypt(stored) {
  // Empty values and legacy plain text (saved before the migration) are returned as they are.
  if (!isEncrypted(stored)) return stored;

  const parts = stored.split(':');
  if (parts.length !== 5) throw new DecryptionError('unexpected format');
  const [, keyId, ivB64, tagB64, ctB64] = parts;
  const key = getKey(keyId);
  if (!key) throw new DecryptionError(`unknown key id ${keyId}`);
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) throw new DecryptionError('unexpected format');

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
    decipher.setAuthTag(tag);
    // final() throws if the tag does not match: the value was changed or the key is wrong.
    return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    throw new DecryptionError('authentication tag check failed');
  }
}

module.exports = { encrypt, decrypt, isEncrypted, DecryptionError };
