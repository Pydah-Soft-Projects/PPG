const crypto = require('crypto');
const config = require('../config');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Validates master encryption key and returns Buffer
 */
function getMasterKey() {
  const keyHex = config.PROVIDER_SECRET_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('PROVIDER_SECRET_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypts plaintext string using AES-256-GCM
 * @param {string} plainText
 * @returns {{ encryptedData: string, iv: string, authTag: string, version: number }}
 */
function encryptSecret(plainText) {
  if (!plainText) {
    return null;
  }
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    version: 1,
  };
}

/**
 * Decrypts secret payload using AES-256-GCM
 * @param {{ encryptedData: string, iv: string, authTag: string, version?: number }} secretPayload
 * @returns {string} plainText
 */
function decryptSecret(secretPayload) {
  if (!secretPayload || !secretPayload.encryptedData || !secretPayload.iv || !secretPayload.authTag) {
    return null;
  }
  const key = getMasterKey();
  const iv = Buffer.from(secretPayload.iv, 'hex');
  const authTag = Buffer.from(secretPayload.authTag, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(secretPayload.encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Hashes an application secret with a pepper using HMAC-SHA256
 * @param {string} plainSecret
 * @returns {string} hex hash
 */
function hashAppSecret(plainSecret) {
  if (!plainSecret) {
    throw new Error('Secret is required for hashing');
  }
  return crypto
    .createHmac('sha256', config.APP_CREDENTIAL_PEPPER)
    .update(plainSecret)
    .digest('hex');
}

/**
 * Timing-safe string comparison to prevent timing attacks
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Masks a Key ID or identifier for display (e.g., rzp_test_12345678 -> rzp_test_...5678)
 * @param {string} str
 * @returns {string}
 */
function maskIdentifier(str) {
  if (!str || typeof str !== 'string') return '';
  if (str.length <= 8) return '****';
  const prefix = str.slice(0, 8);
  const suffix = str.slice(-4);
  return `${prefix}...${suffix}`;
}

module.exports = {
  encryptSecret,
  decryptSecret,
  hashAppSecret,
  safeCompare,
  maskIdentifier,
};

