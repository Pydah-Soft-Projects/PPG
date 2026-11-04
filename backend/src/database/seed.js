const bcrypt = require('bcryptjs');
const { connectDatabase, disconnectDatabase } = require('./connection');
const AdminUser = require('./models/admin-user.model');
const { ADMIN_ROLE } = require('../config/constants');
const { logger } = require('../common/logger/logger');

async function seedDatabase() {
  try {
    await connectDatabase();
    console.log('\n--- Seeding Initial Super Admin ---');

    const defaultUsername = process.env.ADMIN_USERNAME || 'superadmin';
    const defaultPassword = process.env.ADMIN_PASSWORD || 'superadmin123';
    const defaultEmail = process.env.ADMIN_EMAIL || '[EMAIL_ADDRESS]';

    let admin = await AdminUser.findOne({
      $or: [{ username: defaultUsername }, { username: 'admin' }],
    });

    if (!admin) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(defaultPassword, salt);

      admin = await AdminUser.create({
        username: defaultUsername,
        email: defaultEmail,
        passwordHash,
        role: ADMIN_ROLE.SUPER_ADMIN,
        isActive: true,
      });

      console.log('✔ Super Admin created successfully:');
      console.log(`   Username: ${defaultUsername}`);
      console.log(`   Password: ${defaultPassword}`);
      console.log(`   Email:    ${defaultEmail}`);
    } else {
      console.log(`ℹ Super Admin ("${admin.username}") already exists.`);
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
