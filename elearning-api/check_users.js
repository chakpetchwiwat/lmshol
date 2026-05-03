const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdminUsers() {
  const users = await prisma.user.findMany({
    where: {
      role: {
        in: ['admin', 'manager']
      }
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  });
  console.log('--- Admin & Manager Users ---');
  console.table(users);
  await prisma.$disconnect();
}

checkAdminUsers();
