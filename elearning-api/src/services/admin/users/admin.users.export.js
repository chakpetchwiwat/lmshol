const prisma = require('../../../utils/prisma');
const authHelpers = require('../../../utils/auth.helpers');
const xlsx = require('xlsx');

const PROFILE_HEADERS = [
  'Username',
  'Email',
  'First Name',
  'Last Name',
  'Position',
  'Position Level',
  'Division',
  'Sub--division',
  'Educational Level',
  'Qualification Degree Name',
  'Field of Study',
  'Educational Institution',
  'Highest Education Level',
  'Highest Degree Name ',
  'Highest Field of Study ',
  'Highest Educational Institution',
  'Retirement Date',
  'National Identification Number',
  'Position Type',
  'Supervisor Name',
  'CV',
  'Job Description'
];

const TRAINING_HEADERS = [
  'คำนำหน้า',
  'ชื่อ',
  'ตำแหน่ง',
  'กลุ่ม/ฝ่าย',
  'ประเภท',
  'รายการ',
  'รายละเอียด',
  'หลักสูตร/หัวข้อเรื่อง ประชุม/ฝึกอบรม/สัมมนา',
  'วัน/เดือน/ปี',
  'จำนวนวัน',
  'รุ่นที่',
  'สถานที่',
  'ผู้จัด',
  'หมายเหตุ'
];

const IMPORT_COMPAT_PROFILE_HEADERS = [
  'Username',
  'Email',
  'First Name',
  'Last Name',
  'Position',
  'Position Level',
  'Division',
  'Sub-division',
  'Educational Level',
  'Qualification Degree Name',
  'Field of Study',
  'Educational Institution',
  'Highest Education Level',
  'Highest Degree Name',
  'Highest Field of Study',
  'Highest Educational Institution',
  'Retirement Date',
  'National Identification Number',
  'Position Type',
  'Supervisor Name',
  'Password',
  'CV',
  'Job Description',
  'Role 1',
  'Role 2',
  'Role 3'
];

const IMPORT_COMPAT_TRAINING_HEADERS = [
  'Email',
  'Full Name',
  'Course Name',
  'Organizing Agency',
  'Completion Date',
  'Number of Days',
  'Intake No.',
  'Venue',
  'Course Group',
  'Course Type',
  'Training Details',
  'Competency Codes',
  'Competency Levels',
  'Competency Notes',
  'Remarks'
];

const empty = (value, fallback = '-') => {
  if (value === undefined || value === null || value === '') return fallback;
  return value;
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const splitName = (name = '') => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
};

const usernameFromEmail = (email = '') => String(email || '').split('@')[0] || '';

const normalizeJsonArray = (value) => (Array.isArray(value) ? value : []);

const getFirstEducation = (user) => {
  if (user.educationHistory && !Array.isArray(user.educationHistory)) {
    return {
      degree: user.educationHistory.level || '',
      degreeName: user.educationHistory.degreeName || '',
      major: user.educationHistory.fieldOfStudy || '',
      institution: user.educationHistory.institution || ''
    };
  }
  return normalizeJsonArray(user.educationHistory)[0] || {};
};

const getHighestEducation = (user) => {
  if (user.educationHistory && !Array.isArray(user.educationHistory)) {
    return {
      degree: user.educationHistory.highestLevel || '',
      degreeName: user.educationHistory.highestDegreeName || '',
      major: user.educationHistory.highestFieldOfStudy || '',
      institution: user.educationHistory.highestInstitution || ''
    };
  }
  const history = normalizeJsonArray(user.educationHistory);
  return history[history.length - 1] || history[0] || {};
};

const findProfileFile = (user, patterns) => {
  if (user.profileFiles && !Array.isArray(user.profileFiles)) {
    if (patterns.includes('cv')) return user.profileFiles.cv || '';
    if (patterns.includes('jd')) return user.profileFiles.jobDescription || '';
  }
  const files = normalizeJsonArray(user.profileFiles);
  const matched = files.find((file) => {
    const haystack = `${file.title || ''} ${file.fileName || ''} ${file.fileUrl || ''} ${file.fileKey || ''}`.toLowerCase();
    return patterns.some((pattern) => haystack.includes(pattern));
  });
  return matched?.fileUrl || matched?.fileName || matched?.fileKey || '';
};

