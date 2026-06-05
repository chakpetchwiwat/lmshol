require('dotenv').config();
const prisma = require('../src/utils/prisma');
const EmailService = require('../src/services/email.service');

const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  // Support Buddhist Era year standard formatting for Thai UI
  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const run = async () => {
  console.info(`[Email Cron] Starting scheduled email dispatch...`);
  const now = new Date();

  try {
    const notifications = await prisma.userNotification.findMany({
      where: {
        emailSentAt: null,
        scheduledFor: {
          lte: now
        }
      },
      include: {
        user: true,
        goal: true,
        assessmentSubmission: {
          include: {
            lesson: {
              include: {
                course: true
              }
            }
          }
        }
      }
    });

    console.info(`[Email Cron] Found ${notifications.length} pending notification emails.`);

    for (const notification of notifications) {
      if (!notification.user || !notification.user.email) {
        console.warn(`[Email Cron] Notification ${notification.id} skipped: User email missing.`);
        // Mark as sent to prevent re-looping on bad accounts
        await prisma.userNotification.update({
          where: { id: notification.id },
          data: { emailSentAt: now }
        });
        continue;
      }

      console.info(`[Email Cron] Sending email for notification ID: ${notification.id} (${notification.type}) to ${notification.user.email}`);

      try {
        if (notification.type === 'GOAL_POST_ASSIGNMENT_REMINDER' && notification.goal) {
          await EmailService.sendEmail({
            to: notification.user.email,
            subject: 'มีการแจ้งเตือนเป้าหมายการเรียน',
            templateName: 'goal_assigned',
            data: {
              name: notification.user.name,
              goalTitle: notification.goal.title,
              goalDescription: notification.goal.description,
              startDate: formatDate(notification.goal.startDate),
              expiryDate: formatDate(notification.goal.expiryDate),
              goalUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/user/goals/${notification.goalId}`
            }
          });
        } else if (notification.type === 'GOAL_PRE_DEADLINE_REMINDER' && notification.goal) {
          const diffTime = Math.abs(notification.goal.expiryDate - now);
          const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          await EmailService.sendEmail({
            to: notification.user.email,
            subject: 'เป้าหมายการเรียนใกล้ครบกำหนด',
            templateName: 'goal_reminder',
            data: {
              name: notification.user.name,
              goalTitle: notification.goal.title,
              goalDescription: notification.goal.description,
              daysRemaining,
              expiryDate: formatDate(notification.goal.expiryDate),
              goalUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/user/goals/${notification.goalId}`
            }
          });
        } else if (notification.type === 'ASSESSMENT_REVIEWED' && notification.assessmentSubmission) {
          const isPassed = notification.assessmentSubmission.status === 'PASSED';
          const isNeedsRevision = notification.assessmentSubmission.status === 'NEEDS_REVISION';
          
          await EmailService.sendEmail({
            to: notification.user.email,
            subject: notification.title,
            templateName: 'assessment_reviewed',
            data: {
              name: notification.user.name,
              title: notification.title,
              message: notification.message,
              courseTitle: notification.assessmentSubmission.lesson.course.title,
              lessonTitle: notification.assessmentSubmission.lesson.title,
              isPassed,
              isNeedsRevision,
              isFailed: !isPassed && !isNeedsRevision,
              score: notification.assessmentSubmission.score,
              maxScore: notification.assessmentSubmission.maxScore,
              feedback: notification.assessmentSubmission.feedback,
              actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/user/courses/${notification.assessmentSubmission.lesson.courseId}/lesson/${notification.assessmentSubmission.lessonId}?assessmentResult=${notification.assessmentSubmissionId}`
            }
          });
        } else {
          console.warn(`[Email Cron] Unsupported notification type: ${notification.type}`);
        }

        // Update emailSentAt flag to mark it sent
        await prisma.userNotification.update({
          where: { id: notification.id },
          data: { emailSentAt: now }
        });
      } catch (err) {
        console.error(`[Email Cron] Error sending email for notification ${notification.id}:`, err);
      }
    }

    console.info(`[Email Cron] Email dispatch cycle finished.`);
  } catch (error) {
    console.error(`[Email Cron] Execution error:`, error);
  } finally {
    await prisma.$disconnect();
  }
};

run();
