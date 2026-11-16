// Unit tests for the AES-256-GCM field encryption (A3). No database needed:
//   npm run test:crypto
// The tests load their own random keys, so they never use the key in .env.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const { loadKeys } = require('../src/crypto/keys');
const { encrypt, decrypt, isEncrypted, DecryptionError } = require('../src/crypto/fieldCrypto');

const keyA = crypto.randomBytes(32).toString('base64');
const keyB = crypto.randomBytes(32).toString('base64');
const phone = '+64 21 555 0142';

// Changes one character in the middle of part `index` of a stored value.
function tamper(stored, index) {
  const parts = stored.split(':');
  const chars = [...parts[index]];
  const i = Math.floor(chars.length / 2);
  chars[i] = chars[i] === 'A' ? 'B' : 'A';
  parts[index] = chars.join('');
  return parts.join(':');
}

test('round trip: decrypt(encrypt(x)) returns x, also for long and non-ASCII text', () => {
  loadKeys({ DATA_KEY_V1: keyA });
  for (const value of [phone, 'Kauri Coast Logistics Ltd', 'Notes: Māori names, 50% deposit, "quotes" & <tags>'.repeat(10)]) {
    const stored = encrypt(value);
    assert.ok(isEncrypted(stored));
    assert.ok(!stored.includes(value), 'plain text must not appear in the stored value');
    assert.equal(decrypt(stored), value);
  }
});

test('stored format: v1:<keyId>:<12-byte IV>:<16-byte tag>:<ciphertext>', () => {
  loadKeys({ DATA_KEY_V1: keyA });
  const [version, keyId, iv, tag, ciphertext] = encrypt(phone).split(':');
  assert.equal(version, 'v1');
  assert.equal(keyId, 'k1');
  assert.equal(Buffer.from(iv, 'base64').length, 12);
  assert.equal(Buffer.from(tag, 'base64').length, 16);
  assert.ok(ciphertext.length > 0);
});

test('unique IV: the same input encrypted twice gives different output', () => {
  loadKeys({ DATA_KEY_V1: keyA });
  const first = encrypt(phone);
  const second = encrypt(phone);
  assert.notEqual(first, second);
  assert.notEqual(first.split(':')[2], second.split(':')[2]);
  assert.equal(decrypt(first), decrypt(second));
});

test('tamper: one changed character in the ciphertext or the tag is detected', () => {
  loadKeys({ DATA_KEY_V1: keyA });
  const stored = encrypt(phone);
  assert.throws(() => decrypt(tamper(stored, 4)), DecryptionError, 'changed ciphertext');
  assert.throws(() => decrypt(tamper(stored, 3)), DecryptionError, 'changed tag');
  assert.throws(() => decrypt(tamper(stored, 2)), DecryptionError, 'changed IV');
});

test('wrong key: a value encrypted with another key is rejected, not decrypted to garbage', () => {
  loadKeys({ DATA_KEY_V1: keyA });
  const stored = encrypt(phone);
  loadKeys({ DATA_KEY_V1: keyB });
  assert.throws(() => decrypt(stored), (err) => err instanceof DecryptionError && /tag check failed/.test(err.message));
});

test('unknown key id and broken format are rejected', () => {
  loadKeys({ DATA_KEY_V1: keyA });
  const parts = encrypt(phone).split(':');
  assert.throws(() => decrypt(['v1', 'k9', ...parts.slice(2)].join(':')), /unknown key id k9/);
  assert.throws(() => decrypt('v1:k1:only-three-parts'), /unexpected format/);
});

test('legacy plain text (saved before the migration) and empty values are returned as they are', () => {
  loadKeys({ DATA_KEY_V1: keyA });
  assert.equal(isEncrypted(phone), false);
  assert.equal(decrypt(phone), phone);
  assert.equal(decrypt(''), '');
  assert.equal(decrypt(null), null);
  assert.equal(encrypt(''), '');
  assert.equal(encrypt(null), null);
});

test('key rotation: new values use the newest key, old values still decrypt', () => {
  loadKeys({ DATA_KEY_V1: keyA });
  const old = encrypt(phone);
  const { currentId } = loadKeys({ DATA_KEY_V1: keyA, DATA_KEY_V2: keyB });
  assert.equal(currentId, 'k2');
  assert.equal(encrypt(phone).split(':')[1], 'k2');
  assert.equal(decrypt(old), phone);
});

test('key loading: a missing key or a key that is not 32 bytes stops start-up without showing the value', () => {
  assert.throws(() => loadKeys({}), /DATA_KEY_V1 must be set/);
  const short = crypto.randomBytes(16).toString('base64');
  assert.throws(
    () => loadKeys({ DATA_KEY_V1: short }),
    (err) => /must be 32 bytes/.test(err.message) && !err.message.includes(short),
  );
});
