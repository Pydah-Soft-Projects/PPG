const request = require('supertest');
const app = require('../src/app');
const cryptoUtils = require('../src/common/crypto');
const logger = require('../src/common/logger');

describe('Phase 1: Foundation & Infrastructure', () => {
  describe('Health Probes & HTTP Infrastructure', () => {
    it('GET /health returns 200 OK with status and service name', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('service', 'pydah-payment-gateway');
      expect(res.headers['x-request-id']).toBeDefined();
    });

    it('GET /unknown-route returns 404 with standardized error structure', async () => {
      const res = await request(app).get('/api/v1/non-existent-endpoint');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
      expect(res.body.error).toHaveProperty('requestId');
    });

    it('captures rawBody on JSON request for webhook signature verification', async () => {
      let capturedBuffer = null;
      app.post('/test-raw-body-capture', (req, res) => {
        capturedBuffer = req.rawBody;
        res.json({ ok: true });
      });

      const payload = { testKey: 'helloWorld', amount: 5000 };
      const rawString = JSON.stringify(payload);

      const res = await request(app)
        .post('/test-raw-body-capture')
        .set('Content-Type', 'application/json')
        .send(rawString);

      expect(res.status).toBe(200);
      expect(capturedBuffer).toBeInstanceOf(Buffer);
      expect(capturedBuffer.toString('utf8')).toBe(rawString);
    });
  });

  describe('Cryptographic Controls & Secret Encryption', () => {
    it('encrypts and decrypts provider secrets at rest using AES-256-GCM', () => {
      const secret = 'rzp_live_secret_sample_key_987654321';
      const encrypted = cryptoUtils.encryptSecret(secret);

      expect(encrypted).toHaveProperty('encryptedData');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');
      expect(encrypted.version).toBe(1);
      expect(encrypted.encryptedData).not.toBe(secret);

      const decrypted = cryptoUtils.decryptSecret(encrypted);
      expect(decrypted).toBe(secret);
    });

    it('hashes application secrets using HMAC-SHA256 with pepper', () => {
      const plainSecret = 'my_secure_app_secret_abc123';
      const hash1 = cryptoUtils.hashAppSecret(plainSecret);
      const hash2 = cryptoUtils.hashAppSecret(plainSecret);

      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBe(64); // SHA-256 hex output is 64 chars
      expect(hash1).toBe(hash2); // deterministic with pepper
      expect(cryptoUtils.safeCompare(hash1, hash2)).toBe(true);
      expect(cryptoUtils.safeCompare(hash1, 'wrong_hash')).toBe(false);
    });

    it('correctly masks key identifiers for safe display in dashboard', () => {
      expect(cryptoUtils.maskIdentifier('rzp_test_1234567890abcdef')).toBe('rzp_test...cdef');
      expect(cryptoUtils.maskIdentifier('short')).toBe('****');
    });
  });

  describe('Security & Sensitive Data Redaction', () => {
    it('redacts sensitive keys from logs', () => {
      const sensitiveInput = {
        keySecret: 'super_secret_value',
        webhookSecret: 'whsec_99999',
        applicationId: 'app_123',
        nested: {
          authorization: 'Bearer token123',
          normalField: 'visible',
        },
      };

      const sanitized = logger.redact(sensitiveInput);
      expect(sanitized.keySecret).toBe('[REDACTED]');
      expect(sanitized.webhookSecret).toBe('[REDACTED]');
      expect(sanitized.applicationId).toBe('app_123');
      expect(sanitized.nested.authorization).toBe('[REDACTED]');
      expect(sanitized.nested.normalField).toBe('visible');
    });
  });
});

