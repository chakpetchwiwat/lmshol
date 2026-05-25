const fs = require('fs');
const xlsx = require('xlsx');

// File paths
const dbCertsFile = 'db_certs.json';
const excelFile = 'C:\\Users\\AlexWang\\Documents\\Codex\\2026-05-24\\files-mentioned-by-the-user-batch\\merged_external_training_deduped.xlsx';

const prefixes = [
  'นางสาว', 'นาง', 'นาย', 'นายแพทย์', 'แพทย์หญิง', 'ดร.', 'นพ.', 'พญ.',
  'ทพ.', 'ทพญ.', 'เภสัชกรหญิง', 'เภสัชกร', 'ภญ.', 'ภก.', 'คุณ',
  'ว่าที่ร้อยตรีหญิง', 'ว่าที่ร้อยตรี', 'ว่าที่ร้อยเอก', 'ว่าที่ร้อยโท',
  'ศ.ดร.', 'รศ.ดร.', 'ผศ.ดร.', 'ศ.', 'รศ.', 'ผศ.'
];

function cleanPrefixAndSpaces(name) {
  if (!name) return '';
  let n = String(name).trim();
  for (const p of prefixes) {
    if (n.startsWith(p)) {
      n = n.slice(p.length).trim();
      break;
    }
  }
  n = n.replace(/\s+/g, '');
  
  // Map known name changes to align database users and Excel rows
  if (n === 'คัคนางค์โตสงวน') return 'คัคนางค์ปอแก้ว';
  if (n === 'อัญชลีจิตรักนที') return 'อัญชลีศรีสวัสดิ์';
  
  return n;
}

function parseExcelDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    return new Date(Math.round((val - 25569) * 86400 * 1000));
  }
  
  const str = String(val).trim();
  if (!str) return null;

  const matchBE = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (matchBE) {
    const day = parseInt(matchBE[1], 10);
    const month = parseInt(matchBE[2], 10) - 1;
    let year = parseInt(matchBE[3], 10);
    if (year >= 2400) {
      year -= 543;
    }
    return new Date(year, month, day);
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    let year = parsed.getFullYear();
    if (year >= 2500) {
      parsed.setFullYear(year - 543);
    }
    return parsed;
  }

  return null;
}

