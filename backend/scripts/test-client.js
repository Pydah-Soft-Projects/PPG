/**
 * Test client script demonstrating an external PydahSoft application calling the Gateway.
 * Run using: node scripts/test-client.js
 */
const axios = require('axios');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:5000/api/v1';

async function testExternalAppCall() {
  console.log('\n=============================================================');
  console.log(' Pydah Payment Gateway - External Application Client Test');
  console.log('=============================================================\n');

  try {
    // 1. Health Check
    console.log('1. Checking Gateway Health...');
    const health = await axios.get(`${GATEWAY_URL}/health`);
    console.log('   Gateway Status:', health.data.status, `(Uptime: ${health.data.uptimeSeconds}s)`);

    // 2. Fetch Seeded Application Credentials via Admin Login
    console.log('\n2. Retrieving test application credentials...');
    const loginRes = await axios.post(`${GATEWAY_URL}/admin/auth/login`, {
      username: 'admin',
      password: 'Admin@Pydah2026!',
    });
    const token = loginRes.data.data.token;

    const appsRes = await axios.get(`${GATEWAY_URL}/admin/applications`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const lmsApp = appsRes.data.data.find((a) => a.code === 'pydah_lms');
    if (!lmsApp || !lmsApp.activeCredential) {
      console.log('   ℹ Test app or credential not found. Please run: npm run seed');
      return;
    }

    const appKeyId = lmsApp.activeCredential.keyId;
    console.log('   App Name:', lmsApp.name);
    console.log('   App Key ID:', appKeyId);

    // 3. Prompt or test order
    console.log('\n3. Note: To test server-to-server payment order creation, pass:');
    console.log('   Header: X-App-Key:', appKeyId);
    console.log('   Header: X-App-Secret: <your_app_secret>');
    console.log('\n   Refer to docs/TESTING_FROM_EXTERNAL_APP_GUIDE.md for complete examples.');
  } catch (err) {
    console.error('Test client error:', err.response?.data || err.message);
  }
}

testExternalAppCall();

