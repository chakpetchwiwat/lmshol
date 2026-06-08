const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Merging duplicate categories in DB...');

  // 1. Merge "organisation skill" into "Organization Skill" under "02-MRD Level"
  const fromCat = await prisma.competencyCategory.findFirst({
    where: {
      name: { equals: 'organisation skill' }, // matches exact 'organisation skill' lowercase
      code: '02-MRD_LEVEL_ORGANISATION_SKILL'
    }
  });

  const toCat = await prisma.competencyCategory.findFirst({
    where: {
      name: { equals: 'Organization Skill' }, // matches exact 'Organization Skill' uppercase
      code: '02-MRD_LEVEL_ORGANIZATION_SKILL'
    }
  });

  if (fromCat && toCat && fromCat.id !== toCat.id) {
    console.log(`Found duplicate categories: "${fromCat.name}" (ID: ${fromCat.id}) and "${toCat.name}" (ID: ${toCat.id})`);
    
    // Move all competencies from fromCat to toCat
    const updateRes = await prisma.competency.updateMany({
      where: { categoryId: fromCat.id },
      data: { categoryId: toCat.id }
    });
    console.log(`Updated ${updateRes.count} competencies to use "${toCat.name}".`);

    // Delete the duplicate category
    await prisma.competencyCategory.delete({
      where: { id: fromCat.id }
    });
    console.log(`Deleted duplicate category "${fromCat.name}".`);
  } else {
    console.log('No duplicate Organization Skill category found to merge.');
  }

  // 2. Fix spelling of "Inspecctor skill" to "Inspector skill"
  const inspectorCats = await prisma.competencyCategory.findMany({
    where: {
      name: { equals: 'Inspecctor skill' }
    }
  });

  for (const cat of inspectorCats) {
    const newCode = cat.code.replace('INSPECCTOR', 'INSPECTOR');
    
    // Check if new code already exists to prevent unique violations
    const existing = await prisma.competencyCategory.findUnique({
      where: { code: newCode }
    });

    if (!existing) {
      await prisma.competencyCategory.update({
        where: { id: cat.id },
        data: { name: 'Inspector skill', code: newCode }
      });
      console.log(`Corrected spelling of category ID ${cat.id} to "Inspector skill" and code to "${newCode}".`);
    } else {
      console.log(`Category code "${newCode}" already exists. Merging competencies instead...`);
      await prisma.competency.updateMany({
        where: { categoryId: cat.id },
        data: { categoryId: existing.id }
      });
      await prisma.competencyCategory.delete({
        where: { id: cat.id }
      });
      console.log(`Merged duplicate Inspecctor category into existing one.`);
    }
  }

  console.log('Finished category consolidation.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
