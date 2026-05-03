const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const certificateService = require('../src/services/admin/certificate.service');
const path = require('path');
require('dotenv').config();

async function runTest() {
  console.log('--- Starting Certificate E2E Test ---');

  try {
    // 1. Create/Upsert Default Template
    const templateHtml = `
<div class="cert-wrapper">
  <div class="cert-content">
    <div class="cert-header">
      <div class="logo">E-LEARNING</div>
      <h1>ใบประกาศนียบัตร</h1>
      <p>ขอมอบวุฒิบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า</p>
    </div>

    <div class="cert-body">
      <h2 class="learner-name">{{ learner_name }}</h2>
      <p>ได้ผ่านการฝึกอบรมหลักสูตร</p>
      <h3 class="course-name">{{ course_name }}</h3>
      <p>ให้ไว้ ณ วันที่ {{ issued_date }}</p>
    </div>

    <div class="cert-footer">
      <div class="signer">
        <div class="sig-image">
          <img src="{{ signature_image_url }}" style="max-height: 80px; display: block; margin: 0 auto;" />
        </div>
        <div class="sig-line"></div>
        <p class="signer-name">{{ signer_name }}</p>
        <p class="signer-title">{{ signer_title }}</p>
      </div>
      <div class="verify">
        <p>เลขที่ใบประกาศ: {{ certificate_no }}</p>
        <p class="verify-url">{{ verification_url }}</p>
      </div>
    </div>
  </div>
</div>
    `;

    const templateCss = `
@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;700&display=swap');

.cert-wrapper {
  width: 100%;
  height: 100%;
  padding: 40px;
  box-sizing: border-box;
  background-color: #f0f0f0;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: 'Sarabun', sans-serif;
}

.cert-content {
  width: 100%;
  height: 100%;
  background-color: white;
  border: 15px double #1a365d;
  padding: 60px;
  box-sizing: border-box;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 0 30px rgba(0,0,0,0.1);
  position: relative;
}

.cert-content::before {
  content: "";
  position: absolute;
  top: 10px; left: 10px; right: 10px; bottom: 10px;
  border: 2px solid #c0a16b;
  pointer-events: none;
}

.cert-header h1 {
  font-size: 52px;
  color: #1a365d;
  margin: 10px 0;
  letter-spacing: 4px;
}

.cert-header p {
  font-size: 20px;
  color: #4a5568;
}

.learner-name {
  font-size: 48px;
  color: #2d3748;
  margin: 30px 0;
  border-bottom: 2px solid #c0a16b;
  display: inline-block;
  padding: 0 40px;
}

.course-name {
  font-size: 32px;
  color: #1a365d;
  margin: 20px 0;
}

.cert-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 40px;
}

.signer {
  width: 300px;
  text-align: center;
}

.sig-line {
  width: 100%;
  height: 1px;
  background-color: #718096;
  margin: 10px 0;
}

.signer-name {
  font-weight: bold;
  margin: 0;
}

.signer-title {
  font-size: 14px;
  color: #718096;
  margin: 0;
}

.verify {
  text-align: right;
  font-size: 12px;
  color: #a0aec0;
}

.verify-url {
  font-size: 10px;
  word-break: break-all;
  max-width: 250px;
}
    `;

    const template = await prisma.certificateTemplate.upsert({
      where: { id: 'default-landscape-tpl' },
      update: {
        name: "Default Landscape Certificate",
        description: "Default system certificate template",
        orientation: 'LANDSCAPE',
        pageSize: 'A4',
        isDefault: true,
        templateHtml,
        templateCss
      },
      create: {
        id: 'default-landscape-tpl',
        name: "Default Landscape Certificate",
        description: "Default system certificate template",
        orientation: 'LANDSCAPE',
        pageSize: 'A4',
        isDefault: true,
        templateHtml,
        templateCss
      }
    });

    console.log('1. Template seeded:', template.id);

    // 2. Select Course and User
    const courseId = "demo-course-1776772855879-6";
    const userId = "2281cc3b-59f7-40b3-9503-89759cfc1daa";

    // 3. Ensure Primary Instructor
    let instructor = await prisma.courseStaff.findFirst({
      where: { courseId, role: 'instructor', isPrimary: true }
    });

    if (!instructor) {
      console.log('No primary instructor found. Assigning one...');
      const anyUser = await prisma.user.findFirst({ where: { role: 'admin' } });
      if (!anyUser) throw new Error('No admin user found to assign as instructor');
      
      instructor = await prisma.courseStaff.create({
        data: {
          courseId,
          userId: anyUser.id,
          role: 'instructor',
          isPrimary: true
        }
      });
      console.log('Assigned instructor:', anyUser.name);
    }

    // 4. Enable Certificate Setting
    const setting = await prisma.courseCertificateSetting.upsert({
      where: { courseId },
      update: {
        templateId: template.id,
        enabled: true,
        issueMode: 'MANUAL',
        signatureType: 'INSTRUCTOR'
      },
      create: {
        courseId,
        templateId: template.id,
        enabled: true,
        issueMode: 'MANUAL',
        signatureType: 'INSTRUCTOR'
      }
    });

    console.log('2. Certificate settings enabled for course');

    console.log('Ensuring enrollment...');
    await prisma.userCourse.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: { status: 'completed', progressPercent: 100 },
      create: { userId, courseId, status: 'completed', progressPercent: 100 }
    });

    // 5. Issue Certificate (Manual)
    console.log('Issuing certificate...');
    
    // Cleanup any existing active certificate for this user/course to allow retry
    await prisma.certificate.deleteMany({
      where: { userId, courseId }
    });

    const cert = await certificateService.issueCertificate({
      courseId,
      userId,
      manual: true
    });

    console.log('3. Certificate record created (PENDING):', cert.id);
    console.log('   No:', cert.certificateNo);

    // 6. Generate PDF (Real)
    console.log('Generating PDF buffer and uploading...');
    await certificateService.generateCertificatePdfAsync(cert.id);

    // 7. Verify Final Status
    const finalCert = await prisma.certificate.findUnique({
      where: { id: cert.id }
    });

    console.log('4. Final Certificate Status:', finalCert.status);
    console.log('   PDF URL:', finalCert.pdfUrl);

    if (finalCert.status === 'VALID' && finalCert.pdfUrl) {
      console.log('--- TEST SUCCESSFUL ---');
      
      // 8. Verify Public Verification Response
      const verifyResult = await certificateService.verifyCertificate(finalCert.verificationToken);
      console.log('5. Verification Response:', JSON.stringify(verifyResult, null, 2));
    } else {
      console.log('--- TEST FAILED ---');
      console.log('Metadata:', JSON.stringify(finalCert.metadata, null, 2));
    }

  } catch (error) {
    console.error('--- TEST ERROR ---');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