function formatDate(dateObj) {
  if (!dateObj) return '';
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDbDateStr(issueDate) {
  if (!issueDate) return '';
  // issueDate is in format 2024-05-14T14:57:00.000Z
  return issueDate.substring(0, 10);
}

function normalizeTitle(title) {
  if (!title) return '';
  return String(title).trim().toLowerCase().replace(/\s+/g, '');
}

function run() {
  console.log('Loading database certificates...');
  if (!fs.existsSync(dbCertsFile)) {
    console.error(`Error: ${dbCertsFile} not found!`);
    return;
  }
  const dbCerts = JSON.parse(fs.readFileSync(dbCertsFile, 'utf8'));
  console.log(`Loaded ${dbCerts.length} certificates from database.`);

  console.log('Loading Excel file...');
  if (!fs.existsSync(excelFile)) {
    console.error(`Error: Excel file not found at ${excelFile}!`);
    return;
  }
  const workbook = xlsx.readFile(excelFile, { cellDates: true });
  const sheetName = 'Merged Deduped Data';
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    console.error(`Error: Sheet "${sheetName}" not found in Excel!`);
    return;
  }
  const excelRows = xlsx.utils.sheet_to_json(sheet);
  console.log(`Loaded ${excelRows.length} rows from Excel sheet "${sheetName}".`);

  // Build match index keys
  // Let's create key builders
  // Key format: name | title | date
  
  const dbByIndex = new Map();
  dbCerts.forEach((cert, index) => {
    const nameKey = cleanPrefixAndSpaces(cert.user ? cert.user.name : '');
    const titleKey = normalizeTitle(cert.title);
    const dateKey = getDbDateStr(cert.issueDate);
    const key = `${nameKey}||${titleKey}||${dateKey}`;
    
    if (!dbByIndex.has(key)) {
      dbByIndex.set(key, []);
    }
    dbByIndex.get(key).push({ cert, index, matched: false });
  });

  const missingInDb = [];
  const matches = [];
  const metadataMismatches = [];

  excelRows.forEach((row, excelIdx) => {
    const nameKey = cleanPrefixAndSpaces(row['Full Name']);
    const titleKey = normalizeTitle(row['Course Name']);
    const rawDate = row['Completion Date'] || row['Enrolment Date'];
    const parsedDate = parseExcelDate(rawDate);
    const dateKey = parsedDate ? formatDate(parsedDate) : '';
    
    const key = `${nameKey}||${titleKey}||${dateKey}`;
    
    // Look up in DB index
    let dbMatches = dbByIndex.get(key) || [];
    // Try to find an unmatched DB record
    let match = dbMatches.find(m => !m.matched);
    
    if (!match) {
      // Try soft match without date key (name + title only) to see if dates differ
      let softKeyPrefix = `${nameKey}||${titleKey}||`;
      let foundSoftMatch = false;
      for (const [dbKey, items] of dbByIndex.entries()) {
        if (dbKey.startsWith(softKeyPrefix)) {
          match = items.find(m => !m.matched);
          if (match) {
            foundSoftMatch = true;
            break;
          }
        }
      }
    }

    if (match) {
      match.matched = true;
      const dbCert = match.cert;
      
      // Compare metadata details
      const diffs = [];
      
      // 1. Days
      const excelDays = row['Number of Days'] !== undefined && row['Number of Days'] !== null ? String(row['Number of Days']).trim() : '';
      const dbDays = dbCert.trainingDays !== null && dbCert.trainingDays !== undefined ? String(dbCert.trainingDays).trim() : '';
      if (excelDays !== dbDays) {
        diffs.push(`Days: Excel="${excelDays}" vs DB="${dbDays}"`);
      }
      
      // 2. Intake No.
      const excelIntake = row['Intake No.'] !== undefined && row['Intake No.'] !== null ? String(row['Intake No.']).trim() : '';
      const dbIntake = dbCert.intakeNo !== null && dbCert.intakeNo !== undefined ? String(dbCert.intakeNo).trim() : '';
      if (excelIntake !== dbIntake) {
        diffs.push(`Intake No: Excel="${excelIntake}" vs DB="${dbIntake}"`);
      }

      // 3. Date
      const dbDate = getDbDateStr(dbCert.issueDate);
      if (dateKey !== dbDate) {
        diffs.push(`Date: Excel="${dateKey}" vs DB="${dbDate}"`);
      }

      // 4. Venue
      const excelVenue = row['Venue'] ? String(row['Venue']).trim() : '';
      const dbVenue = dbCert.trainingVenue ? String(dbCert.trainingVenue).trim() : '';
      if (excelVenue !== dbVenue) {
        // Only report if significantly different (e.g. not just space)
        if (excelVenue.replace(/\s+/g, '') !== dbVenue.replace(/\s+/g, '')) {
          diffs.push(`Venue: Excel="${excelVenue}" vs DB="${dbVenue}"`);
        }
      }

      // 5. Organizing Agency / Issuer
      const excelIssuer = row['Organizing Agency'] ? String(row['Organizing Agency']).trim() : '';
      const dbIssuer = dbCert.issuer ? String(dbCert.issuer).trim() : '';
      if (excelIssuer !== dbIssuer && !(excelIssuer === '' && dbIssuer === '-')) {
        if (excelIssuer.replace(/\s+/g, '') !== dbIssuer.replace(/\s+/g, '')) {
          diffs.push(`Issuer: Excel="${excelIssuer}" vs DB="${dbIssuer}"`);
        }
      }

      if (diffs.length > 0) {
        metadataMismatches.push({
          userName: row['Full Name'],
          courseName: row['Course Name'],
          excelRow: excelIdx + 2, // 1-based index plus header offset
          dbId: dbCert.id,
          diffs
        });
      } else {
        matches.push({
          userName: row['Full Name'],
          courseName: row['Course Name'],
          excelRow: excelIdx + 2,
          dbId: dbCert.id
        });
      }
    } else {
      missingInDb.push({
        userName: row['Full Name'],
        courseName: row['Course Name'],
        courseGroup: row['Course Group'],
        courseType: row['Course Type'],
        date: dateKey,
        days: row['Number of Days'],
        intake: row['Intake No.'],
        venue: row['Venue'],
        excelRow: excelIdx + 2
      });
    }
  });

  // Find DB records that were never matched
  const extraInDb = [];
  for (const [key, items] of dbByIndex.entries()) {
    items.forEach(item => {
      if (!item.matched) {
        extraInDb.push({
          userName: item.cert.user ? item.cert.user.name : 'Unknown User',
          courseName: item.cert.title,
          date: getDbDateStr(item.cert.issueDate),
          dbId: item.cert.id,
          days: item.cert.trainingDays,
          intake: item.cert.intakeNo
        });
      }
    });
  }

  console.log(`\nComparison Summary:`);
  console.log(`- Perfectly Matched rows: ${matches.length}`);
  console.log(`- Matched rows but with metadata differences: ${metadataMismatches.length}`);
  console.log(`- Rows in Excel but MISSING in DB: ${missingInDb.length}`);
  console.log(`- Records in DB but EXTRA (not in Excel): ${extraInDb.length}`);

  // Generate Report
  const reportPath = 'C:\\Users\\AlexWang\\Downloads\\training_data_discrepancy_report.md';
  let reportStr = `# รายงานผลการตรวจสอบความแตกต่างของข้อมูลประวัติฝึกอบรม (Discrepancy Report)
*สร้างเมื่อ: ${new Date().toLocaleString('th-TH')}*
*เปรียบเทียบระหว่าง Excel (${excelRows.length} แถว) และ Database (${dbCerts.length} รายการ)*

---

## 1. สรุปภาพรวม (Summary)
- **แถวที่ข้อมูลตรงกันสมบูรณ์**: ${matches.length} รายการ
- **แถวที่ข้อมูลตรงกันแต่รายละเอียดไม่ตรง (Metadata Mismatch)**: ${metadataMismatches.length} รายการ
- **ข้อมูลที่มีใน Excel แต่ไม่มีใน Database (Missing in DB)**: ${missingInDb.length} รายการ
- **ข้อมูลที่มีใน Database แต่ไม่มีใน Excel (Extra in DB)**: ${extraInDb.length} รายการ

---

## 2. รายการที่มีใน Excel แต่ไม่มีใน Database (Missing in DB - รวม ${missingInDb.length} รายการ)
*รายการเหล่านี้จำเป็นต้องทำการเพิ่มเข้าไปใน Database*

| แถวใน Excel | ชื่อ-นามสกุล | ชื่อหลักสูตร | วันที่เรียนจบ | จำนวนวัน | รุ่น | สถานที่ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${missingInDb.map(m => `| ${m.excelRow} | ${m.userName} | ${m.courseName} | ${m.date || '-'} | ${m.days !== undefined && m.days !== null ? m.days : '-'} | ${m.intake || '-'} | ${m.venue || '-'} |`).join('\n')}

---

## 3. รายการที่มีใน Database แต่ไม่มีใน Excel (Extra in DB - รวม ${extraInDb.length} รายการ)
*รายการเหล่านี้ใน DB อาจจะเกินมา หรือเป็นข้อมูลเก่าที่ไม่ได้อยู่ใน Excel ตัวล่าสุดแล้ว และควรพิจารณาลบออก*

| ID ใน DB | ชื่อ-นามสกุล | ชื่อหลักสูตร | วันที่เรียนจบ | จำนวนวัน | รุ่น |
| :--- | :--- | :--- | :--- | :--- | :--- |
${extraInDb.map(e => `| \`${e.dbId}\` | ${e.userName} | ${e.courseName} | ${e.date || '-'} | ${e.days || '-'} | ${e.intake || '-'} |`).join('\n')}

---

## 4. รายการที่มีข้อมูลไม่ตรงกัน (Metadata Mismatches - รวม ${metadataMismatches.length} รายการ)
*รายการที่ชื่อผู้ใช้และชื่อหลักสูตรตรงกัน แต่มีรายละเอียดบางฟิลด์ไม่ตรงกัน (เช่น จำนวนวัน, รุ่น, หรือสถานที่)*

| แถวใน Excel | ID ใน DB | ชื่อ-นามสกุล | ชื่อหลักสูตร | รายละเอียดที่ไม่ตรงกัน |
| :--- | :--- | :--- | :--- | :--- |
${metadataMismatches.map(m => `| ${m.excelRow} | \`${m.dbId}\` | ${m.userName} | ${m.courseName} | ${m.diffs.join('<br>')} |`).join('\n')}
`;

  fs.writeFileSync(reportPath, reportStr, 'utf8');
  console.log(`\nSaved report file to: ${reportPath}`);
}

run();
