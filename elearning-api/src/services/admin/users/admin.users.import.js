const prisma = require('../../../utils/prisma');
const bcrypt = require('bcryptjs');
const xlsx = require('xlsx');
const {
  resolveImportedCompetencyMappings,
  saveUserCertificateCompetencies
} = require('../admin.competencies');

const PROFILE_MAPPING = {
  username: ['username', 'ชื่อผู้ใช้', 'user name', 'user'],
  email: ['email', 'อีเมล', 'e-mail', 'mail'],
  name: ['name', 'ชื่อ-นามสกุล', 'ชื่อนามสกุล', 'ชื่อ นามสกุล', 'fullname', 'full name'],
  firstName: ['first name', 'ชื่อ', 'ชื่อจริง', 'firstname'],
  lastName: ['last name', 'นามสกุล', 'lastname'],
  position: ['position', 'ตำแหน่ง'],
  positionLevel: ['position level', 'ระดับ', 'ระดับตำแหน่ง', 'level', 'positionlevel'],
  division: ['division', 'แผนก', 'กอง', 'ฝ่าย', 'division/department', 'department'],
  subdivision: ['sub-division', 'sub--division', 'subdivision', 'กลุ่มงาน', 'ฝ่ายย่อย'],
  educationalLevel: ['educational level', 'ระดับการศึกษา', 'การศึกษา'],
  degreeName: ['qualification degree name', 'วุฒิการศึกษา', 'ชื่อวุฒิ'],
  fieldOfStudy: ['field of study', 'สาขา', 'สาขาวิชา'],
  institution: ['educational institution', 'สถาบัน', 'มหาวิทยาลัย', 'สถาบันการศึกษา'],
  highestLevel: ['highest education level', 'ระดับการศึกษาสูงสุด'],
  highestDegreeName: ['highest degree name', 'วุฒิการศึกษาสูงสุด'],
  highestFieldOfStudy: ['highest field of study', 'สาขาสูงสุด', 'สาขาวิชาสูงสุด'],
  highestInstitution: ['highest educational institution', 'สถาบันการศึกษาสูงสุด', 'มหาวิทยาลัยสูงสุด'],
  retirementDate: ['retirement date', 'วันเกษียณอายุ', 'วันเกษียณ', 'retirementdate'],
  nationalId: ['national identification number', 'เลขบัตรประชาชน', 'เลขประจำตัวประชาชน', 'national id', 'citizen id', 'nationalid'],
  positionType: ['position type', 'ประเภทตำแหน่ง', 'ประเภทพนักงาน', 'positiontype'],
  supervisorName: ['supervisor name', 'หัวหน้างาน', 'ชื่อหัวหน้า', 'supervisorname'],
  password: ['password', 'รหัสผ่าน']
};

const TRAINING_MAPPING = {
  email: ['email', 'อีเมล', 'e-mail', 'mail'],
  fullName: ['full name', 'ชื่อ-นามสกุล', 'ชื่อ นามสกุล', 'ชื่อ', 'name'],
  courseName: ['course name', 'course', 'หลักสูตร', 'หลักสูตร/หัวข้อเรื่อง ประชุม/ฝึกอบรม/สัมมนา', 'หัวข้อ', 'ชื่อหลักสูตร', 'coursename'],
  organizingAgency: ['organizing agency', 'ผู้จัด', 'หน่วยงานผู้จัด', 'organizer', 'issuer', 'organizingagency'],
  completionDate: ['completion date', 'วัน/เดือน/ปี', 'วันที่เรียนจบ', 'วันที่อบรม', 'completion date/enrolment date', 'issue date', 'completiondate', 'enrolment date', 'completiondate', 'date'],
  numberOfDays: ['number of days', 'จำนวนวัน', 'days', 'numberofdays'],
  intakeNo: ['intake no.', 'รุ่นที่', 'รุ่น', 'intake no', 'intake', 'intakeno'],
  venue: ['venue', 'สถานที่', 'สถานที่อบรม'],
  courseGroup: ['course group', 'ประเภท', 'กลุ่มหลักสูตร', 'coursegroup'],
  courseType: ['course type', 'รายละเอียด', 'ประเภทหลักสูตร', 'coursetype'],
  remarks: ['remarks', 'หมายเหตุ', 'remark']
};

