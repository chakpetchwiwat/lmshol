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

            const roiBuckets = buildTimeBuckets(period).map((bucket) => ({
                ...bucket,
                completions: 0,
                points: 0,
                details: []
            }));
            const roiBucketMap = Object.fromEntries(roiBuckets.map((bucket) => [bucket.key, bucket]));

            enrollments
                .filter((enrollment) => enrollment.status === ENROLLMENT_STATUS.COMPLETED && enrollment.completedAt)
                .forEach((enrollment) => {
                    const user = userDirectory[enrollment.userId];
                    const departmentName = user?.department || null;
                    const key = getTimeBucketKey(enrollment.completedAt, period.mode);
                    if (!roiBucketMap[key]) return;
                    roiBucketMap[key].completions += 1;
                    roiBucketMap[key].details.push({
                        kind: 'completion',
                        userId: enrollment.userId,
                        userName: user?.name || '-',
                        department: departmentName,
                        courseTitle: enrollment.course.title,
                        completedAt: enrollment.completedAt,
                        points: 0
                    });
                });

            learningPoints.forEach((entry) => {
                const user = userDirectory[entry.userId];
                const departmentName = user?.department || null;
                const key = getTimeBucketKey(entry.createdAt, period.mode);
                if (!roiBucketMap[key]) return;
                roiBucketMap[key].points += entry.points;
                roiBucketMap[key].details.push({
                    kind: 'points',
                    userId: entry.userId,
                    userName: user?.name || '-',
                    department: departmentName,
                    courseTitle: entry.note || 'Learning reward',
                    completedAt: entry.createdAt,
                    points: entry.points
                });
            });

            const roiTrend = roiBuckets.map((bucket) => ({
                month: bucket.label,
                label: bucket.fullLabel,
                bucketKey: bucket.key,
                points: roiBucketMap[bucket.key]?.points || 0,
                completions: roiBucketMap[bucket.key]?.completions || 0,
                details: roiBucketMap[bucket.key]?.details || []
            }));

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
