const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  
  const depts = new Set();
  const subdivisions = new Set();
  const tiers = new Set();
  const levels = new Set();
  const types = new Set();
  
  for (const u of users) {
    if (u.department) depts.add(u.department.trim());
    if (u.subdivision) subdivisions.add(u.subdivision.trim());
    if (u.position) tiers.add(u.position.trim());
    if (u.positionLevel) levels.add(u.positionLevel.trim());
    if (u.positionType) types.add(u.positionType.trim());
  }

  // Insert Departments
  const deptArr = Array.from(depts);
  for (let i=0; i<deptArr.length; i++) {
    const existing = await prisma.department.findFirst({ where: { name: deptArr[i] }});
    if (!existing) {
      await prisma.department.create({ data: { name: deptArr[i] } });
    }
  }

  // Insert Tiers
  const tierArr = Array.from(tiers);
  for (let i=0; i<tierArr.length; i++) {
    const existing = await prisma.tier.findFirst({ where: { name: tierArr[i] }});
    if (!existing) {
      await prisma.tier.create({ data: { name: tierArr[i], order: i } });
    }
  }

  // Insert Settings
  await prisma.systemSetting.upsert({
    where: { key: 'SUBDIVISIONS' },
    update: { value: JSON.stringify(Array.from(subdivisions)) },
    create: { key: 'SUBDIVISIONS', value: JSON.stringify(Array.from(subdivisions)) }
  });
  
  await prisma.systemSetting.upsert({
    where: { key: 'POSITION_LEVELS' },
    update: { value: JSON.stringify(Array.from(levels)) },
    create: { key: 'POSITION_LEVELS', value: JSON.stringify(Array.from(levels)) }
  });
  
  await prisma.systemSetting.upsert({
    where: { key: 'POSITION_TYPES' },
    update: { value: JSON.stringify(Array.from(types)) },
    create: { key: 'POSITION_TYPES', value: JSON.stringify(Array.from(types)) }
  });

  console.log('Seeded data from users.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
