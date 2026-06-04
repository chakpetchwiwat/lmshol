const fs = require('fs');
const path = require('path');
const prisma = require('../src/utils/prisma');
const { importGbtCompetencies } = require('../src/services/admin/admin.competencies');

async function run() {
  const excelPath = "C:\\Users\\AlexWang\\Downloads\\GBT_Central_Master_TM_v5_integrated_5.xlsx";
  console.log(`Reading Excel file: ${excelPath}`);
  
  if (!fs.existsSync(excelPath)) {
    console.error("Excel file does not exist at path!");
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(excelPath);
  console.log("File read successfully, importing GBT competencies...");

  try {
    const summary = await importGbtCompetencies(fileBuffer);
    console.log("Import completed successfully!");
    console.log("Summary:", JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error("Import failed with error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
