const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const prisma = require('../src/utils/prisma');
const {
  resolveImportedCompetencyMappings,
  saveUserCertificateCompetencies
} = require('../src/services/admin/admin.competencies');

const THAI_MONTHS = {
  'มกราคม': 1,
  'ม.ค.': 1,
  'กุมภาพันธ์': 2,
  'ก.พ.': 2,
  'มีนาคม': 3,
  'มี.ค.': 3,
  'เมษายน': 4,
  'เม.ย.': 4,
  'พฤษภาคม': 5,
  'พ.ค.': 5,
  'มิถุนายน': 6,
  'มิ.ย.': 6,
  'กรกฎาคม': 7,
  'ก.ค.': 7,
  'สิงหาคม': 8,
  'ส.ค.': 8,
  'กันยายน': 9,
  'ก.ย.': 9,
  'ตุลาคม': 10,
  'ต.ค.': 10,
  'พฤศจิกายน': 11,
  'พ.ย.': 11,
  'ธันวาคม': 12,
  'ธ.ค.': 12
};

const ENGLISH_MONTHS = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12
};

const OUTPUT_HEADERS = [
  'Match Status',
  'Full Name',
  'Position',
  'Division',
  'Course Type',
  'Course Group',
  'Course Name',
  'Completion Date',
  'Organizing Agency',
  'Venue',
  'Competency Codes',
  'Competency Names',
  'Competency Levels',
  'Competency Notes',
  'Remarks',
  'Source File',
  'Source Sheet'
];

const cleanText = (value) => String(value ?? '')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const normalizeName = (value) => cleanText(value)
  .replace(/^(นาย|นางสาว|นาง|น\.ส\.|นส\.|ดร\.|ดร|ภญ\.|ภก\.)\s*/i, '')
  .replace(/\s+/g, ' ')
  .toLowerCase();

const normalizeIssuer = (value) => {
  const text = cleanText(value);
  if (!text) return 'ภายนอก';
  return text.replace(/^(ใน|นอก)\//, '').trim() || 'ภายนอก';
};

const normalizeBuddhistYear = (year) => {
  const numericYear = parseInt(String(year || '').match(/\d{2,4}/)?.[0] || '', 10);
  if (Number.isNaN(numericYear)) return null;
  if (numericYear < 100) return 2500 + numericYear - 543;
  return numericYear > 2400 ? numericYear - 543 : numericYear;
};

const excelDateToDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number') {
    const parsed = xlsx.SSF.parse_date_code(value);
    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d);
  }
  return null;
};

const buildDate = (year, month, day = 1) => {
  const gregorianYear = normalizeBuddhistYear(year);
  if (!gregorianYear || !month) return null;
  return new Date(gregorianYear, month - 1, day || 1);
};

const parseDay = (value) => {
  const text = cleanText(value);
  if (!text) return 1;
  const matches = text.match(/\d{1,2}/g);
  if (!matches?.length) return 1;
  return parseInt(matches[matches.length - 1], 10);
};

const parseThaiMonth = (value) => {
  const text = cleanText(value);
  const monthKey = Object.keys(THAI_MONTHS).find((key) => text.includes(key));
  return monthKey ? THAI_MONTHS[monthKey] : null;
};

const parseEnglishMonth = (value) => {
  const text = cleanText(value).toLowerCase();
  const monthKey = Object.keys(ENGLISH_MONTHS).find((key) => text.includes(key));
  return monthKey ? ENGLISH_MONTHS[monthKey] : null;
};

const parseDateText = (value, fallbackYear = null) => {
  const excelDate = excelDateToDate(value);
  if (excelDate) return excelDate;

  const text = cleanText(value);
  if (!text || text === '-') return null;

  const nativeDate = new Date(text);
  if (!Number.isNaN(nativeDate.getTime())) return nativeDate;

  const year = normalizeBuddhistYear(text) || normalizeBuddhistYear(fallbackYear);
  const month = parseThaiMonth(text) || parseEnglishMonth(text);
  const day = parseDay(text);
  return buildDate(year, month, day);
};

