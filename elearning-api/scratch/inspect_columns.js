const xlsx = require('xlsx');

const mergedFile = "C:\\Users\\AlexWang\\Documents\\Codex\\2026-05-24\\files-mentioned-by-the-user-batch\\merged_external_training_deduped.xlsx";
const wb = xlsx.readFile(mergedFile, { cellDates: true });
const sheetName = "Merged Deduped Data";
const sheet = wb.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet);

console.log("First 5 records from Excel:");
console.log(JSON.stringify(data.slice(0, 5), null, 2));
