// Production seed - runs on every server start to ensure admin account exists
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedProduction() {
  try {
    // Upsert admin user with production credentials
    const adminHash = await bcrypt.hash('Genjironan.1', 10);
    await prisma.user.upsert({
      where: { email: 'chakpetch@scaleup.co.th' },
      update: { password: adminHash, name: 'Chakpetch', permission: 'admin' },
      create: {
        name: 'Chakpetch',
        email: 'chakpetch@scaleup.co.th',
        password: adminHash,
        permission: 'admin',
        status: 'ACTIVE'
      }
    });

    // Upsert default test user
    const userHash = await bcrypt.hash('user123', 10);
    await prisma.user.upsert({
      where: { email: 'user@company.com' },
      update: { password: userHash },
      create: {
        name: 'Test User',
        email: 'user@company.com',
        password: userHash,
        permission: 'user',
        department: 'HRD',
        status: 'ACTIVE'
      }
    });

    // Ensure default categories exist
    await prisma.category.upsert({ where: { name: 'Compliance' }, update: {}, create: { name: 'Compliance', order: 1 } });
    await prisma.category.upsert({ where: { name: 'Soft Skills' }, update: {}, create: { name: 'Soft Skills', order: 2 } });
    await prisma.category.upsert({ where: { name: 'Hard Skills' }, update: {}, create: { name: 'Hard Skills', order: 3 } });

    console.log('[Seed] Admin and categories ensured OK');
  } catch (err) {
    console.error('[Seed] Error during seed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = seedProduction;
