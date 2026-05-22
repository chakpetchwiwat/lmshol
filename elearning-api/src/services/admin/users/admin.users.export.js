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
  'Full Name',
  'Email',
  'Division',
  'Position',
  'Total Courses',
  'Course Type',
  'Course Group',
  'Course Name',
  'Enrolment Date',
  'Completion Date',
  'Number of Days',
  'Intake No.',
  'Organizing Agency',
  'Venue',
  'Organizing Country',
  'Name of Scholarship',
  'Scholarship Sponsoring Country',
  'Remarks',
  'Transmittal Letter No.',
  'Date of Transmittal Letter',
  'Project Name',
  'Order Number',
  'Order Date'
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

const getFirstEducation = (user) => normalizeJsonArray(user.educationHistory)[0] || {};

const getHighestEducation = (user) => {
  const history = normalizeJsonArray(user.educationHistory);
  return history[history.length - 1] || history[0] || {};
};

const findProfileFile = (user, patterns) => {
  const files = normalizeJsonArray(user.profileFiles);
  const matched = files.find((file) => {
    const haystack = `${file.title || ''} ${file.fileName || ''} ${file.fileUrl || ''} ${file.fileKey || ''}`.toLowerCase();
    return patterns.some((pattern) => haystack.includes(pattern));
  });
  return matched?.fileUrl || matched?.fileName || matched?.fileKey || '';
};

const getScopedUsersForExport = async (authUser, extraSelect) => {
  const actor = await authHelpers.getActorContext(prisma, authUser);
  return prisma.user.findMany({
    where: authHelpers.buildUserManagementWhere(actor),
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

const exportUserProfiles = async (actor) => {
  const users = await getScopedUsersForExport(actor, {});
  const rows = users.map((user) => {
    const { firstName, lastName } = splitName(user.name);
    const firstEducation = getFirstEducation(user);
    const highestEducation = getHighestEducation(user);

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
      empty(firstEducation.degree, ''),
      empty(firstEducation.major || firstEducation.faculty, ''),
      empty(firstEducation.institution, ''),
      empty(highestEducation.degree, ''),
      empty(highestEducation.degree, ''),
      empty(highestEducation.major || highestEducation.faculty, ''),
      empty(highestEducation.institution, ''),
      empty(user.retirementDateRaw, ''),
      empty(user.nationalId, ''),
      empty(user.positionType, ''),
      empty(user.supervisorName, ''),
      findProfileFile(user, ['cv', 'resume', 'ประวัติ']),
      findProfileFile(user, ['job description', 'jd', 'description', 'หน้าที่'])
    ];
  });

  return createWorkbook(
    'users profile',
    PROFILE_HEADERS,
    rows,
    [24, 32, 18, 18, 30, 22, 28, 28, 28, 30, 28, 36, 28, 30, 28, 36, 18, 24, 22, 28, 36, 36]
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

const buildTrainingItems = (user) => {
  const systemItems = (user.issuedCertificates || []).map((cert) => {
    const formattedDate = formatDate(cert.issuedAt);
    return {
      source: 'LMS',
      courseType: 'ประวัติการอบรมในระบบ',
      courseGroup: cert.course?.category?.name || '',
      courseName: cert.course?.title ? `${cert.course.title} - ${formattedDate}` : '',
      enrolmentDate: '',
      completionDate: formattedDate,
      numberOfDays: '',
      intakeNo: '',
      organizingAgency: 'LMS System',
    venue: 'Online',
    organizingCountry: 'ไทย',
    scholarship: '',
    scholarshipCountry: '',
    remarks: cert.certificateNo ? `Certificate No. ${cert.certificateNo}` : '',
    transmittalNo: '',
    transmittalDate: '',
    projectName: '',
    orderNumber: '',
    orderDate: ''
    };
  });

  const externalItems = (user.certificates || []).map((cert) => {
    const formattedDate = formatDate(cert.issueDate);
    return {
      source: 'External',
      courseType: 'ประวัติการอบรมนอกระบบ',
      courseGroup: '',
      courseName: cert.title ? `${cert.title} - ${formattedDate}` : '',
      enrolmentDate: '',
      completionDate: formattedDate,
      numberOfDays: calculateDays(cert.issueDate, cert.expirationDate),
      intakeNo: '',
      organizingAgency: cert.issuer || '',
    venue: '',
    organizingCountry: '',
    scholarship: '',
    scholarshipCountry: '',
    remarks: cert.credentialId || cert.credentialUrl || '',
    transmittalNo: '',
    transmittalDate: '',
    projectName: '',
    orderNumber: '',
    orderDate: ''
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
            category: { select: { name: true } }
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
        credentialUrl: true
      },
      orderBy: { issueDate: 'desc' }
    }
  });

  const rows = users.map((user) => {
    const items = buildTrainingItems(user);
    return [
      empty(user.name, ''),
      empty(user.email, ''),
      empty(user.departmentRef?.name || user.department, ''),
      empty(user.position, ''),
      items.length,
      trainingLine(items, (item) => item.courseType),
      trainingLine(items, (item) => item.courseGroup),
      items.length > 0 ? trainingLine(items, (item) => item.courseName) : 'ยังไม่มีประวัติการอบรม',
      trainingLine(items, (item) => item.enrolmentDate),
      trainingLine(items, (item) => item.completionDate),
      trainingLine(items, (item) => item.numberOfDays),
      trainingLine(items, (item) => item.intakeNo),
      trainingLine(items, (item) => item.organizingAgency),
      trainingLine(items, (item) => item.venue),
      trainingLine(items, (item) => item.organizingCountry),
      trainingLine(items, (item) => item.scholarship),
      trainingLine(items, (item) => item.scholarshipCountry),
      trainingLine(items, (item) => item.remarks),
      trainingLine(items, (item) => item.transmittalNo),
      trainingLine(items, (item) => item.transmittalDate),
      trainingLine(items, (item) => item.projectName),
      trainingLine(items, (item) => item.orderNumber),
      trainingLine(items, (item) => item.orderDate)
    ];
  });

  const rowHeights = [
    24,
    ...rows.map((row) => {
      const lineCount = String(row[7] || '').split('\n').length;
      return Math.min(240, Math.max(28, lineCount * 20));
    })
  ];

  return createWorkbook(
    'External Training Report',
    TRAINING_HEADERS,
    rows,
    [26, 30, 24, 26, 12, 22, 28, 70, 24, 24, 14, 16, 34, 34, 20, 28, 28, 36, 24, 24, 28, 18, 18],
    rowHeights
  );
};

module.exports = {
  exportUserProfiles,
  exportUserTrainings
};