Object.assign(TRAINING_MAPPING, {
  courseType: ['course type', 'รายการ', 'ประเภทหลักสูตร', 'coursetype'],
  trainingDetails: ['training details', 'details', 'รายละเอียด', 'trainingdetails'],
  competencyCodes: ['competency codes', 'competency code', 'competency_code', 'competencycode', 'gbt competency code', 'gbt code'],
  competencyNames: ['competency names', 'competency name', 'competency_name', 'competencyname', 'gbt competency name'],
  competencyLevels: ['competency levels', 'competency level', 'required level', 'level', 'competencylevel', 'gbt level'],
  competencyNotes: ['competency notes', 'competency note', 'competency_note', 'note']
});

const namePrefixes = [
  'นางสาว', 'นาง', 'นาย', 'นายแพทย์', 'แพทย์หญิง', 'ดร.', 'นพ.', 'พญ.',
  'ทพ.', 'ทพญ.', 'เภสัชกรหญิง', 'เภสัชกร', 'ภญ.', 'ภก.', 'คุณ',
  'ว่าที่ร้อยตรีหญิง', 'ว่าที่ร้อยตรี', 'ว่าที่ร้อยเอก', 'ว่าที่ร้อยโท',
  'ศ.ดร.', 'รศ.ดร.', 'ผศ.ดร.', 'ศ.', 'รศ.', 'ผศ.'
];

function cleanPrefixAndSpaces(name) {
  if (!name) return '';
  let n = String(name).trim();
  for (const p of namePrefixes) {
    if (n.startsWith(p)) {
      n = n.slice(p.length).trim();
      break;
    }
  }
  n = n.replace(/\s+/g, '');
  
  // Align standard database name corrections if user has aliases
  if (n === 'คัคนางค์โตสงวน') return 'คัคนางค์ปอแก้ว';
  if (n === 'อัญชลีจิตรักนที') return 'อัญชลีศรีสวัสดิ์';
  
  return n;
}

function parseExcelDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    // Excel numeric date serialization
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
      year -= 543; // Convert Buddhist Era to CE
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

const findMappedValue = (row, keySynonyms) => {
  const rowKeys = Object.keys(row);
  const matchedKey = rowKeys.find(k => {
    const normalizedKey = k.trim().toLowerCase().replace(/[^a-z0-9ก-๙]/g, '');
    return keySynonyms.some(syn => {
      const normalizedSyn = syn.toLowerCase().replace(/[^a-z0-9ก-๙]/g, '');
      return normalizedKey === normalizedSyn;
    });
  });
  return matchedKey ? row[matchedKey] : undefined;
};

