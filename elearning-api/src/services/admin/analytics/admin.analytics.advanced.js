const prisma = require('../../../utils/prisma');
const { ENROLLMENT_STATUS } = require('../../../utils/constants/statuses');
const { getActorContext } = require('../admin.helpers');
const { buildLearnerWhere, buildVisibleCourseWhereForDashboard, buildDateOverlapWhere } = require('../admin.queries');
const { getDashboardUserSummary } = require('../admin.serializers');

const {
    getDashboardCacheKey,
    resolveDashboardCache,
    buildDashboardScope,
    buildDashboardPeriod,
    buildTimeBuckets,
    getTimeBucketKey,
    roundToOneDecimal,
    DASHBOARD_TYPES
} = require('./admin.analytics.engine');

const { buildLatestCourseScoreMap } = require('./admin.analytics.dashboard');
const { buildAtRiskLearners } = require('./admin.analytics.at-risk');
const { aggregateRoiTrend } = require('./admin.analytics.aggregators');

const getAdvancedAnalytics = async (authUser, filters = {}) => {
    const actor = await getActorContext(authUser);
    const scopeFilters = buildDashboardScope(actor, filters);
    const cacheKey = getDashboardCacheKey('advanced-analytics', actor, scopeFilters);

    return resolveDashboardCache(cacheKey, async () => {
        const period = buildDashboardPeriod(scopeFilters);
        const learnerWhere = buildLearnerWhere(scopeFilters.departmentId);
        const visibleCourseWhere = buildVisibleCourseWhereForDashboard(scopeFilters.departmentId);

        try {
            const scopedUsers = await prisma.user.findMany({
                where: learnerWhere,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    department: true,
                    departmentRef: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    tier: true,
                    tierRef: {
                        select: {
                            name: true
                        }
                    }
                }
            });

            if (scopedUsers.length === 0) {
                return {
                    skillGap: [],
                    benchmarking: [],
                    roiTrend: buildTimeBuckets(period).map((bucket) => ({
                        month: bucket.label,
                        label: bucket.fullLabel,
                        bucketKey: bucket.key,
                        points: 0,
                        completions: 0,
                        details: []
                    })),
                    atRisk: []
                };
            }

            const userIds = scopedUsers.map((user) => user.id);
            const userDirectory = Object.fromEntries(
                scopedUsers.map((user) => [user.id, getDashboardUserSummary(user)])
            );
            const departmentNames = [...new Set(scopedUsers
                .map((user) => user.departmentRef?.name || user.department || 'Unassigned')
                .filter(Boolean))];

            const [quizAttempts, enrollments, learningPoints] = await Promise.all([
                prisma.quizAttempt.findMany({
                    where: {
                        userId: { in: userIds },
                        createdAt: {
                            gte: period.start,
                            lte: period.end
                        },
                        lesson: {
                            course: visibleCourseWhere
                        }
                    },
                    select: {
                        userId: true,
                        score: true,
                        status: true,
                        createdAt: true,
                        lesson: {
                            select: {
                                title: true,
                                course: {
                                    select: {
                                        id: true,
                                        title: true,
                                        category: {
                                            select: {
                                                type: true,
                                                name: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }),
                prisma.userCourse.findMany({
                    where: {
                        userId: { in: userIds },
                        course: visibleCourseWhere,
                        ...buildDateOverlapWhere(period.start, period.end)
                    },
                    select: {
                        userId: true,
                        courseId: true,
                        status: true,
                        completedAt: true,
                        startedAt: true,
                        course: {
                            select: {
                                id: true,
                                title: true
                            }
                        }
                    }
                }),
                prisma.pointsLedger.findMany({
                    where: {
                        userId: { in: userIds },
                        points: { gt: 0 },
                        createdAt: {
                            gte: period.start,
                            lte: period.end
                        }
                    },
                    select: {
                        userId: true,
                        points: true,
                        note: true,
                        createdAt: true
                    },
                    orderBy: { createdAt: 'desc' }
                })
            ]);

            const skillGapAccumulator = Object.fromEntries(DASHBOARD_TYPES.map((type) => [type, {
                totalScore: 0,
                count: 0,
                details: []
            }]));

            quizAttempts.forEach((attempt) => {
                const type = attempt.lesson?.course?.category?.type || DASHBOARD_TYPES[0];
                const user = userDirectory[attempt.userId];
                const departmentName = user?.department || null;
                const bucket = skillGapAccumulator[type] || skillGapAccumulator[DASHBOARD_TYPES[0]];
                bucket.totalScore += attempt.score;
                bucket.count += 1;
                bucket.details.push({
                    userId: attempt.userId,
                    userName: user?.name || '-',
                    email: user?.email || null,
                    department: departmentName,
                    courseTitle: attempt.lesson?.course?.title || '-',
                    lessonTitle: attempt.lesson?.title || '-',
                    score: attempt.score,
                    attemptedAt: attempt.createdAt
                });
            });

            const skillGap = DASHBOARD_TYPES.map((type) => ({
                type,
                average_mastery: skillGapAccumulator[type].count
                    ? skillGapAccumulator[type].totalScore / skillGapAccumulator[type].count
                    : 0,
                details: skillGapAccumulator[type].details
            }));

            const latestScoreMap = buildLatestCourseScoreMap(
                quizAttempts.map((attempt) => ({
                    ...attempt,
                    lesson: {
                        courseId: attempt.lesson?.course?.id,
                        title: attempt.lesson?.title
                    }
                }))
            );

            const benchmarkMap = {};
            departmentNames.forEach((departmentName) => {
                benchmarkMap[departmentName] = {
                    name: departmentName,
                    completion_rate: 0,
                    total: 0,
                    completed: 0,
                    details: []
                };
            });

            enrollments.forEach((enrollment) => {
                const user = userDirectory[enrollment.userId];
                const departmentName = user?.department || 'Unassigned';
                if (!benchmarkMap[departmentName]) {
                    benchmarkMap[departmentName] = {
                        name: departmentName,
                        completion_rate: 0,
                        total: 0,
                        completed: 0,
                        details: []
                    };
                }

                const bucket = benchmarkMap[departmentName];
                bucket.total += 1;
                if (enrollment.status === ENROLLMENT_STATUS.COMPLETED) {
                    bucket.completed += 1;
                }
            });

            const userBenchmarkMap = {};
            enrollments.forEach((enrollment) => {
                const user = userDirectory[enrollment.userId];
                const departmentName = user?.department || 'Unassigned';
                const userKey = `${departmentName}:${enrollment.userId}`;
                if (!userBenchmarkMap[userKey]) {
                    userBenchmarkMap[userKey] = {
                        departmentName,
                        userId: enrollment.userId,
                        userName: user?.name || '-',
                        email: user?.email || null,
                        tier: user?.tier || '-',
                        completedCourses: 0,
                        totalCourses: 0,
                        scores: []
                    };
                }

                const record = userBenchmarkMap[userKey];
                record.totalCourses += 1;
                if (enrollment.status === ENROLLMENT_STATUS.COMPLETED) {
                    record.completedCourses += 1;
                }

                const latestScore = latestScoreMap[`${enrollment.userId}:${enrollment.courseId}`];
                if (typeof latestScore?.score === 'number') {
                    record.scores.push(latestScore.score);
                }
            });

            Object.values(userBenchmarkMap).forEach((record) => {
                benchmarkMap[record.departmentName]?.details.push({
                    userId: record.userId,
                    userName: record.userName,
                    email: record.email,
                    tier: record.tier,
                    completedCourses: record.completedCourses,
                    totalCourses: record.totalCourses,
                    avgScore: record.scores.length
                        ? roundToOneDecimal(record.scores.reduce((sum, value) => sum + value, 0) / record.scores.length)
                        : null
                });
            });

            const benchmarking = Object.values(benchmarkMap)
                .map((department) => ({
                    name: department.name,
                    completion_rate: department.total > 0
                        ? (department.completed * 100) / department.total
                        : 0,
                    details: department.details.sort((left, right) => right.completedCourses - left.completedCourses)
                }))
                .sort((left, right) => right.completion_rate - left.completion_rate);

            const roiTrend = aggregateRoiTrend(
                enrollments.map(e => ({
                    ...e,
                    userName: userDirectory[e.userId]?.name,
                    department: userDirectory[e.userId]?.department,
                    courseTitle: e.course.title
                })),
                learningPoints.map(p => ({
                    ...p,
                    userName: userDirectory[p.userId]?.name,
                    department: userDirectory[p.userId]?.department
                })),
                buildTimeBuckets(period).map(b => ({ ...b, points: 0, completions: 0, details: [] })),
                period.mode
            );

            const now = new Date();
            const warningWindow = new Date();
            warningWindow.setDate(now.getDate() + 10);

            let atRisk = [];
            try {
                atRisk = await buildAtRiskLearners({
                    learnerWhere,
                    scopeFilters,
                    now,
                    warningWindow
                });
            } catch (riskError) {
                console.error('Error building at-risk analytics:', riskError);
            }

            return {
                skillGap,
                benchmarking,
                roiTrend,
                atRisk
            };
        } catch (error) {
            console.error('Error in getAdvancedAnalytics:', error);
            return {
                skillGap: [],
                benchmarking: [],
                roiTrend: [],
                atRisk: []
            };
        }
    });
};

module.exports = {
    getAdvancedAnalytics
};