const findProfileFileLink = (user, patterns, frontendUrl) => {
  if (user.profileFiles && !Array.isArray(user.profileFiles)) {
    let fileUrl = '';
    let fileName = '';
    if (patterns.includes('cv')) {
      fileUrl = user.profileFiles.cv || '';
      fileName = 'CV';
    } else if (patterns.includes('jd')) {
      fileUrl = user.profileFiles.jobDescription || '';
      fileName = 'Job Description';
    }
    if (fileUrl) {
      const fileKey = fileUrl.replace(/^\/?uploads\//, '');
      const downloadUrl = `${frontendUrl}/download-file?key=${encodeURIComponent(fileKey)}&name=${encodeURIComponent(fileName)}`;
      return {
        v: fileName,
        l: { Target: downloadUrl, Tooltip: fileName }
      };
    }
    return '';
  }

  const files = normalizeJsonArray(user.profileFiles);
  const matched = files.find((file) => {
    const haystack = `${file.title || ''} ${file.fileName || ''} ${file.fileUrl || ''} ${file.fileKey || ''}`.toLowerCase();
    return patterns.some((pattern) => haystack.includes(pattern));
  });

  if (matched) {
    const fileKey = matched.fileKey || matched.fileUrl || matched.fileName || '';
    const fileName = matched.fileName || matched.title || 'document';
    const downloadUrl = `${frontendUrl}/download-file?key=${encodeURIComponent(fileKey)}&name=${encodeURIComponent(fileName)}`;
    return {
      v: fileName,
      l: { Target: downloadUrl, Tooltip: fileName }
    };
  }

  return '';
};

const getScopedUsersForExport = async (authUser, extraSelect) => {
  const actor = await authHelpers.getActorContext(prisma, authUser);
  const baseWhere = authHelpers.buildUserManagementWhere(actor);
  const users = await prisma.user.findMany({
    where: {
      AND: [
        baseWhere,
        { permission: { not: 'ADMIN' } }
      ]
    },
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      departmentRef: { select: { name: true } },
      position: true,
      positionLevel: true,
      subdivision: true,
      positionType: true,
      supervisorName: true,
      nationalId: true,
      retirementDateRaw: true,
      educationHistory: true,
      profileFiles: true,
      ...extraSelect
    },
    orderBy: { name: 'asc' }
  });

  return users.sort((a, b) => {
    const aUnreg = String(a.email || '').startsWith('unregistered.user_');
    const bUnreg = String(b.email || '').startsWith('unregistered.user_');
    if (aUnreg && !bUnreg) return 1;
    if (!aUnreg && bUnreg) return -1;
    return 0;
  });
};

const setWorkbookView = (ws, columnWidths, rowHeights = []) => {
  ws['!cols'] = columnWidths.map((wch) => ({ wch }));
  ws['!autofilter'] = { ref: ws['!ref'] };
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  if (rowHeights.length > 0) {
    ws['!rows'] = rowHeights.map((hpt) => ({ hpt }));
  }
};

