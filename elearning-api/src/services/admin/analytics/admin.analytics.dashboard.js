const prisma = require('../../../utils/prisma');
const { ENROLLMENT_STATUS, GOAL_STATUS } = require('../../../utils/constants/statuses');
const { GOAL_SCOPES } = require('../../../utils/constants/scopes');
const { getActorContext } = require('../admin.helpers');
const { buildLearnerWhereForActor, buildVisibleCourseWhereForDashboard, buildDateOverlapWhere } = require('../admin.queries');

const {
    getDashboardCacheKey,
    resolveDashboardCache,
    buildDashboardScope,
    buildDashboardPeriod,
    buildTimeBuckets,
    getTimeBucketKey,
    roundToOneDecimal,
    DASHBOARD_TYPES,
    DASHBOARD_TYPE_LABELS
} = require('./admin.analytics.engine');

const { buildGoalCompletionFilters, calculateGoalCompliance } = require('./admin.analytics.goals');
const { aggregateActivity, aggregateDistributions } = require('./admin.analytics.aggregators');

const buildLatestCourseScoreMap = (attempts = []) => {
    const scoreMap = {};

    attempts.forEach((attempt) => {
        const courseId = attempt.lesson?.courseId;
        if (!courseId) return;

        const key = `${attempt.userId}:${courseId}`;
        if (!scoreMap[key]) {
            scoreMap[key] = {
                score: attempt.score,
                status: attempt.status,
                createdAt: attempt.createdAt,
                lessonTitle: attempt.lesson?.title || null
            };
        }
    });

    return scoreMap;
};

