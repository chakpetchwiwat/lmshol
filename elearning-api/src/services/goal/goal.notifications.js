const { USER_STATUS } = require('../../utils/constants/statuses');
const { GOAL_SCOPES } = require('../../utils/constants/scopes');
const { DEFAULT_REMINDER_TIME, normalizeReminderTime, addThailandDays, subtractThailandDays } = require('../../utils/thailandTime');
const ErrorResponse = require('../../utils/errorResponse');
const EmailService = require('../email.service');

const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const GOAL_REMINDER_DAY_OPTIONS = new Set([0, 3, 7]); // Added 0 based on recent objective

const normalizeReminderDays = (value, fieldLabel) => {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    const parsedValue = Number.parseInt(value, 10);

    if (!GOAL_REMINDER_DAY_OPTIONS.has(parsedValue)) {
        throw new ErrorResponse(`${fieldLabel} must be 0, 3 or 7 days`, 400);
    }

    return parsedValue;
};

const normalizeGoalReminderTime = (value, fieldLabel) => {
    try {
        return normalizeReminderTime(value);
    } catch (error) {
        throw new ErrorResponse(`${fieldLabel} must be in HH:mm format`, 400);
    }
};

const buildGoalTargetUsersWhere = (goal) => ({
    status: USER_STATUS.ACTIVE,
    ...(Array.isArray(goal.targetUsers) && goal.targetUsers.length > 0
        ? { id: { in: goal.targetUsers.map((target) => target.userId) } }
        : Array.isArray(goal.targetCohortRoles) && goal.targetCohortRoles.length > 0
            ? {
                roles: {
                    hasSome: goal.targetCohortRoles
                        .map((target) => target.cohortRole?.key || target.roleKey || target.key)
                        .filter(Boolean)
                }
            }
        : Array.isArray(goal.targetDepartments) && goal.targetDepartments.length > 0
            ? { departmentId: { in: goal.targetDepartments.map((target) => target.departmentId) } }
            : goal.scope === GOAL_SCOPES.DEPARTMENT && goal.departmentId
                ? { departmentId: goal.departmentId }
                : {})
});

const createGoalReminderNotifications = async (tx, goal, assignmentBaseDate = new Date()) => {
    const targetUsers = await tx.user.findMany({
        where: buildGoalTargetUsersWhere(goal),
        select: { id: true, name: true, email: true }
    });

    if (!targetUsers.length) {
        return;
    }

    const notifications = [];
    const now = new Date();
    const immediateEmailSends = [];

    if (goal.postAssignmentReminderDays !== null && goal.postAssignmentReminderDays !== undefined) {
        const scheduledFor = goal.postAssignmentReminderDays === 0
            ? assignmentBaseDate
            : addThailandDays(
                assignmentBaseDate,
                goal.postAssignmentReminderDays,
                goal.postAssignmentReminderTime || DEFAULT_REMINDER_TIME
            ).date;

        const isImmediate = scheduledFor <= now;

        targetUsers.forEach((user) => {
            notifications.push({
                userId: user.id,
                goalId: goal.id,
                type: 'GOAL_POST_ASSIGNMENT_REMINDER',
                title: 'มีการแจ้งเตือนเป้าหมายการเรียน',
                message: `เป้าหมาย "${goal.title}" ถูกมอบหมายให้คุณแล้ว กดเพื่อดูรายละเอียด`,
                scheduledFor,
                emailSentAt: isImmediate ? now : null
            });

            if (isImmediate && user.email) {
                immediateEmailSends.push({
                    to: user.email,
                    subject: 'มีการแจ้งเตือนเป้าหมายการเรียน',
                    templateName: 'goal_assigned',
                    data: {
                        name: user.name,
                        goalTitle: goal.title,
                        goalDescription: goal.description,
                        startDate: formatDate(goal.startDate),
                        expiryDate: formatDate(goal.expiryDate),
                        goalUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/user/goals/${goal.id}`
                    }
                });
            }
        });
    }

    if (goal.preDeadlineReminderDays && goal.expiryDate) {
        const { date: preDeadlineDate } = subtractThailandDays(
            goal.expiryDate,
            goal.preDeadlineReminderDays,
            goal.preDeadlineReminderTime || DEFAULT_REMINDER_TIME
        );
        const scheduledFor = preDeadlineDate < now ? now : preDeadlineDate;
        const isImmediate = scheduledFor <= now;

        targetUsers.forEach((user) => {
            notifications.push({
                userId: user.id,
                goalId: goal.id,
                type: 'GOAL_PRE_DEADLINE_REMINDER',
                title: 'เป้าหมายการเรียนใกล้ครบกำหนด',
                message: `เป้าหมาย "${goal.title}" จะครบกำหนดใน ${goal.preDeadlineReminderDays} วัน กดเพื่อดูเป้าหมายนี้`,
                scheduledFor,
                emailSentAt: isImmediate ? now : null
            });

            if (isImmediate && user.email) {
                const diffTime = Math.abs(goal.expiryDate - now);
                const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                immediateEmailSends.push({
                    to: user.email,
                    subject: 'เป้าหมายการเรียนใกล้ครบกำหนด',
                    templateName: 'goal_reminder',
                    data: {
                        name: user.name,
                        goalTitle: goal.title,
                        goalDescription: goal.description,
                        daysRemaining,
                        expiryDate: formatDate(goal.expiryDate),
                        goalUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/user/goals/${goal.id}`
                    }
                });
            }
        });
    }

    if (notifications.length > 0) {
        await tx.userNotification.createMany({
            data: notifications
        });
    }

    // Trigger emails asynchronously
    if (immediateEmailSends.length > 0) {
        immediateEmailSends.forEach(mail => {
            EmailService.sendEmail(mail).catch(err => console.error('[EmailService] Async send failed:', err));
        });
    }
};

module.exports = {
    normalizeReminderDays,
    normalizeGoalReminderTime,
    createGoalReminderNotifications
};
