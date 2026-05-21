const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const userProgress = require('../src/services/user/user.progress');
const certificateService = require('../src/services/admin/certificate.service');
require('dotenv').config();

async function runAutoTest() {
  console.log('--- Starting Certificate Auto-Issue Test ---');

  try {
    const courseId = "demo-course-1776772855879-6";
    const userId = "2281cc3b-59f7-40b3-9503-89759cfc1daa";

    // 1. Set to AUTOMATIC mode
    await prisma.courseCertificateSetting.update({
      where: { courseId },
      data: { issueMode: 'AUTOMATIC', enabled: true }
    });
    console.log('1. Set course to AUTOMATIC issuance');

    // 2. Reset Enrollment
    await prisma.userCourse.update({
      where: { userId_courseId: { userId, courseId } },
      data: { status: 'IN_PROGRESS', progressPercent: 0, completedAt: null }
    });
    console.log('2. Reset learner enrollment to IN_PROGRESS');

    // 3. Ensure no active certificate
    await prisma.certificate.deleteMany({
      where: { userId, courseId }
    });
    console.log('3. Deleted any existing certificates for test');

    // 4. Find all lessons
    const lessons = await prisma.lesson.findMany({ where: { courseId } });
    if (lessons.length === 0) {
      await prisma.lesson.create({
        data: {
          courseId,
          title: 'Auto-Test Lesson',
          type: 'article',
          order: 1
        }
      });
    }

    // 5. Trigger Completion (completing ALL lessons)
    console.log(`Completing ${lessons.length} lessons to trigger auto-issuance...`);
    for (const l of lessons) {
      await userProgress.updateLessonProgress(userId, l.id, 100);
    }

    // 6. Verify Certificate Issuance
    console.log('Waiting for async issuance...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const cert = await prisma.certificate.findFirst({
      where: { userId, courseId },
      orderBy: { issuedAt: 'desc' }
    });

    if (cert) {
      console.log('4. Auto-Certificate Found:', cert.id);
      console.log('   Status:', cert.status);
      console.log('   Mode:', cert.metadata?.issue?.mode);
      console.log('   Manual Flag:', cert.metadata?.issue?.manual);
      
      if (cert.metadata?.issue?.mode === 'AUTOMATIC' && cert.metadata?.issue?.manual === false) {
        console.log('--- AUTO-ISSUE TEST SUCCESSFUL ---');
      } else {
        console.log('--- AUTO-ISSUE TEST FAILED (Wrong Mode) ---');
      }
    } else {
      console.log('--- AUTO-ISSUE TEST FAILED (No Certificate) ---');
    }

    // Give some time for PDF generation to finish before we delete for next test
    console.log('Waiting for PDF generation to finish before manual test...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 7. Test Manual Mode block
    console.log('\nTesting Manual Mode block...');
    await prisma.courseCertificateSetting.update({
      where: { courseId },
      data: { issueMode: 'MANUAL' }
    });
    
    // Reset again
    await prisma.userCourse.update({
      where: { userId_courseId: { userId, courseId } },
      data: { status: 'IN_PROGRESS', progressPercent: 0 }
    });
    await prisma.certificate.deleteMany({ where: { userId, courseId } });

    console.log(`Completing ${lessons.length} lessons to check manual block...`);
    for (const l of lessons) {
      await userProgress.updateLessonProgress(userId, l.id, 100);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));

    const manualCert = await prisma.certificate.findFirst({ where: { userId, courseId } });
    if (!manualCert) {
      console.log('   Correctly blocked auto-issue in MANUAL mode');
    } else {
      console.log('   FAILED: Certificate issued in MANUAL mode');
    }

  } catch (error) {
    console.error('--- TEST ERROR ---');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

runAutoTest();
