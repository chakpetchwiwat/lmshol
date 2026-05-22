const prisma = require('../../../utils/prisma');
const xlsx = require('xlsx');

const exportUserTrainings = async (actor) => {
  // Fetch users with their system certificates and external certificates
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      position: true,
      certificates: { // internal system certificates
        select: {
          title: true,
          issueDate: true,
          course: {
            select: {
              category: {
                select: { name: true }
              }
            }
          }
        }
      },
      issuedCertificates: { // external certificates
        select: {
          title: true,
          issuer: true,
          issueDate: true
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  const rows = [];

  for (const user of users) {
    // 1. Process internal system certificates
    if (user.certificates && user.certificates.length > 0) {
      for (const cert of user.certificates) {
        rows.push({
          'ชื่อ-นามสกุล': user.name || '-',
          'อีเมล': user.email || '-',
          'แผนก': user.department || '-',
          'ตำแหน่ง': user.position || '-',
          'ชื่อหลักสูตรการอบรม': cert.title || '-',
          'ประเภท': cert.course?.category?.name || 'ระบบ LMS',
          'ผู้จัด': 'LMS System',
          'วันที่สำเร็จการศึกษา': cert.issueDate ? new Date(cert.issueDate).toLocaleDateString('th-TH') : '-'
        });
      }
    }

    // 2. Process external certificates
    if (user.issuedCertificates && user.issuedCertificates.length > 0) {
      for (const cert of user.issuedCertificates) {
        rows.push({
          'ชื่อ-นามสกุล': user.name || '-',
          'อีเมล': user.email || '-',
          'แผนก': user.department || '-',
          'ตำแหน่ง': user.position || '-',
          'ชื่อหลักสูตรการอบรม': cert.title || '-',
          'ประเภท': 'ภายนอก',
          'ผู้จัด': cert.issuer || '-',
          'วันที่สำเร็จการศึกษา': cert.issueDate ? new Date(cert.issueDate).toLocaleDateString('th-TH') : '-'
        });
      }
    }

    // If user has no trainings, we might still want them in the report, or not.
    // Usually training reports only list trainings. But if you want a complete list:
    if ((!user.certificates || user.certificates.length === 0) && (!user.issuedCertificates || user.issuedCertificates.length === 0)) {
       rows.push({
          'ชื่อ-นามสกุล': user.name || '-',
          'อีเมล': user.email || '-',
          'แผนก': user.department || '-',
          'ตำแหน่ง': user.position || '-',
          'ชื่อหลักสูตรการอบรม': 'ยังไม่มีประวัติการอบรม',
          'ประเภท': '-',
          'ผู้จัด': '-',
          'วันที่สำเร็จการศึกษา': '-'
        });
    }
  }

  // Create Excel workbook
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(rows);

  // Auto-size columns slightly
  const wscols = [
    { wch: 25 }, // Name
    { wch: 25 }, // Email
    { wch: 20 }, // Dept
    { wch: 20 }, // Position
    { wch: 50 }, // Course
    { wch: 15 }, // Type
    { wch: 25 }, // Issuer
    { wch: 15 }  // Date
  ];
  ws['!cols'] = wscols;

  xlsx.utils.book_append_sheet(wb, ws, 'Training Report');
  
  // Return buffer
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

module.exports = {
  exportUserTrainings
};
