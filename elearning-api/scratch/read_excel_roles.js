const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const dirPath = 'C:\\Users\\AlexWang\\Downloads\\user role update';
try {
  const files = fs.readdirSync(dirPath);
  files.forEach(file => {
    if (file.endsWith('.xlsx') && file.startsWith('users_profile_role')) {
      const filePath = path.join(dirPath, file);
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet);
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        const roleHeaders = headers.filter(h => h.toLowerCase().includes('role'));
        console.log(`File: ${file}`);
        console.log(`  Role headers:`, roleHeaders);
      }
    }
  });
} catch (err) {
  console.error('Error:', err);
}