const getDashboardStats = async (authUser, filters = {}) => {
    const actor = await getActorContext(authUser);
    const scopeFilters = buildDashboardScope(actor, filters);
    const cacheKey = getDashboardCacheKey('dashboard-stats', actor, scopeFilters);

    return resolveDashboardCache(cacheKey, async () => {
        const period = buildDashboardPeriod(scopeFilters);
        const learnerWhere = buildLearnerWhereForActor(actor, scopeFilters.departmentId);
        const visibleCourseWhere = buildVisibleCourseWhereForDashboard(scopeFilters.departmentId);

        const [
            learnerCount,
            activeCourses, 
            categories, 
            enrollmentCount, 
            completedEnrollmentCount, 
            enrollments, 
            selectedDepartment, 
            dashboardGoals
        ] = await Promise.all([
            prisma.user.count({ where: learnerWhere }),
            prisma.course.count({ where: visibleCourseWhere }),
            prisma.category.findMany({
                where: {
                    courses: {
                        some: visibleCourseWhere
                    }
                }
            }),
            prisma.userCourse.count({
                where: {
                    user: learnerWhere,
                    course: visibleCourseWhere,
                    ...buildDateOverlapWhere(period.start, period.end)
                }
            }),
            prisma.userCourse.count({
                where: {
                    user: learnerWhere,
                    course: visibleCourseWhere,
                    status: ENROLLMENT_STATUS.COMPLETED,
                    ...buildDateOverlapWhere(period.start, period.end)
                }
            }),
            prisma.userCourse.findMany({
                where: {
                    user: learnerWhere,
                    course: visibleCourseWhere,
                    ...buildDateOverlapWhere(period.start, period.end)
                },
                include: {
                    user: {
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
                    },
                    course: {
                        select: {
                            id: true,
                            title: true,
                            points: true,
                            category: {
                                select: {
                                    id: true,
                                    name: true,
                                    type: true
                                }
                            }
                        }
                    }
                },
                orderBy: [
                    { completedAt: 'desc' },
                    { startedAt: 'desc' }
                ]
            }),
            scopeFilters.departmentId
                ? prisma.department.findUnique({
                    where: { id: scopeFilters.departmentId },
                    select: { id: true, name: true }
                })
                : Promise.resolve(null),
            prisma.learningGoal.findMany({
                where: {
                    status: GOAL_STATUS.ACTIVE,
                    ...(scopeFilters.departmentId ? {
                        OR: [
                            { scope: GOAL_SCOPES.GLOBAL },
                            { scope: GOAL_SCOPES.DEPARTMENT, departmentId: scopeFilters.departmentId },
                            { targetDepartments: { some: { departmentId: scopeFilters.departmentId } } },
                            { targetCohortRoles: { some: {} } },
                            { targetUsers: { some: { user: { departmentId: scopeFilters.departmentId } } } }
                        ]
                    } : {})
                },
                include: {
                    courses: {
                        select: {
                            courseId: true
                        }
                    },
                    targetDepartments: true,
                    targetCohortRoles: {
                        include: {
                            cohortRole: {
                                select: { key: true, name: true }
                            }
                        }
                    },
                    targetUsers: true
                }
            })
        ]);

        const totalUsers = learnerCount || 0;
        const totalEnrollments = enrollmentCount || 0;
        const completedEnrollments = completedEnrollmentCount || 0;
        const recentEnrollments = enrollments || [];
        const activeGoals = dashboardGoals || [];

        const enrollmentUserIds = [...new Set(enrollments.map((enrollment) => enrollment.userId))];
        const enrollmentCourseIds = [...new Set(enrollments.map((enrollment) => enrollment.courseId))];
        const quizAttempts = enrollmentUserIds.length > 0 && enrollmentCourseIds.length > 0
            ? await prisma.quizAttempt.findMany({
                where: {
                    userId: {
                        in: enrollmentUserIds
                    },
                    createdAt: {
                        lte: period.end
                    },
                    lesson: {
                        courseId: {
                            in: enrollmentCourseIds
                        }
                    }
                },
                include: {
                    lesson: {
                        select: {
                            title: true,
                            courseId: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            })
            : [];

        const latestCourseScoreMap = buildLatestCourseScoreMap(quizAttempts);

        const learnerPerformance = enrollments.map((enrollment) => {
            const latestScore = latestCourseScoreMap[`${enrollment.userId}:${enrollment.courseId}`];
            const departmentName = enrollment.user.departmentRef?.name || enrollment.user.department || null;

            return {
                id: enrollment.id,
                userId: enrollment.userId,
                userName: enrollment.user.name,
                email: enrollment.user.email,
                departmentId: enrollment.user.departmentRef?.id || null,
                department: departmentName,
                courseId: enrollment.courseId,
                courseTitle: enrollment.course.title,
                categoryId: enrollment.course.category?.id || null,
                categoryName: enrollment.course.category?.name || 'Uncategorized',
                categoryType: enrollment.course.category?.type || DASHBOARD_TYPES[0],
                status: enrollment.status,
                progressPercent: roundToOneDecimal(enrollment.progressPercent),
                startedAt: enrollment.startedAt,
                completedAt: enrollment.completedAt,
                score: latestScore?.score ?? null,
                quizStatus: latestScore?.status || null,
                quizLessonTitle: latestScore?.lessonTitle || null
            };
        });

        const scoredRecords = learnerPerformance.filter((item) => typeof item.score === 'number');
        const averageQuizScore = scoredRecords.length
            ? roundToOneDecimal(scoredRecords.reduce((sum, item) => sum + item.score, 0) / scoredRecords.length)
            : 0;

        let goalTotalAssignments = 0;
        let goalSuccessfulAssignments = 0;

        if (activeGoals.length > 0) {
            const usersForCompliance = await prisma.user.findMany({
                where: learnerWhere,
                select: { id: true, name: true, email: true, roles: true, departmentId: true, department: true, departmentRef: { select: { name: true } } }
            });

            const completionFilters = buildGoalCompletionFilters(activeGoals);
            const complianceCompletions = usersForCompliance.length > 0 && completionFilters.length > 0
                ? await prisma.userCourse.findMany({
                    where: {
                        userId: { in: usersForCompliance.map(u => u.id) },
                        status: ENROLLMENT_STATUS.COMPLETED,
                        OR: completionFilters
                    },
                    select: { userId: true, courseId: true, completedAt: true }
                })
                : [];

            const complianceResults = calculateGoalCompliance(usersForCompliance, activeGoals, complianceCompletions);
            goalTotalAssignments = complianceResults.totalAssignments;
            goalSuccessfulAssignments = complianceResults.successfulAssignments;
        }

        const complianceRate = goalTotalAssignments > 0
            ? roundToOneDecimal((goalSuccessfulAssignments / goalTotalAssignments) * 100)
            : 0;

        const bucketTemplate = buildTimeBuckets(period).map((bucket) => ({
            ...bucket,
            count: 0,
            details: []
        }));

        const weeklyActivity = aggregateActivity(learnerPerformance, bucketTemplate, period.mode);

        const { typeDistribution, categoryDistribution, popularCourses } = aggregateDistributions(
            learnerPerformance,
            categories,
            DASHBOARD_TYPES,
            DASHBOARD_TYPE_LABELS
        );

        return {
            scope: scopeFilters.scope,
            department: selectedDepartment?.name || actor.department || null,
            filters: {
                month: scopeFilters.month,
                year: scopeFilters.year,
                departmentId: scopeFilters.departmentId
            },
            totalUsers,
            activeCourses,
            totalEnrollments,
            completedEnrollments,
            averageQuizScore,
            complianceRate,
            goalStats: {
                totalAssignments: goalTotalAssignments,
                successfulAssignments: goalSuccessfulAssignments
            },
            learnerPerformance,
            popularCourses,
            weeklyActivity,
            categoryDistribution,
            typeDistribution
        };
    });
};

module.exports = {
    getDashboardStats,
    buildLatestCourseScoreMap
};
