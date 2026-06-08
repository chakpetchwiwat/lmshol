const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const normalizeText = (value) => {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text || null;
};

const normalizeCode = (value, fallback) => {
    const source = normalizeText(value) || fallback;
    return String(source || '')
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^\w.-]/g, '_')
        .toUpperCase();
};

const makeImportCode = (value, fallback) => normalizeCode(value, fallback)
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

async function main() {
  console.log('Starting migration...');
  const competencies = await prisma.competency.findMany();
  console.log(`Found ${competencies.length} competencies to check.`);

  // Get distinct competencyType strings
  const uniqueTypes = [...new Set(competencies.map(c => c.competencyType).filter(Boolean))];
  console.log('Unique competency types found:', uniqueTypes);

  const typeMap = new Map();

  // Create CompetencyType records if they do not exist
  for (let i = 0; i < uniqueTypes.length; i++) {
    const typeName = uniqueTypes[i];
    const typeCode = makeImportCode(typeName, `COMPETENCY_TYPE_${i + 1}`);

    let cType = await prisma.competencyType.findUnique({
      where: { code: typeCode }
    });

    if (!cType) {
      cType = await prisma.competencyType.create({
        data: {
          code: typeCode,
          name: typeName,
          displayOrder: i
        }
      });
      console.log(`Created CompetencyType: ${typeName} (${typeCode})`);
    } else {
      console.log(`Existing CompetencyType: ${typeName} (${typeCode})`);
    }
    typeMap.set(typeName, cType.id);
  }

  // Update competencies to link them
  let updatedCount = 0;
  for (const comp of competencies) {
    if (comp.competencyType && !comp.competencyTypeId) {
      const typeId = typeMap.get(comp.competencyType);
      if (typeId) {
        await prisma.competency.update({
          where: { id: comp.id },
          data: { competencyTypeId: typeId }
        });
        updatedCount++;
      }
    }
  }

  console.log(`Migration finished. Linked ${updatedCount} competencies.`);
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