const formatDateForExcel = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const makeUniqueHeader = (headers) => {
  const seen = new Map();
  return headers.map((header, index) => {
    const base = cleanText(header) || `__empty_${index}`;
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
};

const findHeaderRowIndex = (rows) => rows.findIndex((row) => {
  const joined = row.map(cleanText).join('|');
  const hasName = /Full Name|ชื่อ|ชื่อ - สกุล/.test(joined);
  const hasCourse = /Course Name|หลักสูตร|หัวข้อประชุม|หัวข้อเรื่อง/.test(joined);
  return hasName && hasCourse;
});

const rowsFromSheet = (sheet) => xlsx.utils.sheet_to_json(sheet, {
  header: 1,
  defval: '',
  raw: false,
  blankrows: false
});

const tableRowsFromSheet = (sheet) => {
  const rows = rowsFromSheet(sheet);
  const headerRowIndex = findHeaderRowIndex(rows);
  if (headerRowIndex < 0) return [];

  const headers = makeUniqueHeader(rows[headerRowIndex]);
  return rows.slice(headerRowIndex + 1).map((row) => Object.fromEntries(
    headers.map((header, index) => [header, row[index]])
  ));
};

const getFirst = (row, keys) => {
  for (const key of keys) {
    if (row[key] !== undefined && cleanText(row[key])) return row[key];
  }
  return '';
};

const getCompetencyFields = (row) => ({
  competencyCodes: cleanText(getFirst(row, [
    'Competency Codes',
    'Competency Code',
    'GBT Competency Code',
    'GBT Code'
  ])),
  competencyNames: cleanText(getFirst(row, [
    'Competency Names',
    'Competency Name',
    'GBT Competency Name'
  ])),
  competencyLevels: cleanText(getFirst(row, [
    'Competency Levels',
    'Competency Level',
    'Required Level',
    'GBT Level',
    'Level'
  ])),
  competencyNotes: cleanText(getFirst(row, [
    'Competency Notes',
    'Competency Note',
    'GBT Note'
  ]))
});

const inferCourseType = (row) => {
  const explicitType = cleanText(getFirst(row, ['Course Type', 'ประเภท']));
  if (explicitType) return explicitType;

  const activity = cleanText(getFirst(row, ['รายการ', 'รายละเอียด', 'หัวข้อประชุม/อบรม', 'หลักสูตร/หัวข้อเรื่อง ประชุม/ฝึกอบรม/สัมมนา']));
  if (activity.includes('ประชุม')) return 'ประชุม';
  if (activity.includes('สัมมนา')) return 'สัมมนา';
  if (activity.includes('อบรม')) return 'อบรม';
  return 'อบรม';
};

const mapStandardRow = (row, source) => {
  const fullName = cleanText(row['Full Name']);
  const courseName = cleanText(row['Course Name']);
  if (!fullName || !courseName) return null;

  return {
    fullName,
    position: cleanText(row.Position),
    division: cleanText(row.Division),
    courseType: cleanText(row['Course Type']) || inferCourseType(row),
    courseGroup: cleanText(row['Course Group']),
    courseName,
    issueDate: parseDateText(row['Completion Date']) || parseDateText(row['Enrolment Date']),
    organizingAgency: normalizeIssuer(row['Organizing Agency']),
    venue: cleanText(row.Venue),
    ...getCompetencyFields(row),
    remarks: cleanText(row.Remarks),
    sourceFile: source.file,
    sourceSheet: source.sheet
  };
};

const mapAnnualThaiRow = (row, source) => {
  const fullName = cleanText(getFirst(row, ['ชื่อ', 'ชื่อ - สกุล', 'Full Name']));
  const courseName = cleanText(getFirst(row, [
    'หลักสูตร/หัวข้อเรื่อง ประชุม/ฝึกอบรม/สัมมนา',
    'หัวข้อประชุม/อบรม',
    'Course Name'
  ]));

  if (!fullName || !courseName) return null;

  return {
    fullName,
    position: cleanText(getFirst(row, ['ตำแหน่ง', 'Position'])),
    division: cleanText(getFirst(row, ['กลุ่ม/ฝ่าย', 'ฝ่าย/กลุ่ม', 'Division'])),
    courseType: inferCourseType(row),
    courseGroup: cleanText(getFirst(row, ['รายการ', 'รายละเอียด', 'Course Group'])),
    courseName,
    issueDate: parseDateText(getFirst(row, ['วัน/เดือน/ปี', 'Completion Date']), source.sheet),
    organizingAgency: normalizeIssuer(getFirst(row, ['ผู้จัด', 'Organizing Agency'])),
    venue: cleanText(getFirst(row, ['สถานที่', 'Venue'])),
    remarks: cleanText(getFirst(row, ['หมายเหตุ', 'Remarks'])),
    sourceFile: source.file,
    sourceSheet: source.sheet
  };
};

const mapLegacyThaiRow = (row, source) => {
  const fullName = cleanText(getFirst(row, ['ชื่อ - สกุล', 'ชื่อ', 'Full Name']));
  const courseName = cleanText(getFirst(row, ['หัวข้อประชุม/อบรม', 'หลักสูตร/หัวข้อเรื่อง ประชุม/ฝึกอบรม/สัมมนา', 'Course Name']));
  if (!fullName || !courseName) return null;

  const month = parseThaiMonth(getFirst(row, ['เดือน']));
  const day = parseDay(getFirst(row, ['วันที่']));
  const year = getFirst(row, ['พ.ศ.']);

  return {
    fullName,
    position: cleanText(getFirst(row, ['ตำแหน่ง', 'Position'])),
    division: '',
    courseType: inferCourseType(row),
    courseGroup: '',
    courseName,
    issueDate: buildDate(year, month, day),
    organizingAgency: normalizeIssuer(getFirst(row, ['ผู้จัด', 'Organizing Agency'])),
    venue: cleanText(getFirst(row, ['สถานที่', 'Venue'])),
    remarks: '',
    sourceFile: source.file,
    sourceSheet: source.sheet
  };
};

const detectAndMapRow = (row, source) => {
  if (row['Full Name'] !== undefined && row['Course Name'] !== undefined) {
    return mapStandardRow(row, source);
  }

  if (row['หัวข้อประชุม/อบรม'] !== undefined) {
    return mapLegacyThaiRow(row, source);
  }

  return mapAnnualThaiRow(row, source);
};

const readTrainingRecords = (excelPaths) => {
  const records = [];
  const rejected = [];

  for (const excelPath of excelPaths) {
    if (!fs.existsSync(excelPath)) {
      throw new Error(`File not found: ${excelPath}`);
    }

    const wb = xlsx.readFile(excelPath, { cellDates: true });
    for (const sheetName of wb.SheetNames) {
      if (/^list$/i.test(sheetName)) continue;

      const rows = tableRowsFromSheet(wb.Sheets[sheetName]);
      for (const row of rows) {
        const mapped = detectAndMapRow(row, {
          file: path.basename(excelPath),
          sheet: sheetName
        });

        if (mapped) {
          records.push(mapped);
        } else if (Object.values(row).some((value) => cleanText(value))) {
          rejected.push({ sourceFile: path.basename(excelPath), sourceSheet: sheetName, row });
        }
      }
    }
  }

  return { records, rejected };
};

const writeMappedWorkbook = (records, outputPath, userMap = null) => {
  const rows = records.map((record) => [
    userMap ? (userMap.has(normalizeName(record.fullName)) ? 'MATCHED' : 'UNMATCHED') : '',
    record.fullName,
    record.position,
    record.division,
    record.courseType,
    record.courseGroup,
    record.courseName,
    formatDateForExcel(record.issueDate),
    record.organizingAgency,
    record.venue,
    record.competencyCodes,
    record.competencyNames,
    record.competencyLevels,
    record.competencyNotes,
    record.remarks,
    record.sourceFile,
    record.sourceSheet
  ]);

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.aoa_to_sheet([OUTPUT_HEADERS, ...rows]);
  ws['!cols'] = [16, 28, 26, 24, 16, 22, 70, 18, 34, 34, 24, 30, 18, 34, 34, 34, 18].map((wch) => ({ wch }));
  xlsx.utils.book_append_sheet(wb, ws, 'Mapped Training Records');
  xlsx.writeFile(wb, outputPath);
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((arg) => arg.startsWith('--')));
  const values = args.filter((arg) => !arg.startsWith('--'));
  const outIndex = args.findIndex((arg) => arg === '--out');
  const outputPath = outIndex >= 0 ? args[outIndex + 1] : null;

  return {
    excelPaths: values.filter((value) => value !== outputPath),
    dryRun: flags.has('--dry-run') || flags.has('--map-only'),
    outputPath
  };
};

const buildUserMap = async () => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true }
  });

  return new Map(users.map((user) => [normalizeName(user.name), user.id]));
};

