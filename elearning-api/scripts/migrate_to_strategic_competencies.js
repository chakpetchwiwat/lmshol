const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  console.log('🚀 Starting Strategic Competency Migration...');

  const mapping = {
    'KM_COURSE': 'STRAT_BUSINESS',
    'LEARNING_ASSESS': 'STRAT_CORE',
    'INCENTIVE_REWARD': 'STRAT_FUNCTIONAL',
    'TRACKING_ANALYTICS': 'STRAT_LEADERSHIP',
    'GOAL_PATH': 'STRAT_COMPLIANCE',
    'INTERNAL_COMM': 'STRAT_DIGITAL'
  };

  for (const [oldType, newType] of Object.entries(mapping)) {
    const updated = await prisma.category.updateMany({
      where: { type: oldType },
      data: { type: newType }
    });
    console.log(`✅ Migrated ${oldType} -> ${newType} (${updated.count} categories updated)`);
  }

  console.log('🎉 Migration complete!');
}

migrate()
  .catch(e => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