const downloadTemplate = (type) => {
  const wb = xlsx.utils.book_new();
  let headers = [];
  let sampleData = [];
  let sheetName = '';

  if (type === 'profiles') {
    sheetName = 'Template ประวัติผู้เรียน';
    headers = [
      'Username', 'Email', 'First Name', 'Last Name', 'Position', 'Position Level',
      'Division', 'Sub-division', 'Educational Level', 'Qualification Degree Name',
      'Field of Study', 'Educational Institution', 'Highest Education Level',
      'Highest Degree Name', 'Highest Field of Study', 'Highest Educational Institution',
      'Retirement Date', 'National Identification Number', 'Position Type',
      'Supervisor Name', 'Password', 'CV', 'Job Description'
    ];
    sampleData = [
      [
        'somchai.d', 'somchai.d@fda.moph.go.th', 'สมชาย', 'ดีใจ', 'เภสัชกรชำนาญการ', 'ชำนาญการ',
        'กองยา', 'กลุ่มประเมิน', 'ปริญญาตรี', 'เภสัชศาสตรบัณฑิต', 'บริบาลเภสัชกรรม', 'จุฬาลงกรณ์มหาวิทยาลัย',
        'ปริญญาโท', 'เภสัชศาสตรมหาบัณฑิต', 'เภสัชกรรมคลินิก', 'จุฬาลงกรณ์มหาวิทยาลัย',
        '2045-09-30', '1100900123456', 'วิชาการ', 'จีรัง ภมรสูต', 'P@ssword123'
      ]
    ];
  } else if (type === 'trainings') {
    sheetName = 'Template ประวัติอบรม';
    headers = [
      'Email', 'Full Name', 'Course Name', 'Organizing Agency', 'Completion Date',
      'Number of Days', 'Intake No.', 'Venue', 'Course Group', 'Course Type',
      'Training Details', 'Competency Codes', 'Competency Levels', 'Competency Notes', 'Remarks'
    ];
    sampleData = [
      [
        'somchai.d@fda.moph.go.th', 'สมชาย ดีใจ', 'การประเมินความปลอดภัยทางยาขั้นสูง', 'กองยา', '2026-05-20',
        '2', 'รุ่นที่ 5', 'ห้องประชุม 1', 'ภายนอก', 'วิชาการ', 'ผ่านอบรม'
      ]
    ];
  } else {
    throw new Error('Invalid template type');
  }

  if (type === 'trainings') {
    sampleData = sampleData.map((row) => {
      if (row.length !== 11) return row;
      return [
        ...row.slice(0, 10),
        '',
        'GBT-001; GBT-002',
        '2; 3',
        'Column K measurement refs',
        row[10]
      ];
    });
  }

  if (type === 'profiles') {
    sampleData = sampleData.map((row) => {
      if (row.length !== 21) return row;
      return [...row, '', ''];
    });
  }

  const ws = xlsx.utils.aoa_to_sheet([headers, ...sampleData]);
  xlsx.utils.book_append_sheet(wb, ws, sheetName);
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

const importProfiles = async (fileBuffer, forceMustChangePassword = false) => {
  const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet);

  let successCount = 0;
  let errorCount = 0;
  const logs = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // Header is row 1
    
    const emailVal = findMappedValue(row, PROFILE_MAPPING.email);
    if (!emailVal) {
      errorCount++;
      logs.push(`[Row ${rowNum}] Skipped: Missing email address.`);
      continue;
    }
    
    const email = String(emailVal).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errorCount++;
      logs.push(`[Row ${rowNum}] Skipped: Invalid email format (${email}).`);
      continue;
    }

    const usernameVal = findMappedValue(row, PROFILE_MAPPING.username);
    const username = usernameVal ? String(usernameVal).trim() : email.split('@')[0];
    
    const firstName = findMappedValue(row, PROFILE_MAPPING.firstName);
    const lastName = findMappedValue(row, PROFILE_MAPPING.lastName);
    const nameVal = findMappedValue(row, PROFILE_MAPPING.name);
    
    let name = '';
    if (nameVal) {
      name = String(nameVal).trim();
    } else if (firstName || lastName) {
      name = `${String(firstName || '').trim()} ${String(lastName || '').trim()}`.trim();
    } else {
      name = username;
    }

    const position = findMappedValue(row, PROFILE_MAPPING.position);
    const positionLevel = findMappedValue(row, PROFILE_MAPPING.positionLevel);
    const division = findMappedValue(row, PROFILE_MAPPING.division);
    const subdivision = findMappedValue(row, PROFILE_MAPPING.subdivision);
    
    const educationalLevel = findMappedValue(row, PROFILE_MAPPING.educationalLevel);
    const degreeName = findMappedValue(row, PROFILE_MAPPING.degreeName);
    const fieldOfStudy = findMappedValue(row, PROFILE_MAPPING.fieldOfStudy);
    const institution = findMappedValue(row, PROFILE_MAPPING.institution);
    
    const highestLevel = findMappedValue(row, PROFILE_MAPPING.highestLevel);
    const highestDegreeName = findMappedValue(row, PROFILE_MAPPING.highestDegreeName);
    const highestFieldOfStudy = findMappedValue(row, PROFILE_MAPPING.highestFieldOfStudy);
    const highestInstitution = findMappedValue(row, PROFILE_MAPPING.highestInstitution);
    
    const retirementDate = findMappedValue(row, PROFILE_MAPPING.retirementDate);
    const nationalId = findMappedValue(row, PROFILE_MAPPING.nationalId);
    const positionType = findMappedValue(row, PROFILE_MAPPING.positionType);
    const supervisorName = findMappedValue(row, PROFILE_MAPPING.supervisorName);
    const password = findMappedValue(row, PROFILE_MAPPING.password);

    try {
      // 1. Process Division / Department
      let departmentId = null;
      if (division) {
        const divName = String(division).trim();
        let deptObj = await prisma.department.findUnique({ where: { name: divName } });
        if (!deptObj) {
          deptObj = await prisma.department.create({ data: { name: divName } });
        }
        departmentId = deptObj.id;
      }

      // 2. Process Level / Tier
      let tierId = null;
      if (positionLevel) {
        const tierName = String(positionLevel).trim();
        let tierObj = await prisma.tier.findUnique({ where: { name: tierName } });
        if (!tierObj) {
          const maxTier = await prisma.tier.findFirst({ orderBy: { order: 'desc' } });
          const order = maxTier ? maxTier.order + 1 : 0;
          tierObj = await prisma.tier.create({ data: { name: tierName, order } });
        }
        tierId = tierObj.id;
      }

      // 3. Build Education History
      const eduHistory = [];
      if (educationalLevel || degreeName || fieldOfStudy || institution) {
        eduHistory.push({
          id: `imported_edu_${Date.now()}_1`,
          institution: institution ? String(institution).trim() : '',
          degree: degreeName ? String(degreeName).trim() : (educationalLevel ? String(educationalLevel).trim() : ''),
          faculty: '',
          major: fieldOfStudy ? String(fieldOfStudy).trim() : '',
          graduationYear: ''
        });
      }
      if (highestLevel || highestDegreeName || highestFieldOfStudy || highestInstitution) {
        eduHistory.push({
          id: `imported_edu_${Date.now()}_2`,
          institution: highestInstitution ? String(highestInstitution).trim() : '',
          degree: highestDegreeName ? String(highestDegreeName).trim() : (highestLevel ? String(highestLevel).trim() : ''),
          faculty: '',
          major: highestFieldOfStudy ? String(highestFieldOfStudy).trim() : '',
          graduationYear: ''
        });
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        // Update user
        const updateData = {
          name: name || existingUser.name,
          departmentId: departmentId !== undefined ? departmentId : existingUser.departmentId,
          department: division ? String(division).trim() : existingUser.department,
          tierId: tierId !== undefined ? tierId : existingUser.tierId,
          position: positionLevel ? String(positionLevel).trim() : existingUser.position,
          subdivision: subdivision !== undefined ? (subdivision ? String(subdivision).trim() : null) : existingUser.subdivision,
          positionLevel: positionLevel ? String(positionLevel).trim() : existingUser.positionLevel,
          positionType: positionType !== undefined ? (positionType ? String(positionType).trim() : null) : existingUser.positionType,
          supervisorName: supervisorName !== undefined ? (supervisorName ? String(supervisorName).trim() : null) : existingUser.supervisorName,
          nationalId: nationalId !== undefined ? (nationalId ? String(nationalId).trim() : null) : existingUser.nationalId,
          retirementDateRaw: retirementDate !== undefined ? (retirementDate ? String(retirementDate).trim() : null) : existingUser.retirementDateRaw,
        };
        
        if (eduHistory.length > 0) {
          updateData.educationHistory = eduHistory;
        }
        if (password) {
          updateData.password = await bcrypt.hash(String(password), 10);
        }
        if (forceMustChangePassword) {
          updateData.mustChangePassword = true;
        }

        await prisma.user.update({
          where: { id: existingUser.id },
          data: updateData
        });
        successCount++;
        logs.push(`[Row ${rowNum}] Updated existing user: ${name} (${email}).`);
      } else {
        // Create user
        const createData = {
          name: name || username,
          email,
          password: await bcrypt.hash(password ? String(password) : 'P@ssword123', 10),
          mustChangePassword: forceMustChangePassword,
          departmentId,
          department: division ? String(division).trim() : null,
          tierId,
          position: positionLevel ? String(positionLevel).trim() : null,
          subdivision: subdivision ? String(subdivision).trim() : null,
          positionLevel: positionLevel ? String(positionLevel).trim() : null,
          positionType: positionType ? String(positionType).trim() : null,
          supervisorName: supervisorName ? String(supervisorName).trim() : null,
          nationalId: nationalId ? String(nationalId).trim() : null,
          retirementDateRaw: retirementDate ? String(retirementDate).trim() : null,
          educationHistory: eduHistory.length > 0 ? eduHistory : null
        };

        await prisma.user.create({ data: createData });
        successCount++;
        logs.push(`[Row ${rowNum}] Created new user: ${name} (${email}).`);

        // Send Welcome Email
        const EmailService = require('../../email.service');
        EmailService.sendEmail({
          to: email,
          subject: 'ยินดีต้อนรับสู่ระบบการเรียนรู้ LMSFDA',
          templateName: 'welcome',
          data: {
            name: name || username,
            email: email,
            username: username,
            mustChangePassword: forceMustChangePassword
          }
        }).catch(err => console.error('[EmailService] Welcome email failed:', err));
      }
    } catch (err) {
      errorCount++;
      logs.push(`[Row ${rowNum}] Error importing ${name} (${email}): ${err.message}`);
    }
  }

  return { successCount, errorCount, logs };
};

