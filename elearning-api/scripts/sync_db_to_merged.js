const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const p = new PrismaClient();

const file = process.argv[2] || '/home/ubuntu/lmsfda/elearning-api/scratch/merged_external_training_deduped.xlsx';

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

async function run() {
  console.log('=== STARTING DATABASE REBUILD TO MATCH MERGED REPORT ===');
  
  // 1. Load users
  const dbUsers = await p.user.findMany({
    select: { id: true, name: true }
  });
  console.log(`Loaded ${dbUsers.length} users from DB.`);

  const userMap = new Map();
  dbUsers.forEach(u => {
    const key = cleanPrefixAndSpaces(u.name).replace(/\s+/g, '');
    userMap.set(key, u);
  });

  // 2. Read merged Excel file
  let workbook;
  try {
    workbook = xlsx.readFile(file);
  } catch (err) {
    console.error('Error reading merged Excel file:', err.message);
    return;
  }
  
  const sheetName = workbook.SheetNames.find(name => name === 'Merged Deduped Data') || workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  
  let headerIdx = -1;
  for (let i = 0; i < rawRows.length; i++) {
    if (rawRows[i] && rawRows[i].includes('Full Name')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    console.error('Could not find header row containing "Full Name"!');
    return;
  }
  
  const headers = rawRows[headerIdx];
  const dataRows = rawRows.slice(headerIdx + 1);
  console.log(`Total rows to import: ${dataRows.length}`);
  
  const nameColIdx = headers.indexOf('Full Name');
  const courseTypeColIdx = headers.indexOf('Course Type');
  const courseGroupColIdx = headers.indexOf('Course Group');
  const courseNameColIdx = headers.indexOf('Course Name');
  const completionDateColIdx = headers.indexOf('Completion Date');
  const enrolmentDateColIdx = headers.indexOf('Enrolment Date');
  const organizingAgencyColIdx = headers.indexOf('Organizing Agency');
  const venueColIdx = headers.indexOf('Venue');
  const remarksColIdx = headers.indexOf('Remarks');
  const daysColIdx = headers.indexOf('Number of Days');
  const intakeColIdx = headers.indexOf('Intake No.');

  // 3. Clear existing certificates in database
  console.log('Clearing UserCertificate table...');
  const deleteResult = await p.userCertificate.deleteMany({});
  console.log(`Deleted ${deleteResult.count} certificates from database.`);

  // 4. Create missing users if any (safeguard)
  const defaultPasswordHash = bcrypt.hashSync('password123', 10);
  const missingUsers = new Set();
  
  dataRows.forEach(row => {
    const rawName = row[nameColIdx];
    if (!rawName) return;
    const normName = cleanPrefixAndSpaces(rawName).replace(/\s+/g, '');
    let user = userMap.get(normName);
    if (!user) {
      missingUsers.add(rawName.trim());
    }
  });

  if (missingUsers.size > 0) {
    console.log(`Found ${missingUsers.size} missing users to create...`);
    for (const name of missingUsers) {
      const randomHex = crypto.randomBytes(4).toString('hex');
      const email = `unregistered.user_${randomHex}@fda.moph.go.th`;
      const newUser = await p.user.create({
        data: {
          name: name,
          email: email,
          password: defaultPasswordHash,
          permission: 'user',
          status: 'ACTIVE'
        }
      });
      const key = cleanPrefixAndSpaces(newUser.name).replace(/\s+/g, '');
      userMap.set(key, newUser);
    }
    console.log('Finished creating missing users.');
  }

  // 5. Bulk insert certificates
  console.log('Importing certificates...');
  let importedCount = 0;
  
  // We can do standard inserts in chunks or loop (since it's ~5.7k records, we do it in chunks or simple loop)
  // Loop is safe, let's use Prisma transaction or batch inserts if we want speed,
  // but a simple batch createMany is much faster!
  const createData = [];
  
  for (const row of dataRows) {
    const rawName = row[nameColIdx];
    if (!rawName) continue;

    const normName = cleanPrefixAndSpaces(rawName).replace(/\s+/g, '');
    let user = userMap.get(normName);
    if (!user) {
      console.error(`User "${rawName}" still not resolved. Skipping.`);
      continue;
    }

    const title = String(row[courseNameColIdx] || 'ไม่มีชื่อหลักสูตร').trim();
    const parsedCompletionDate = parseExcelDate(row[completionDateColIdx]);
    const parsedEnrolmentDate = parseExcelDate(row[enrolmentDateColIdx]);

    const issueDate = parsedCompletionDate || parsedEnrolmentDate;
    const startDate = parsedEnrolmentDate;
    
    const trainingDaysVal = row[daysColIdx] !== undefined && row[daysColIdx] !== null ? String(row[daysColIdx]).trim() : null;
    const intakeNoVal = row[intakeColIdx] !== undefined && row[intakeColIdx] !== null ? String(row[intakeColIdx]).trim() : null;

    createData.push({
      userId: user.id,
      title: title,
      issuer: String(row[organizingAgencyColIdx] || '-').trim(),
      issueDate: issueDate,
      startDate: startDate,
      noExpiration: true,
      trainingType: String(row[courseTypeColIdx] || 'external').trim(),
      trainingItem: String(row[courseGroupColIdx] || 'unclassified').trim(),
      trainingVenue: row[venueColIdx] ? String(row[venueColIdx]).trim() : null,
      trainingDetails: row[remarksColIdx] ? String(row[remarksColIdx]).trim() : null,
      trainingDays: trainingDaysVal,
      intakeNo: intakeNoVal
    });
  }

  // Insert in chunks of 500 using createMany
  const chunkSize = 500;
  for (let i = 0; i < createData.length; i += chunkSize) {
    const chunk = createData.slice(i, i + chunkSize);
    await p.userCertificate.createMany({
      data: chunk
    });
    importedCount += chunk.length;
    console.log(`Imported chunk ${Math.floor(i / chunkSize) + 1} (${importedCount} / ${createData.length})`);
  }

  console.log(`\n=== REBUILD COMPLETE ===`);
  console.log(`Total certificate records in database: ${await p.userCertificate.count()}`);
}

run()
  .catch(console.error)
  .finally(() => p.$disconnect());
