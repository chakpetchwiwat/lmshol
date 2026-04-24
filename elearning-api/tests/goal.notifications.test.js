const assert = require('node:assert/strict');
const test = require('node:test');

const { createGoalReminderNotifications } = require('../src/services/goal/goal.notifications');

const createMockTx = () => {
    const createdNotifications = [];

    return {
        createdNotifications,
        user: {
            findMany: async () => [{ id: 'user-1' }, { id: 'user-2' }]
        },
        userNotification: {
            createMany: async ({ data }) => {
                createdNotifications.push(...data);
                return { count: data.length };
            }
        }
    };
};

test('immediate post-assignment goal reminder is scheduled at assignment time', async () => {
    const tx = createMockTx();
    const assignmentBaseDate = new Date('2026-04-25T08:30:00.000Z');

    await createGoalReminderNotifications(tx, {
        id: 'goal-1',
        title: 'Immediate goal',
        scope: 'GLOBAL',
        postAssignmentReminderDays: 0,
        postAssignmentReminderTime: null,
        preDeadlineReminderDays: null,
        expiryDate: null
    }, assignmentBaseDate);

    assert.equal(tx.createdNotifications.length, 2);
    assert.ok(tx.createdNotifications.every((notification) => (
        notification.scheduledFor.getTime() === assignmentBaseDate.getTime()
    )));
});

test('timed post-assignment goal reminder still uses configured Thailand time', async () => {
    const tx = createMockTx();
    const assignmentBaseDate = new Date('2026-04-25T08:30:00.000Z');

    await createGoalReminderNotifications(tx, {
        id: 'goal-2',
        title: 'Timed goal',
        scope: 'GLOBAL',
        postAssignmentReminderDays: 3,
        postAssignmentReminderTime: '10:15',
        preDeadlineReminderDays: null,
        expiryDate: null
    }, assignmentBaseDate);

    assert.equal(tx.createdNotifications.length, 2);
    assert.ok(tx.createdNotifications.every((notification) => (
        notification.scheduledFor.toISOString() === '2026-04-28T03:15:00.000Z'
    )));
});
