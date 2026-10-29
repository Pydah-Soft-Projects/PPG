const request = require('supertest');
const app = require('../../src/app');

describe('Health and System Endpoints', () => {
  test('GET / should return gateway service information', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('name', 'Pydah Payment Gateway API');
    expect(res.body).toHaveProperty('version');
  });

  test('GET /api/v1/health should return service UP status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'UP');
    expect(res.body).toHaveProperty('uptimeSeconds');
  });

  test('Non-existent route should return structured 404 response', async () => {
    const res = await request(app).get('/api/v1/non-existent-route-xyz');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

