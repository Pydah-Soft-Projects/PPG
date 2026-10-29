const bcrypt = require('bcryptjs');
const { connectDatabase, disconnectDatabase } = require('./connection');
const AdminUser = require('./models/admin-user.model');
const Application = require('./models/application.model');
const ApplicationCredential = require('./models/application-credential.model');
const ProviderConfiguration = require('./models/provider-configuration.model');
const { encryptSecret, hashSecret } = require('../common/utils/crypto');
const { generateAppKeyId, generateAppSecret } = require('../common/utils/id');
const { ADMIN_ROLE, PROVIDER_TYPE, PROVIDER_ENVIRONMENT } = require('../config/constants');
const { logger } = require('../common/logger/logger');

async function seedDatabase() {
  try {
    await connectDatabase();
    console.log('\n--- Seeding Initial Pydah Payment Gateway Data ---');

    // 1. Seed Super Admin
    let admin = await AdminUser.findOne({ username: 'admin' });
    if (!admin) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('superadmin123', salt);

      admin = await AdminUser.create({
        username: 'superadmin',
        email: "[EMAIL_ADDRESS]",
        passwordHash,
        role: ADMIN_ROLE.SUPER_ADMIN,
        isActive: true,
      });
      console.log('✔ Super Admin created:');
      console.log('   Username: superadmin');
      console.log('   Password: superadmin123');
    } else {
      console.log('ℹ Super Admin "admin" already exists.');
    }

    // 2. Seed Test Provider Configuration (Razorpay Test Mode)
    let providerConfig = await ProviderConfiguration.findOne({
      provider: PROVIDER_TYPE.RAZORPAY,
      environment: PROVIDER_ENVIRONMENT.TEST,
    });

    if (!providerConfig) {
      providerConfig = await ProviderConfiguration.create({
        name: 'Razorpay - Test Mode Account',
        provider: PROVIDER_TYPE.RAZORPAY,
        environment: PROVIDER_ENVIRONMENT.TEST,
        keyId: 'rzp_test_placeholder_key_id',
        encryptedKeySecret: encryptSecret('placeholder_test_secret_replace_in_dashboard'),
        encryptedWebhookSecret: encryptSecret('placeholder_webhook_secret_replace'),
        status: 'ACTIVE',
        allowedApplicationIds: [],
        notes: 'Initial test mode placeholder. Update with actual test credentials in Admin Settings.',
      });
      console.log('✔ Default Razorpay Test Provider configuration created:');
      console.log(`   Config ID: ${providerConfig._id}`);
    } else {
      console.log(`ℹ Provider config already exists: ${providerConfig._id}`);
    }

    // 3. Seed Default Application (e.g. Pydah LMS)
    let app = await Application.findOne({ code: 'pydah_lms' });
    let appSecret = null;
    let appKeyId = null;

    if (!app) {
      app = await Application.create({
        name: 'Pydah Learning Management System',
        code: 'pydah_lms',
        description: 'Pydah College Student Portal & Course Fee Payments',
        notificationWebhookUrl: 'http://localhost:4000/api/webhooks/payment',
        allowedReturnUrls: ['http://localhost:5173/payment-success'],
        assignedProviderConfigurations: [providerConfig._id],
        status: 'ACTIVE',
      });

      appKeyId = generateAppKeyId();
      appSecret = generateAppSecret();
      const hashedSecret = hashSecret(appSecret);

      await ApplicationCredential.create({
        applicationId: app._id,
        keyId: appKeyId,
        hashedSecret,
        status: 'ACTIVE',
      });

      console.log('✔ Test Application created:');
      console.log(`   Name: ${app.name}`);
      console.log(`   App ID: ${app._id}`);
      console.log(`   X-App-Key: ${appKeyId}`);
      console.log(`   X-App-Secret: ${appSecret}`);
    } else {
      console.log(`ℹ Application "pydah_lms" already exists.`);
    }

    console.log('--- Database Seeding Complete ---\n');
    await disconnectDatabase();
  } catch (error) {
    logger.error('Seeding error', { error: error.message });
    process.exit(1);
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;

