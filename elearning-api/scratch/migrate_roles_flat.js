const prisma = require('../src/utils/prisma');
const xlsx = require('xlsx');

const normalizeRoleKey = (value) => String(value || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '');

async function main() {
  try {
    const filePath = 'C:\\Users\\AlexWang\\Downloads\\user role update\\Role - Level 05.06.2569.xlsx';
    console.log('Reading excel from:', filePath);
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);

    console.log('Total Rows to process:', rows.length);

    let currentGroupName = "";
    let order = 0;

    for (const row of rows) {
      const rawGroupName = row['Role '];
      const roleNameWithLevel = row['Role - Level'];

      if (rawGroupName && String(rawGroupName).trim()) {
        currentGroupName = String(rawGroupName).trim();
      }

      if (!roleNameWithLevel) continue;
      const finalRoleName = String(roleNameWithLevel).trim();
      const key = normalizeRoleKey(finalRoleName);

      console.log(`Upserting: "${finalRoleName}" (key: ${key}), Group: "${currentGroupName}"`);

      await prisma.cohortRole.upsert({
        where: { key },
        update: {
          name: finalRoleName,
          group: currentGroupName || null,
          levels: [], // Reset legacy hierarchical levels
          adminLevels: [],
          order
        },
        create: {
          key,
          name: finalRoleName,
          group: currentGroupName || null,
          levels: [],
          adminLevels: [],
          order
        }
      });
      order++;
    }

    console.log('Flat Cohort Roles migration successfully finished!');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
