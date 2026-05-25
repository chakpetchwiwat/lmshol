const xlsx = require('xlsx');

const mergedFile = "C:\\Users\\AlexWang\\Documents\\Codex\\2026-05-24\\files-mentioned-by-the-user-batch\\merged_external_training_deduped.xlsx";
const dupFile = "C:\\Users\\AlexWang\\Documents\\Codex\\2026-05-24\\files-mentioned-by-the-user-batch\\duplicate_external_training_review.xlsx";

function inspectFile(filePath, name) {
  try {
    const wb = xlsx.readFile(filePath);
    console.log(`--- File: ${name} ---`);
    wb.SheetNames.forEach(sheetName => {
      const sheet = wb.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet);
      console.log(`Sheet: "${sheetName}" has ${data.length} rows.`);
      if (data.length > 0) {
        console.log(`Sample columns:`, Object.keys(data[0]));
      }
    });
  } catch (err) {
    console.error(`Error reading ${name}:`, err.message);
  }
}

inspectFile(mergedFile, 'Merged Deduplicated File');
inspectFile(dupFile, 'Duplicate Review File');
