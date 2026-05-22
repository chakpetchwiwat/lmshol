const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('Starting data migration...');

  try {
    // 1. Get unique values from User table
    const users = await prisma.user.findMany();
    
    const uniqueDepartments = [...new Set(users.map(u => u.department).filter(Boolean))];
    const uniquePositions = [...new Set(users.map(u => u.position).filter(Boolean))];
    const uniquePositionLevels = [...new Set(users.map(u => u.positionLevel).filter(Boolean))];
    const uniquePositionTypes = [...new Set(users.map(u => u.positionType).filter(Boolean))];

    console.log(`Found ${uniqueDepartments.length} departments`);
    console.log(`Found ${uniquePositions.length} positions`);
    console.log(`Found ${uniquePositionLevels.length} levels`);
    console.log(`Found ${uniquePositionTypes.length} types`);

    // 2. Clear old Departments and Tiers
    // First, nullify references
    await prisma.user.updateMany({
      data: {
        departmentId: null,
        tierId: null
      }
    });
    console.log('Nullified user department and tier references.');

    // Delete related access rules
    await prisma.courseTierAccess.deleteMany();
    await prisma.categoryTierAccess.deleteMany();
    await prisma.courseDepartmentAccess.deleteMany();
    await prisma.categoryDepartmentAccess.deleteMany();
    await prisma.goalTargetDepartment.deleteMany();

    // Delete tiers and departments
    await prisma.tier.deleteMany();
    await prisma.department.deleteMany();
    console.log('Deleted old Tiers and Departments.');

    // 3. Create new Departments and Positions (Tiers)
    const depMap = {};
    for (const depName of uniqueDepartments) {
      const newDep = await prisma.department.create({
        data: { name: depName }
      });
      depMap[depName] = newDep.id;
    }
    console.log('Created new Departments.');

    const posMap = {};
    for (let i = 0; i < uniquePositions.length; i++) {
      const posName = uniquePositions[i];
      const newPos = await prisma.tier.create({
        data: { name: posName, order: i }
      });
      posMap[posName] = newPos.id;
    }
    console.log('Created new Positions in Tier table.');

    // 4. Re-link users to their new departmentId and tierId
    for (const user of users) {
      const updateData = {};
      if (user.department && depMap[user.department]) {
        updateData.departmentId = depMap[user.department];
      }
      if (user.position && posMap[user.position]) {
        updateData.tierId = posMap[user.position];
      }
      
      if (Object.keys(updateData).length > 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: updateData
        });
      }
    }
    console.log('Re-linked users to new departments and positions.');

    // 5. Store levels and types in SystemSetting
    const upsertSetting = async (key, arrayData) => {
      const items = arrayData.map((name, index) => ({
        id: `gen-${Date.now()}-${index}`,
        name,
        order: index
      }));
      
      const valueStr = JSON.stringify(items);
      
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: valueStr },
        create: { key, value: valueStr }
      });
    };

    await upsertSetting('POSITION_LEVELS', uniquePositionLevels);
    await upsertSetting('POSITION_TYPES', uniquePositionTypes);
    console.log('Saved Position settings to SystemSetting.');

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