const importRecords = async (records, userMap) => {
  let insertedCount = 0;
  let skippedCount = 0;
  let notFoundCount = 0;

  for (const record of records) {
    const userId = userMap.get(normalizeName(record.fullName));
    if (!userId) {
      notFoundCount++;
      continue;
    }

    const existing = await prisma.userCertificate.findFirst({
      where: {
        userId,
        title: record.courseName,
        issuer: record.organizingAgency
      }
    });

    if (existing) {
      skippedCount++;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const certificate = await tx.userCertificate.create({
        data: {
          userId,
          title: record.courseName,
          issuer: record.organizingAgency,
          issueDate: record.issueDate,
          noExpiration: true,
          trainingType: record.courseType || 'external',
          trainingItem: record.courseGroup || 'unclassified',
          trainingDetails: record.remarks || null,
          trainingVenue: record.venue || null
        }
      });

      let { mappings } = await resolveImportedCompetencyMappings(tx, {
        codes: record.competencyCodes,
        names: record.competencyNames,
        levels: record.competencyLevels,
        notes: record.competencyNotes
      });

      if (mappings.length === 0) {
        // Find or create group UNCLASSIFIED
        let group = await tx.competencyGroup.findUnique({ where: { code: 'UNCLASSIFIED' } });
        if (!group) {
          group = await tx.competencyGroup.create({
            data: {
              code: 'UNCLASSIFIED',
              name: 'Unclassified Group',
              description: 'Group for unclassified competency mappings'
            }
          });
        }
        
        // Find or create category UNCLASSIFIED
        let category = await tx.competencyCategory.findUnique({ where: { code: 'UNCLASSIFIED' } });
        if (!category) {
          category = await tx.competencyCategory.create({
            data: {
              groupId: group.id,
              code: 'UNCLASSIFIED',
              name: 'Unclassified Category',
              description: 'Category for unclassified competency mappings'
            }
          });
        }

        // Find or create competency UNCLASSIFIED
        let competency = await tx.competency.findUnique({ where: { code: 'UNCLASSIFIED' } });
        if (!competency) {
          competency = await tx.competency.create({
            data: {
              categoryId: category.id,
              code: 'UNCLASSIFIED',
              name: 'Unclassified',
              description: 'Unclassified competency mapping'
            }
          });
          
          await tx.competencyLevel.create({
            data: {
              competencyId: competency.id,
              level: 1,
              label: 'Level 1',
              description: 'Default Level'
            }
          });
        }

        mappings.push({
          competencyId: competency.id,
          requiredLevel: 1,
          note: 'Auto-mapped unclassified training record'
        });
      }

      await saveUserCertificateCompetencies(tx, certificate.id, mappings);
    });

    insertedCount++;
  }

  return { insertedCount, skippedCount, notFoundCount };
};

