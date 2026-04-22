const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const managers = await prisma.user.findMany({
    where: { role: 'manager' },
    include: { departmentRef: true }
  });

  console.log('--- Manager Department Info ---');
  managers.forEach(m => {
    console.log(`Manager: ${m.name} (${m.email})`);
    console.log(`- Department ID: ${m.departmentId}`);
    console.log(`- Department Name: ${m.departmentRef?.name || 'NONE'}`);
    console.log('---------------------------');
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
