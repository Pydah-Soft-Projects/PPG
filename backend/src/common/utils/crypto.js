const crypto = require('crypto');
const env = require('../../config/env');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes recommended for GCM

/**
 * Derives a 32-byte Buffer from the given encryption key string
 * @param {string} [keyString]
 * @returns {Buffer}
 */
function getKeyBuffer(keyString = env.PROVIDER_SECRET_ENCRYPTION_KEY) {
  if (keyString && keyString.length === 64) {
    return Buffer.from(keyString, 'hex');
  }
  // Otherwise SHA-256 hash it to guarantee exactly 32 bytes
  return crypto.createHash('sha256').update(String(keyString)).digest();
}

/**
 * Encrypts a string using AES-256-GCM
 * @param {string} plaintext
 * @param {string} [key]
 * @returns {{ ciphertext: string, iv: string, authTag: string, keyVersion: number }}
 */
function encryptSecret(plaintext, key = env.PROVIDER_SECRET_ENCRYPTION_KEY) {
  if (!plaintext) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKeyBuffer(key), iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return {
    ciphertext,
    iv: iv.toString('hex'),
    authTag,
    keyVersion: 1,
  };
}

/**
 * Decrypts an encrypted payload using AES-256-GCM
 * @param {{ ciphertext: string, iv: string, authTag: string }} payload
 * @param {string} [key]
 * @returns {string}
 */
function decryptSecret(payload, key = env.PROVIDER_SECRET_ENCRYPTION_KEY) {
  if (!payload || !payload.ciphertext || !payload.iv || !payload.authTag) {
    return null;
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKeyBuffer(key),
    Buffer.from(payload.iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(payload.authTag, 'hex'));

  let decrypted = decipher.update(payload.ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Hash an application secret with a pepper
 * @param {string} secret
 * @param {string} [pepper]
 * @returns {string}
 */
function hashSecret(secret, pepper = env.APP_CREDENTIAL_PEPPER) {
  return crypto.createHmac('sha256', pepper).update(secret).digest('hex');
}

/**
 * Timing-safe string/buffer comparison
 * @param {string|Buffer} a
 * @param {string|Buffer} b
 * @returns {boolean}
 */
function timingSafeCompare(a, b) {
  if (!a || !b) return false;
  const bufA = Buffer.isBuffer(a) ? a : Buffer.from(String(a));
  const bufB = Buffer.isBuffer(b) ? b : Buffer.from(String(b));

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verifies if a given secret matches the stored hash
 * @param {string} secret
 * @param {string} hash
 * @param {string} [pepper]
 * @returns {boolean}
 */
function verifySecret(secret, hash, pepper = env.APP_CREDENTIAL_PEPPER) {
  const computedHash = hashSecret(secret, pepper);
  return timingSafeCompare(computedHash, hash);
}

/**
 * Generates an HMAC SHA-256 signature
 * @param {string|Buffer} data
 * @param {string} secret
 * @returns {string}
 */
function generateHmacSignature(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Masks a key for secure display (e.g. rzp_test_12345678 -> rzp_test_****5678)
 * @param {string} keyId
 * @returns {string}
 */
function maskKeyId(keyId) {
  if (!keyId || typeof keyId !== 'string') return '';
  if (keyId.length <= 8) return '****';
  const prefix = keyId.substring(0, 9);
  const suffix = keyId.substring(keyId.length - 4);
  return `${prefix}****${suffix}`;
}

module.exports = {
  encryptSecret,
  decryptSecret,
  hashSecret,
  verifySecret,
  timingSafeCompare,
  generateHmacSignature,
  maskKeyId,
};