const importTrainings = async (fileBuffer) => {
  const workbook = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet);

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  const logs = [];

  // Pre-load all users to match by name or email
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true
    }
  });

  const usersByNameMap = new Map();
  allUsers.forEach(user => {
    const key = cleanPrefixAndSpaces(user.name);
    if (key && !usersByNameMap.has(key)) {
      usersByNameMap.set(key, user);
    }
  });

  const usersByEmailMap = new Map(allUsers.map(u => [u.email.toLowerCase(), u]));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const emailVal = findMappedValue(row, TRAINING_MAPPING.email);
    const fullNameVal = findMappedValue(row, TRAINING_MAPPING.fullName);

    let matchedUser = null;

    if (emailVal) {
      const email = String(emailVal).trim().toLowerCase();
      matchedUser = usersByEmailMap.get(email);
    }

    if (!matchedUser && fullNameVal) {
      const cleanName = cleanPrefixAndSpaces(fullNameVal);
      matchedUser = usersByNameMap.get(cleanName);
    }

    if (!matchedUser) {
      errorCount++;
      logs.push(`[Row ${rowNum}] Skipped: User not found by Name ("${fullNameVal || ''}") or Email ("${emailVal || ''}").`);
      continue;
    }

    const courseNameVal = findMappedValue(row, TRAINING_MAPPING.courseName);
    if (!courseNameVal) {
      errorCount++;
      logs.push(`[Row ${rowNum}] Skipped: Missing Course / Topic name.`);
      continue;
    }

    const title = String(courseNameVal).trim();
    const issuer = String(findMappedValue(row, TRAINING_MAPPING.organizingAgency) || '-').trim();
    const completionDateVal = findMappedValue(row, TRAINING_MAPPING.completionDate);
    const issueDate = parseExcelDate(completionDateVal);

    if (!issueDate) {
      errorCount++;
      logs.push(`[Row ${rowNum}] Skipped: Missing or invalid completion date.`);
      continue;
    }

    const trainingDays = findMappedValue(row, TRAINING_MAPPING.numberOfDays) ? String(findMappedValue(row, TRAINING_MAPPING.numberOfDays)).trim() : null;
    const intakeNo = findMappedValue(row, TRAINING_MAPPING.intakeNo) ? String(findMappedValue(row, TRAINING_MAPPING.intakeNo)).trim() : null;
    const trainingVenue = findMappedValue(row, TRAINING_MAPPING.venue) ? String(findMappedValue(row, TRAINING_MAPPING.venue)).trim() : null;
    const trainingType = findMappedValue(row, TRAINING_MAPPING.courseGroup) ? String(findMappedValue(row, TRAINING_MAPPING.courseGroup)).trim() : 'ภายนอก';
    const trainingDetails = findMappedValue(row, TRAINING_MAPPING.courseType) ? String(findMappedValue(row, TRAINING_MAPPING.courseType)).trim() : null;
    const importedCourseGroup = findMappedValue(row, TRAINING_MAPPING.courseGroup) ? String(findMappedValue(row, TRAINING_MAPPING.courseGroup)).trim() : null;
    const importedCourseType = findMappedValue(row, TRAINING_MAPPING.courseType) ? String(findMappedValue(row, TRAINING_MAPPING.courseType)).trim() : null;
    const importedTrainingDetails = findMappedValue(row, TRAINING_MAPPING.trainingDetails) ? String(findMappedValue(row, TRAINING_MAPPING.trainingDetails)).trim() : null;
    const externalTrainingType = importedCourseType || 'external';
    const externalTrainingItem = importedCourseGroup || 'unclassified';
    const externalTrainingDetails = importedTrainingDetails || trainingDetails || null;
    const competencyCodes = findMappedValue(row, TRAINING_MAPPING.competencyCodes);
    const competencyNames = findMappedValue(row, TRAINING_MAPPING.competencyNames);
    const competencyLevels = findMappedValue(row, TRAINING_MAPPING.competencyLevels);
    const competencyNotes = findMappedValue(row, TRAINING_MAPPING.competencyNotes);
    const remarks = findMappedValue(row, TRAINING_MAPPING.remarks) ? String(findMappedValue(row, TRAINING_MAPPING.remarks)).trim() : null;

    try {
      // Check for exact duplicates (matching userId, title, and issueDate)
      const existingCert = await prisma.userCertificate.findFirst({
        where: {
          userId: matchedUser.id,
          title,
          issueDate
        }
      });

      if (existingCert) {
        skippedCount++;
        logs.push(`[Row ${rowNum}] Skipped (Duplicate): Course "${title}" on ${issueDate.toISOString().substring(0, 10)} already exists for user ${matchedUser.name}.`);
        continue;
      }

      await prisma.$transaction(async (tx) => {
        const certificate = await tx.userCertificate.create({
          data: {
            userId: matchedUser.id,
            title,
            issuer,
            issueDate,
            trainingDays,
            intakeNo,
            trainingVenue,
            trainingType: externalTrainingType,
            trainingItem: externalTrainingItem,
            trainingDetails: externalTrainingDetails,
            credentialId: remarks
          }
        });

        const { mappings, unmatched } = await resolveImportedCompetencyMappings(tx, {
          codes: competencyCodes,
          names: competencyNames,
          levels: competencyLevels,
          notes: competencyNotes
        });

        await saveUserCertificateCompetencies(tx, certificate.id, mappings);
        if (unmatched.length > 0) {
          logs.push(`[Row ${rowNum}] Warning: Competency not found (${unmatched.join(', ')}).`);
        }
      });
      successCount++;
      logs.push(`[Row ${rowNum}] Imported training for ${matchedUser.name}: "${title}".`);
    } catch (err) {
      errorCount++;
      logs.push(`[Row ${rowNum}] Error importing training: ${err.message}`);
    }
  }

  return { successCount, errorCount, skippedCount, logs };
};

module.exports = {
  downloadTemplate,
  importProfiles,
  importTrainings
};
