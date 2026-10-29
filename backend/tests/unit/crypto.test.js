const {
  encryptSecret,
  decryptSecret,
  hashSecret,
  verifySecret,
  maskKeyId,
} = require('../../src/common/utils/crypto');

describe('Crypto Utility Unit Tests', () => {
  const sampleSecret = 'rzp_live_secret_key_very_confidential_12345';

  test('should encrypt and decrypt plaintext accurately using AES-256-GCM', () => {
    const encrypted = encryptSecret(sampleSecret);

    expect(encrypted).toHaveProperty('ciphertext');
    expect(encrypted).toHaveProperty('iv');
    expect(encrypted).toHaveProperty('authTag');
    expect(encrypted.ciphertext).not.toBe(sampleSecret);

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(sampleSecret);
  });

  test('should fail decryption if authTag is tampered with', () => {
    const encrypted = encryptSecret(sampleSecret);
    // Tamper with the authTag
    const tampered = {
      ...encrypted,
      authTag: '00000000000000000000000000000000',
    };

    expect(() => decryptSecret(tampered)).toThrow();
  });

  test('should correctly hash and verify application secrets with pepper', () => {
    const appSecret = 'sec_super_secret_app_token_9876';
    const pepper = 'test_pepper_key';

    const hash = hashSecret(appSecret, pepper);
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');

    // Positive verification
    const isValid = verifySecret(appSecret, hash, pepper);
    expect(isValid).toBe(true);

    // Negative verification
    const isInvalid = verifySecret('sec_wrong_token', hash, pepper);
    expect(isInvalid).toBe(false);
  });

  test('should properly mask keyId for display', () => {
    const keyId = 'rzp_test_1234567890abcdef';
    const masked = maskKeyId(keyId);

    expect(masked).toBe('rzp_test_****cdef');
    expect(masked).not.toContain('1234567890ab');
  });
});