async function importExternalTrainings() {
  const { excelPaths, dryRun, outputPath } = parseArgs();
  const inputs = excelPaths.length > 0 ? excelPaths : ['external_training_report.xlsx'];

  try {
    console.log(`Reading ${inputs.length} training workbook(s)...`);
    const { records, rejected } = readTrainingRecords(inputs);
    console.log(`Mapped records: ${records.length}`);
    console.log(`Rejected non-empty rows: ${rejected.length}`);

    const userMap = await buildUserMap();
    const matchedCount = records.filter((record) => userMap.has(normalizeName(record.fullName))).length;
    const unmatchedNames = [...new Set(
      records
        .filter((record) => !userMap.has(normalizeName(record.fullName)))
        .map((record) => record.fullName)
    )].sort((a, b) => a.localeCompare(b, 'th'));

    console.log(`Matched users: ${matchedCount}`);
    console.log(`Unmatched records: ${records.length - matchedCount}`);
    if (unmatchedNames.length > 0) {
      console.log(`Unmatched names (${Math.min(unmatchedNames.length, 20)} of ${unmatchedNames.length}):`);
      unmatchedNames.slice(0, 20).forEach((name) => console.log(`- ${name}`));
    }

    if (outputPath) {
      writeMappedWorkbook(records, outputPath, userMap);
      console.log(`Mapped workbook written to: ${outputPath}`);
    }

    if (dryRun) {
      console.log('Dry run only. No database records were inserted.');
      return;
    }

    const summary = await importRecords(records, userMap);
    console.log('Import Summary');
    console.log(`Inserted: ${summary.insertedCount}`);
    console.log(`Skipped duplicates: ${summary.skippedCount}`);
    console.log(`Users not found: ${summary.notFoundCount}`);
  } catch (error) {
    console.error('Import failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

importExternalTrainings();
