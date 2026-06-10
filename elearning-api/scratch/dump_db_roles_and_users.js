const fs = require('fs');
const path = require('path');
const prisma = require('../src/utils/prisma');

async function main() {
  try {
    console.log('Fetching all CohortRoles...');
    const cohortRoles = await prisma.cohortRole.findMany({
      orderBy: { name: 'asc' }
    });

    console.log('Fetching all Users...');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        roles: true,
        roleLevels: true,
        status: true,
        department: true,
        position: true
      }
    });

    const output = {
      cohortRoles,
      users
    };

    const outputPath = path.join(__dirname, '..', '..', 'db_dump.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`Successfully wrote ${cohortRoles.length} roles and ${users.length} users to ${outputPath}`);
  } catch (err) {
    console.error('Error dumping database:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
