const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Starting data migration for CompetencyLegacyCode...");

  // 1. Fetch all competencies that have a legacyCode
  const competencies = await prisma.competency.findMany({
    where: {
      legacyCode: {
        not: null
      }
    }
  });

  console.log(`Found ${competencies.length} competencies with legacyCode values.`);

  let totalMigrated = 0;
  for (const comp of competencies) {
    if (!comp.legacyCode) continue;

    // Split by comma and clean up whitespace
    const codes = comp.legacyCode
      .split(',')
      .map(code => code.trim())
      .filter(Boolean);

    console.log(`Competency ${comp.code} (${comp.name}): migrating legacy codes: ${JSON.stringify(codes)}`);

    for (const code of codes) {
      try {
        // Upsert to ensure we don't crash on duplicate legacy codes (unique constraint on competencyId + code)
        await prisma.competencyLegacyCode.upsert({
          where: {
            competencyId_code: {
              competencyId: comp.id,
              code: code
            }
          },
          update: {}, // nothing to update if it already exists
          create: {
            competencyId: comp.id,
            code: code
          }
        });
        totalMigrated++;
      } catch (err) {
        console.error(`Error migrating code ${code} for competency ${comp.code}:`, err.message);
      }
    }
  }

  console.log(`Migration complete. Total legacy code entries processed: ${totalMigrated}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
