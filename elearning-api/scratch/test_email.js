require('dotenv').config();
const EmailService = require('../src/services/email.service');

const run = async () => {
  console.log('--- Testing Welcome Email ---');
  await EmailService.sendEmail({
    to: 'test.user@example.com',
    subject: 'ยินดีต้อนรับสู่ระบบการเรียนรู้ LMSFDA',
    templateName: 'welcome',
    data: {
      name: 'สมชาย ดีใจ',
      email: 'somchai.d@fda.moph.go.th',
      username: 'somchai.d',
      password: 'password123',
      mustChangePassword: true
    }
  });

  console.log('--- Testing Goal Assigned Email ---');
  await EmailService.sendEmail({
    to: 'test.user@example.com',
    subject: 'คุณได้รับมอบหมายเป้าหมายการเรียนรู้ใหม่',
    templateName: 'goal_assigned',
    data: {
      name: 'สมชาย ดีใจ',
      goalTitle: 'การประเมินความปลอดภัยทางยาขั้นสูง',
      goalDescription: 'บทเรียนการทบทวนกระบวนการและเกณฑ์ตรวจประเมินความปลอดภัยของตัวยาใหม่',
      startDate: '5 มิถุนายน 2569',
      expiryDate: '30 มิถุนายน 2569'
    }
  });

  console.log('--- Testing Goal Reminder Email ---');
  await EmailService.sendEmail({
    to: 'test.user@example.com',
    subject: 'แจ้งเตือน: เป้าหมายการเรียนรู้ของคุณใกล้ถึงกำหนดส่ง',
    templateName: 'goal_reminder',
    data: {
      name: 'สมชาย ดีใจ',
      goalTitle: 'การประเมินความปลอดภัยทางยาขั้นสูง',
      goalDescription: 'บทเรียนการทบทวนกระบวนการและเกณฑ์ตรวจประเมินความปลอดภัยของตัวยาใหม่',
      daysRemaining: 3,
      expiryDate: '30 มิถุนายน 2569'
    }
  });

  console.log('--- Testing Assessment Reviewed Email ---');
  await EmailService.sendEmail({
    to: 'test.user@example.com',
    subject: 'ผลตรวจ Assessment ผ่านแล้ว',
    templateName: 'assessment_reviewed',
    data: {
      name: 'สมชาย ดีใจ',
      title: 'ผลตรวจ Assessment ผ่านแล้ว',
      message: 'งาน แบบทดสอบท้ายบทเรียน ในคอร์ส หลักสูตรการวิเคราะห์เคมีภัณฑ์ยา ผ่านการตรวจแล้ว',
      courseTitle: 'หลักสูตรการวิเคราะห์เคมีภัณฑ์ยา',
      lessonTitle: 'แบบทดสอบท้ายบทเรียน',
      isPassed: true,
      score: 8,
      maxScore: 10,
      feedback: 'ตอบคำถามวิเคราะห์ได้ดีมาก ครบถ้วนทุกประเด็น'
    }
  });

  console.log('All email template compilation tests completed.');
};

run();
