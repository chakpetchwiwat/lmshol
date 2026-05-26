const xlsx = require('xlsx');

try {
  const workbook = xlsx.readFile("C:\\Users\\AlexWang\\OneDrive\\เอกสาร\\Role - Level.xlsx");
  console.log("SheetNames:", workbook.SheetNames);
  
  for (const sheetName of workbook.SheetNames) {
    console.log(`\n--- Sheet: ${sheetName} ---`);
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    console.log(data);
  }
} catch (error) {
  console.error("Error reading excel file:", error);
}
