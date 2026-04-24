const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const prismaPath = path.resolve(__dirname, '../src/utils/prisma.js');
const progressPath = path.resolve(__dirname, '../src/services/user/user.progress.js');
const rewardsPath = path.resolve(__dirname, '../src/services/user/user.rewards.js');
const visibilityPath = path.resolve(__dirname, '../src/services/user/user.visibility.js');

const loadWithMockPrisma = (mockPrisma, modulePath) => {
    [modulePath, visibilityPath, prismaPath].forEach((cachePath) => {
        delete require.cache[cachePath];
    });

    require.cache[prismaPath] = {
        id: prismaPath,
        filename: prismaPath,
        loaded: true,
        exports: mockPrisma
    };

    return require(modulePath);
};

test('updateLessonProgress completes a course and awards course points once', async () => {
    const calls = [];
    const mockPrisma = {
        lesson: {
            findUnique: async () => ({
                id: 'lesson-1',
                courseId: 'course-1',
                course: {
                    title: 'Course One',
                    points: 50
                }
            }),
            findMany: async () => [{ id: 'lesson-1' }]
        },
        userCourse: {
            findUnique: async () => ({
                id: 'enrollment-1',
                status: 'IN_PROGRESS'
            }),
            update: async (input) => {
                calls.push(['userCourse.update', input]);
                return input;
            }
        },
        userLessonProgress: {
            upsert: async (input) => {
                calls.push(['userLessonProgress.upsert', input]);
                return { id: 'progress-1', progress: input.update.progress };
            },
            findMany: async () => [{ lessonId: 'lesson-1', progress: 100 }]
        },
        pointsLedger: {
            findFirst: async () => null,
            create: async (input) => {
                calls.push(['pointsLedger.create', input]);
                return input;
            }
        }
    };

    const { updateLessonProgress } = loadWithMockPrisma(mockPrisma, progressPath);
    const result = await updateLessonProgress('user-1', 'lesson-1', 100);

    assert.equal(result.progress, 100);
    assert.equal(calls[0][0], 'userLessonProgress.upsert');
    assert.equal(calls[1][0], 'pointsLedger.create');
    assert.deepEqual(calls[1][1].data, {
        userId: 'user-1',
        sourceType: 'course',
        sourceId: 'course-1',
        points: 50,
        note: 'Completed course: Course One'
    });
    assert.equal(calls[2][0], 'userCourse.update');
    assert.equal(calls[2][1].data.status, 'COMPLETED');
    assert.equal(calls[2][1].data.progressPercent, 100);
});

test('submitQuiz records attempt, awards quiz points, completes lesson, and awards course points', async () => {
    const calls = [];
    const mockPrisma = {
        lesson: {
            findUnique: async () => ({
                id: 'lesson-quiz',
                courseId: 'course-1',
                type: 'quiz',
                title: 'Quiz One',
                points: 20,
                passScore: 60,
                course: {
                    title: 'Course One',
                    points: 50
                },
                questions: [{
                    id: 'question-1',
                    points: 10,
                    choices: [
                        { id: 'choice-1', isCorrect: true },
                        { id: 'choice-2', isCorrect: false }
                    ]
                }]
            }),
            findMany: async () => [{ id: 'lesson-quiz' }]
        },
        quizAttempt: {
            findFirst: async () => null,
            create: async (input) => {
                calls.push(['quizAttempt.create', input]);
                return { id: 'attempt-1', ...input.data };
            }
        },
        pointsLedger: {
            findFirst: async () => null,
            create: async (input) => {
                calls.push(['pointsLedger.create', input]);
                return input;
            }
        },
        userLessonProgress: {
            upsert: async (input) => {
                calls.push(['userLessonProgress.upsert', input]);
                return input;
            },
            findMany: async () => [{ lessonId: 'lesson-quiz', progress: 100 }]
        },
        userCourse: {
            findUnique: async () => ({
                id: 'enrollment-1',
                status: 'IN_PROGRESS'
            }),
            update: async (input) => {
                calls.push(['userCourse.update', input]);
                return input;
            }
        }
    };

    const { submitQuiz } = loadWithMockPrisma(mockPrisma, progressPath);
    const result = await submitQuiz('user-1', 'lesson-quiz', { 'question-1': 'choice-1' });

    assert.equal(result.passed, true);
    assert.equal(result.scorePercent, 100);
    assert.equal(result.earnedQuizPoints, 20);
    assert.equal(result.earnedCoursePoints, 50);
    assert.equal(result.earnedPoints, 70);
    assert.equal(calls[0][0], 'quizAttempt.create');
    assert.equal(calls[1][0], 'pointsLedger.create');
    assert.equal(calls[1][1].data.sourceType, 'quiz');
    assert.equal(calls[2][0], 'userLessonProgress.upsert');
    assert.equal(calls[3][0], 'pointsLedger.create');
    assert.equal(calls[3][1].data.sourceType, 'course');
    assert.equal(calls[4][0], 'userCourse.update');
});

test('requestRedeem creates request, debits points, and decrements stock in one transaction', async () => {
    const calls = [];
    const tx = {
        redeemRequest: {
            create: async (input) => {
                calls.push(['redeemRequest.create', input]);
                return { id: 'redeem-1', ...input.data };
            }
        },
        pointsLedger: {
            create: async (input) => {
                calls.push(['pointsLedger.create', input]);
                return input;
            }
        },
        reward: {
            update: async (input) => {
                calls.push(['reward.update', input]);
                return input;
            }
        }
    };
    const mockPrisma = {
        reward: {
            findUnique: async () => ({
                id: 'reward-1',
                name: 'Reward One',
                status: 'ACTIVE',
                stock: 3,
                maxPerUser: 1,
                pointsCost: 30
            })
        },
        redeemRequest: {
            count: async () => 0
        },
        pointsLedger: {
            aggregate: async () => ({
                _sum: { points: 100 }
            })
        },
        $transaction: async (callback) => callback(tx)
    };

    const { requestRedeem } = loadWithMockPrisma(mockPrisma, rewardsPath);
    const result = await requestRedeem('user-1', 'reward-1');

    assert.equal(result.id, 'redeem-1');
    assert.equal(calls[0][0], 'redeemRequest.create');
    assert.equal(calls[1][0], 'pointsLedger.create');
    assert.deepEqual(calls[1][1].data, {
        userId: 'user-1',
        sourceType: 'redeem',
        sourceId: 'redeem-1',
        points: -30,
        note: 'Redeemed: Reward One'
    });
    assert.equal(calls[2][0], 'reward.update');
    assert.deepEqual(calls[2][1].data.stock, { decrement: 1 });
});
