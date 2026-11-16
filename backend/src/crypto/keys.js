// Data-encryption keys for fieldCrypto.js (A3).
// DATA_KEY_V1, DATA_KEY_V2, ... = base64 of 32 random bytes (AES-256).
//   Azure: App Service setting filled by a Key Vault reference.
//   AWS:   Elastic Beanstalk environment secret from Secrets Manager.
//   Local: backend/.env (a separate development key).
// Key values are never logged; only their ids (k1, k2, ...) are.
require('../env');

const KEY_BYTES = 32;
let keys = null;
let currentId = null;

function loadKeys(env = process.env) {
  const found = new Map();
  for (const [name, value] of Object.entries(env)) {
    const match = /^DATA_KEY_V(\d+)$/.exec(name);
    if (!match || !value) continue;
    const key = Buffer.from(value.trim(), 'base64');
    if (key.length !== KEY_BYTES) {
      throw new Error(`${name} must be ${KEY_BYTES} bytes encoded as base64 (it has ${key.length} bytes)`);
    }
    found.set(`k${match[1]}`, key);
  }
  if (found.size === 0) {
    throw new Error('DATA_KEY_V1 must be set (base64 of 32 random bytes)');
  }
  // The newest key encrypts new values; older keys stay so old values can still be decrypted.
  const ids = [...found.keys()].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  keys = found;
  currentId = ids[ids.length - 1];
  return { keyIds: ids, currentId };
}

function getKey(keyId) {
  if (!keys) loadKeys();
  return keys.get(keyId);
}

function currentKeyId() {
  if (!keys) loadKeys();
  return currentId;
}

module.exports = { loadKeys, getKey, currentKeyId, KEY_BYTES };
