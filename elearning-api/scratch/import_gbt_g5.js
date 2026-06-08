const fs = require('fs');
const path = require('path');
const { importGbtCompetencies } = require('../src/services/admin/admin.competencies');

async function run() {
  const filePath = "C:\\Users\\AlexWang\\Downloads\\GBT_Central_Master_TM_v5_integrated_5.xlsx";
  console.log(`Reading Excel file from: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File does not exist at ${filePath}`);
    process.exit(1);
  }

  const buffer = fs.readFileSync(filePath);
  console.log("File loaded into buffer. Starting import...");

  try {
    const summary = await importGbtCompetencies(buffer);
    console.log("\nImport Completed Successfully!");
    console.log("==================================");
    console.log(`Imported Rows: ${summary.importedRows}`);
    console.log(`Groups Created: ${summary.groupsCreated}`);
    console.log(`Groups Updated: ${summary.groupsUpdated}`);
    console.log(`Categories Created: ${summary.categoriesCreated}`);
    console.log(`Categories Updated: ${summary.categoriesUpdated}`);
    console.log(`Competencies Created: ${summary.competenciesCreated}`);
    console.log(`Competencies Updated: ${summary.competenciesUpdated}`);
    console.log(`Levels Upserted: ${summary.levelsUpserted}`);
    console.log(`Skipped Rows: ${summary.skippedRows}`);
    console.log("==================================");
    console.log("Logs:");
    summary.logs.forEach(log => console.log(`- ${log}`));
  } catch (error) {
    console.error("Import failed with error:", error);
  }
}

run();