const createWorkbook = (sheetName, headers, rows, columnWidths, rowHeights = []) => {
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.aoa_to_sheet([headers, ...rows]);
  setWorkbookView(ws, columnWidths, rowHeights);
  xlsx.utils.book_append_sheet(wb, ws, sheetName);
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

const exportUserProfiles = async (actor, frontendUrl = 'http://localhost:3000') => {
  const users = await getScopedUsersForExport(actor, { roles: true });
  
  // Load Cohort Roles for translating keys to names
  const cohortRoles = await prisma.cohortRole.findMany({
    select: { key: true, name: true }
  });
  const roleKeyToName = {};
  for (const r of cohortRoles) {
    roleKeyToName[r.key] = r.name;
  }

  const rows = users.map((user) => {
    const { firstName, lastName } = splitName(user.name);
    const firstEducation = getFirstEducation(user);
    const highestEducation = getHighestEducation(user);

    const userRoleNames = (user.roles || []).map(key => roleKeyToName[key] || key);
    const role1 = userRoleNames[0] || '';
    const role2 = userRoleNames[1] || '';
    const role3 = userRoleNames[2] || '';

    return [
      usernameFromEmail(user.email),
      empty(user.email, ''),
      firstName,
      lastName,
      empty(user.position, ''),
      empty(user.positionLevel, ''),
      empty(user.departmentRef?.name || user.department, ''),
      empty(user.subdivision, ''),
      empty(firstEducation.degree, ''),
      empty(firstEducation.degreeName || firstEducation.degree, ''),
      empty(firstEducation.major || firstEducation.faculty, ''),
      empty(firstEducation.institution, ''),
      empty(highestEducation.degree, ''),
      empty(highestEducation.degreeName || highestEducation.degree, ''),
      empty(highestEducation.major || highestEducation.faculty, ''),
      empty(highestEducation.institution, ''),
      empty(user.retirementDateRaw, ''),
      empty(user.nationalId, ''),
      empty(user.positionType, ''),
      empty(user.supervisorName, ''),
      '', // Password remains empty since DB stores one-way bcrypt hashes
      findProfileFileLink(user, ['cv', 'resume', 'ประวัติ'], frontendUrl),
      findProfileFileLink(user, ['job description', 'jd', 'description', 'หน้าที่'], frontendUrl),
      role1,
      role2,
      role3
    ];
  });

  return createWorkbook(
    'users profile',
    IMPORT_COMPAT_PROFILE_HEADERS,
    rows,
    [24, 32, 18, 18, 30, 22, 28, 28, 28, 30, 28, 36, 28, 30, 28, 36, 18, 24, 22, 28, 18, 36, 36, 28, 28, 28]
  );
};

const trainingLine = (items, mapper, fallback = '') => {
  const values = items.map(mapper).filter((value) => value !== undefined && value !== null && value !== '');
  if (values.length === 0) return fallback;
  return values.map((value, index) => `${index + 1}. ${value}`).join('\n\n');
};

const calculateDays = (start, end) => {
  if (!start || !end) return '';
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return '';
  const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? String(diffDays) : '1';
};

const parseNamePrefix = (fullName = '') => {
  const prefixes = ['นายแพทย์', 'แพทย์หญิง', 'นางสาว', 'นาง', 'นาย', 'ดร.', 'ศ.', 'รศ.', 'ผศ.', 'ภก.', 'ภญ.', 'เภสัชกรหญิง', 'เภสัชกร'];
  let prefix = '';
  let name = fullName.trim();
  for (const p of prefixes) {
    if (name.startsWith(p)) {
      prefix = p;
      name = name.slice(p.length).trim();
      break;
    }
  }
  return { prefix, name };
};

const formatCompetencyCodes = (mappings = []) => mappings
  .map((mapping) => mapping.competency?.code)
  .filter(Boolean)
  .join('; ');

const formatCompetencyLevels = (mappings = []) => mappings
  .map((mapping) => mapping.requiredLevel)
  .filter((level) => level !== undefined && level !== null && level !== '')
  .join('; ');

const formatCompetencyNotes = (mappings = []) => mappings
  .map((mapping) => mapping.note)
  .filter(Boolean)
  .join('; ');

const buildTrainingItems = (user) => {
  const { prefix, name } = parseNamePrefix(user.name || '');
  let position = user.position || '';
  const level = user.positionLevel || '';
  if (level && !position.includes(level)) {
    position = position + level;
  }
  const department = user.departmentRef?.name || user.department || '';

  const systemItems = (user.issuedCertificates || []).map((cert) => {
    const formattedDate = formatDate(cert.issuedAt);
    const courseCompetencies = cert.course?.competencies || [];
    return {
      email: user.email || '',
      fullName: user.name || '',
      prefix,
      name,
      position,
      department,
      type: 'ภายใน',
      item: 'อบรม',
      details: '',
      courseName: cert.course?.title || '',
      date: formattedDate,
      days: '',
      intake: '',
      venue: 'Online (e-Learning)',
      organizer: 'LMS System',
      competencyCodes: formatCompetencyCodes(courseCompetencies),
      competencyLevels: formatCompetencyLevels(courseCompetencies),
      competencyNotes: formatCompetencyNotes(courseCompetencies),
      remarks: cert.certificateNo ? `Certificate No. ${cert.certificateNo}` : ''
    };
  });

  const externalItems = (user.certificates || []).map((cert) => {
    const formattedDate = formatDate(cert.issueDate);
    return {
      email: user.email || '',
      fullName: user.name || '',
      prefix,
      name,
      position,
      department,
      type: cert.trainingType || 'ภายนอก',
      item: cert.trainingItem || 'อบรม',
      details: cert.trainingDetails || '',
      courseName: cert.title || '',
      date: formattedDate,
      days: cert.trainingDays || '',
      intake: cert.intakeNo || '',
      venue: cert.trainingVenue || '',
      organizer: cert.issuer || '',
      competencyCodes: formatCompetencyCodes(cert.competencies || []),
      competencyLevels: formatCompetencyLevels(cert.competencies || []),
      competencyNotes: formatCompetencyNotes(cert.competencies || []),
      remarks: cert.credentialId || cert.credentialUrl || ''
    };
  });

  return [...systemItems, ...externalItems].filter((item) => item.courseName);
};

const exportUserTrainings = async (actor) => {
  const users = await getScopedUsersForExport(actor, {
    issuedCertificates: {
      where: { status: 'VALID' },
      select: {
        certificateNo: true,
        issuedAt: true,
        course: {
          select: {
            title: true,
            category: { select: { name: true } },
            competencies: {
              select: {
                requiredLevel: true,
                note: true,
                competency: { select: { code: true, name: true } }
              }
            }
          }
        }
      },
      orderBy: { issuedAt: 'desc' }
    },
    certificates: {
      select: {
        title: true,
        issuer: true,
        issueDate: true,
        expirationDate: true,
        credentialId: true,
        credentialUrl: true,
        trainingType: true,
        trainingItem: true,
        trainingDetails: true,
        trainingVenue: true,
        trainingDays: true,
        intakeNo: true,
        competencies: {
          select: {
            requiredLevel: true,
            note: true,
            competency: { select: { code: true, name: true } }
          }
        }
      },
      orderBy: { issueDate: 'desc' }
    }
  });

  const hasTrainingRows = [];
  const noTrainingRows = [];
  users.forEach((user) => {
    const items = buildTrainingItems(user);
    if (items.length === 0) {
      const { prefix, name } = parseNamePrefix(user.name || '');
      noTrainingRows.push([
        user.email || '',
        user.name || [prefix, name].filter(Boolean).join(' '),
        '',
        '',
        '',
        '',
        '',
        'ยังไม่มีประวัติการอบรม',
        '',
        '',
        '',
        '',
        '',
        ''
      ]);
    } else {
      items.forEach((item) => {
        hasTrainingRows.push([
          item.email,
          item.fullName,
          item.courseName,
          item.organizer,
          item.date,
          item.days,
          item.intake,
          item.venue,
          item.item,
          item.type,
          item.details,
          item.competencyCodes,
          item.competencyLevels,
          item.competencyNotes,
          item.remarks
        ]);
      });
    }
  });

  const rows = [
    ...hasTrainingRows,
    ...noTrainingRows.map((row) => {
      const normalized = [...row];
      while (normalized.length < IMPORT_COMPAT_TRAINING_HEADERS.length) {
        normalized.push('');
      }
      normalized[7] = '';
      normalized[14] = 'ยังไม่มีประวัติการอบรม';
      return normalized;
    })
  ];

  return createWorkbook(
    'Training Report',
    IMPORT_COMPAT_TRAINING_HEADERS,
    rows,
    [15, 30, 50, 25, 15, 15, 15, 25, 18, 18, 25, 20, 18, 25, 25]
  );
};

const exportSingleUser = async (id, authUser) => {
  const detailsService = require('./admin.users.details');
  const detail = await detailsService.getUserDetails(id, authUser);
  if (!detail) throw new Error('User not found');

  // Sheet 1: ข้อมูลทั่วไป (General Info)
  const profileHeaders = ['หัวข้อ', 'ข้อมูล'];
  const firstEdu = getFirstEducation(detail);
  const highestEdu = getHighestEducation(detail);

  const profileRows = [
    ['ชื่อ-นามสกุล', detail.name || '-'],
    ['อีเมล', detail.email || '-'],
    ['เลขประจำตัวประชาชน', detail.nationalId || '-'],
    ['แผนก', detail.department || '-'],
    ['กลุ่มงาน', detail.subdivision || '-'],
    ['ตำแหน่ง', detail.position || '-'],
    ['ระดับ', detail.tier?.name || detail.tier || '-'],
    ['ประเภทตำแหน่ง', detail.positionType || '-'],
    ['หัวหน้างาน', detail.supervisorName || '-'],
    ['วันเริ่มงาน', formatDate(detail.employmentDate)],
    ['วันเกษียณอายุ', detail.retirementDateRaw || '-'],
    ['แต้มคงเหลือ', String(detail.pointsBalance || 0)],
    // ประวัติการศึกษา
    ['ระดับการศึกษา', firstEdu.degree || firstEdu.degreeName || '-'],
    ['วุฒิการศึกษา', firstEdu.degreeName || firstEdu.degree || '-'],
    ['สาขาวิชา', firstEdu.major || firstEdu.faculty || '-'],
    ['สถาบันการศึกษา', firstEdu.institution || '-'],
    // ประวัติการศึกษาสูงสุด
    ['ระดับการศึกษาสูงสุด', highestEdu.degree || highestEdu.highestLevel || '-'],
    ['วุฒิการศึกษาสูงสุด', highestEdu.degreeName || highestEdu.highestDegreeName || '-'],
    ['สาขาวิชาสูงสุด', highestEdu.major || highestEdu.highestFieldOfStudy || '-'],
    ['สถาบันการศึกษาสูงสุด', highestEdu.institution || highestEdu.highestInstitution || '-']
  ];

  // Sheet 2: ประวัติการเรียน (Learning History)
  const learningHeaders = ['คอร์ส', 'หมวดหมู่', 'เริ่มเรียน', 'สำเร็จเมื่อ', 'ความคืบหน้า', 'สถานะ'];
  const learningRows = (detail.enrollments || []).map(item => [
    item.course?.title || '-',
    item.course?.categoryName || '-',
    item.startedAt ? formatDate(item.startedAt) : '-',
    item.completedAt ? formatDate(item.completedAt) : '-',
    `${Math.round(item.progressPercent || 0)}%`,
    item.status === 'COMPLETED' ? 'เรียนจบแล้ว' : 'กำลังเรียน'
  ]);

  // Sheet 3: ประวัติ Point
  const pointsHeaders = ['ประเภท', 'ที่มา/การใช้งาน', 'หมายเหตุ', 'Point', 'เวลา'];
  const pointsRows = (detail.pointsHistory || []).map(item => [
    item.points >= 0 ? 'ได้รับแต้ม' : 'ใช้แต้ม',
    item.sourceLabel || '-',
    item.note || '-',
    String(item.points),
    item.createdAt ? formatDate(item.createdAt) : '-'
  ]);

  // Sheet 4: ประวัติการอบรม (Training History)
  const certHeaders = ['หลักสูตร / หัวข้อ', 'ประเภท', 'ผู้จัด / ผู้ออก', 'เลขที่ใบเซอร์ / รายละเอียด', 'วันที่ได้รับ', 'จำนวนวัน', 'รุ่นที่', 'สถานที่', 'หมายเหตุ'];
  
  const systemCerts = (detail.systemCertificates || []).map(cert => [
    cert.courseTitle || '-',
    'ภายใน',
    'LMS System',
    cert.certificateNo || '-',
    cert.issuedAt ? formatDate(cert.issuedAt) : '-',
    '-',
    '-',
    'Online (e-Learning)',
    ''
  ]);
  
  const externalCerts = (detail.externalCertificates || []).map(cert => [
    cert.title || '-',
    cert.trainingType || 'ภายนอก',
    cert.issuer || '-',
    cert.credentialId || cert.trainingDetails || '-',
    cert.issueDate ? formatDate(cert.issueDate) : '-',
    cert.trainingDays || '-',
    cert.intakeNo || '-',
    cert.trainingVenue || '-',
    cert.remarks || ''
  ]);
  
  const certRows = [...systemCerts, ...externalCerts];

  // Build Workbook
  const wb = xlsx.utils.book_new();

  // Helper to add sheet
  const addSheet = (sheetName, headers, rows, colWidths) => {
    const ws = xlsx.utils.aoa_to_sheet([headers, ...rows]);
    setWorkbookView(ws, colWidths);
    xlsx.utils.book_append_sheet(wb, ws, sheetName);
  };

  addSheet('ข้อมูลทั่วไป', profileHeaders, profileRows, [25, 45]);
  addSheet('ประวัติการเรียน', learningHeaders, learningRows, [45, 25, 18, 18, 15, 15]);
  addSheet('ประวัติ Point', pointsHeaders, pointsRows, [15, 35, 30, 12, 18]);
  addSheet('ประวัติการอบรม', certHeaders, certRows, [45, 15, 25, 30, 18, 12, 12, 25, 20]);

  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return { name: detail.name, buffer };
};

module.exports = {
  exportUserProfiles,
  exportUserTrainings,
  exportSingleUser
};
