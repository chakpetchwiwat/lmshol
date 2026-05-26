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
    const filePath = "C:\\Users\\AlexWang\\OneDrive\\เอกสาร\\Role - Level.xlsx";
    console.log("Reading excel from:", filePath);
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    // Group levels by role
    const rolesMap = {};
    let currentRole = null;

    for (const row of data) {
      const rawRole = row['Role '];
      const rawLevel = row['Level'];

      if (rawRole && String(rawRole).trim()) {
        currentRole = String(rawRole).trim();
      }

      if (!currentRole) continue;

      if (!rolesMap[currentRole]) {
        rolesMap[currentRole] = [];
      }

      if (rawLevel && String(rawLevel).trim() !== '-') {
        rolesMap[currentRole].push(String(rawLevel).trim());
      }
    }

    console.log("Parsed roles and levels:");
    console.log(JSON.stringify(rolesMap, null, 2));

    // Upsert into db
    let order = 0;
    for (const [roleName, levels] of Object.entries(rolesMap)) {
      const key = normalizeRoleKey(roleName);
      console.log(`Upserting: ${roleName} (key: ${key}), levels: [${levels.join(', ')}]`);

      await prisma.cohortRole.upsert({
        where: { key },
        update: {
          name: roleName,
          levels,
          order
        },
        create: {
          key,
          name: roleName,
          levels,
          order
        }
      });
      order++;
    }

    console.log("Roles and levels seeded successfully!");
  } catch (error) {
    console.error("Error seeding roles and levels:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
