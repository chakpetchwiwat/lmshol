const prisma = require('../../../utils/prisma');
const { ENROLLMENT_STATUS, GOAL_STATUS } = require('../../../utils/constants/statuses');
const { GOAL_SCOPES } = require('../../../utils/constants/scopes');
const { getActorContext } = require('../admin.helpers');
const { buildLearnerWhere, buildVisibleCourseWhereForDashboard, buildDateOverlapWhere } = require('../admin.queries');

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
        const learnerWhere = buildLearnerWhere(scopeFilters.departmentId);
        const visibleCourseWhere = buildVisibleCourseWhereForDashboard(scopeFilters.departmentId);

        const [
            totalUsers, 
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
                            { scope: GOAL_SCOPES.DEPARTMENT, departmentId: scopeFilters.departmentId }
                        ]
                    } : {})
                },
                include: {
                    courses: {
                        select: {
                            courseId: true
                        }
                    }
                }
            })
        ]);

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
            const now = new Date();
            const usersForCompliance = await prisma.user.findMany({
                where: learnerWhere,
                select: {
                    id: true,
                    departmentId: true
                }
            });

            const usersByDept = usersForCompliance.reduce((acc, user) => {
                const deptId = user.departmentId || '__NONE__';
                if (!acc[deptId]) acc[deptId] = [];
                acc[deptId].push(user.id);
                return acc;
            }, {});

            const allComplianceUserIds = usersForCompliance.map(u => u.id);
            const anyGoals = activeGoals.filter((goal) => goal.type === 'ANY');
            const specificGoalCourseIds = [...new Set(
                activeGoals
                    .filter((goal) => goal.type === 'SPECIFIC')
                    .flatMap((goal) => goal.courses.map((goalCourse) => goalCourse.courseId))
            )];
            const completionFilters = [];

            if (anyGoals.length > 0) {
                const anyGoalDateRange = {
                    start: anyGoals.reduce(
                        (earliestDate, goal) => (goal.createdAt < earliestDate ? goal.createdAt : earliestDate),
                        anyGoals[0].createdAt
                    ),
                    end: anyGoals.reduce((latestDate, goal) => {
                        const goalEnd = goal.expiryDate || now;
                        return goalEnd > latestDate ? goalEnd : latestDate;
                    }, anyGoals[0].expiryDate || now)
                };

                completionFilters.push({
                    completedAt: {
                        gte: anyGoalDateRange.start,
                        lte: anyGoalDateRange.end
                    }
                });
            }

            if (specificGoalCourseIds.length > 0) {
                completionFilters.push({
                    courseId: {
                        in: specificGoalCourseIds
                    }
                });
            }

            const complianceCompletions = allComplianceUserIds.length > 0 && completionFilters.length > 0
                ? await prisma.userCourse.findMany({
                    where: {
                        userId: { in: allComplianceUserIds },
                        status: ENROLLMENT_STATUS.COMPLETED,
                        OR: completionFilters
                    },
                    select: {
                        userId: true,
                        courseId: true,
                        completedAt: true
                    }
                })
                : [];

            const userCompletionsMap = complianceCompletions.reduce((acc, completion) => {
                if (!acc[completion.userId]) acc[completion.userId] = [];
                acc[completion.userId].push(completion);
                return acc;
            }, {});

            activeGoals.forEach(goal => {
                const targetUserIds = goal.scope === GOAL_SCOPES.GLOBAL
                    ? allComplianceUserIds
                    : (usersByDept[goal.departmentId] || []);

                if (targetUserIds.length === 0) return;

                const goalCourseIds = new Set(goal.courses.map(c => c.courseId));
                
                targetUserIds.forEach(userId => {
                    goalTotalAssignments++;
                    const userCompletions = userCompletionsMap[userId] || [];
                    const validCompletions = userCompletions.filter((completion) => {
                        if (goal.type === 'SPECIFIC') {
                            return goalCourseIds.has(completion.courseId);
                        }

                        return completion.completedAt >= goal.createdAt
                            && (!goal.expiryDate || completion.completedAt <= goal.expiryDate);
                    });
                    const isGoalMet = validCompletions.length >= goal.targetCount;

                    if (isGoalMet) goalSuccessfulAssignments++;
                });
            });
        }

        const complianceRate = goalTotalAssignments > 0
            ? roundToOneDecimal((goalSuccessfulAssignments / goalTotalAssignments) * 100)
            : 0;

        const bucketTemplate = buildTimeBuckets(period).map((bucket) => ({
            ...bucket,
            count: 0,
            details: []
        }));
        const weeklyActivityMap = Object.fromEntries(bucketTemplate.map((bucket) => [bucket.key, bucket]));

        learnerPerformance
            .filter((item) => item.startedAt >= period.start && item.startedAt <= period.end)
            .forEach((item) => {
                const key = getTimeBucketKey(item.startedAt, period.mode);
                if (!weeklyActivityMap[key]) return;
                weeklyActivityMap[key].count += 1;
                weeklyActivityMap[key].details.push({
                    userId: item.userId,
                    userName: item.userName,
                    department: item.department,
                    courseTitle: item.courseTitle,
                    startedAt: item.startedAt,
                    status: item.status,
                    score: item.score
                });
            });

        const weeklyActivity = bucketTemplate.map((bucket) => ({
            date: bucket.label,
            label: bucket.fullLabel,
            bucketKey: bucket.key,
            count: weeklyActivityMap[bucket.key]?.count || 0,
            details: weeklyActivityMap[bucket.key]?.details || []
        }));

        const typeMap = Object.fromEntries(DASHBOARD_TYPES.map((type) => [type, {
            type,
            name: DASHBOARD_TYPE_LABELS[type],
            value: 0,
            enrollmentCount: 0,
            courses: [],
            details: []
        }]));

        const categoryMap = {};
        const popularCourseMap = {};

        learnerPerformance.forEach((item) => {
            const typeGroup = typeMap[item.categoryType] || typeMap[DASHBOARD_TYPES[0]];
            typeGroup.enrollmentCount += 1;
            typeGroup.details.push({
                userId: item.userId,
                userName: item.userName,
                department: item.department,
                courseTitle: item.courseTitle,
                status: item.status,
                score: item.score,
                completedAt: item.completedAt,
                startedAt: item.startedAt
            });

            if (!typeGroup.courses.some((course) => course.id === item.courseId)) {
                typeGroup.courses.push({
                    id: item.courseId,
                    title: item.courseTitle,
                    students: 0
                });
            }

            const typeCourse = typeGroup.courses.find((course) => course.id === item.courseId);
            typeCourse.students += 1;

            if (!categoryMap[item.categoryName]) {
                categoryMap[item.categoryName] = {
                    name: item.categoryName,
                    value: 0,
                    details: []
                };
            }
            categoryMap[item.categoryName].value += 1;
            categoryMap[item.categoryName].details.push({
                userId: item.userId,
                userName: item.userName,
                department: item.department,
                courseTitle: item.courseTitle,
                status: item.status,
                score: item.score
            });

            if (!popularCourseMap[item.courseId]) {
                popularCourseMap[item.courseId] = {
                    id: item.courseId,
                    title: item.courseTitle,
                    students: 0,
                    details: []
                };
            }
            popularCourseMap[item.courseId].students += 1;
            popularCourseMap[item.courseId].details.push({
                userId: item.userId,
                userName: item.userName,
                department: item.department,
                status: item.status,
                score: item.score,
                completedAt: item.completedAt,
                startedAt: item.startedAt
            });
        });

        categories.forEach((category) => {
            const typeGroup = typeMap[category.type] || typeMap[DASHBOARD_TYPES[0]];
            typeGroup.value += 1;
        });

        const typeDistribution = Object.values(typeMap)
            .filter((group) => group.value > 0 || group.enrollmentCount > 0)
            .map((group) => ({
                ...group,
                courses: group.courses.sort((left, right) => right.students - left.students)
            }));

        const categoryDistribution = Object.values(categoryMap)
            .sort((left, right) => right.value - left.value);

        const popularCourses = Object.values(popularCourseMap)
            .sort((left, right) => right.students - left.students)
            .slice(0, 8);

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
