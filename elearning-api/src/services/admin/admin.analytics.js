const prisma = require('../../utils/prisma');
const authHelpers = require('../../utils/auth.helpers');
const { ENROLLMENT_STATUS, ENTITY_STATUS, USER_STATUS, GOAL_STATUS } = require('../../utils/constants/statuses');
const { GOAL_SCOPES } = require('../../utils/constants/scopes');
const { buildDepartmentVisibleCourseWhere, buildLearnerWhere, buildVisibleCourseWhereForDashboard, buildDateOverlapWhere } = require('./admin.queries');

const getActorContext = (authUser) => authHelpers.getActorContext(prisma, authUser);

const DASHBOARD_CACHE_TTL_MS = (() => {
    const parsed = parseInt(process.env.DASHBOARD_CACHE_TTL_MS || '30000', 10);
    return Number.isNaN(parsed) ? 30000 : Math.max(parsed, 0);
})();

const dashboardQueryCache = new Map();
const announcementHistoryCache = new Map();

const pruneDashboardCache = () => {
    if (dashboardQueryCache.size <= 100) {
        return;
    }

    const now = Date.now();
    for (const [key, entry] of dashboardQueryCache.entries()) {
        if (!entry?.promise && (!entry?.expiresAt || entry.expiresAt <= now)) {
            dashboardQueryCache.delete(key);
        }
    }
};

const pruneDashboardCache = () => {
    if (dashboardQueryCache.size <= 100) {
        return;
    }

    const now = Date.now();
    for (const [key, entry] of dashboardQueryCache.entries()) {
        if (!entry?.promise && (!entry?.expiresAt || entry.expiresAt <= now)) {
            dashboardQueryCache.delete(key);
        }
    }
};

const getDashboardCacheKey = (namespace, actor, scopeFilters) => JSON.stringify({
    namespace,
    role: actor.effectiveRole || actor.role || null,
    actorDepartmentId: actor.departmentId || null,
    scope: scopeFilters.scope || null,
    departmentId: scopeFilters.departmentId || null,
    month: scopeFilters.month || null,
    year: scopeFilters.year || null
});

const resolveDashboardCache = async (cacheKey, producer) => {
    if (DASHBOARD_CACHE_TTL_MS <= 0) {
        return producer();
    }

    pruneDashboardCache();

    const now = Date.now();
    const existingEntry = dashboardQueryCache.get(cacheKey);

    if (existingEntry?.value !== undefined && existingEntry.expiresAt > now) {
        return existingEntry.value;
    }

    if (existingEntry?.promise) {
        return existingEntry.promise;
    }

    const pendingPromise = producer()
        .then((value) => {
            dashboardQueryCache.set(cacheKey, {
                value,
                expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS
            });
            return value;
        })
        .catch((error) => {
            dashboardQueryCache.delete(cacheKey);
            throw error;
        });

    dashboardQueryCache.set(cacheKey, { promise: pendingPromise });
    return pendingPromise;
};

const DASHBOARD_TYPE_LABELS = {
    STRAT_BUSINESS: 'Business Acumen / Corporate Knowledge',
    STRAT_CORE: 'Core / Soft Skills',
    STRAT_FUNCTIONAL: 'Functional Skills',
    STRAT_LEADERSHIP: 'Leadership Skills',
    STRAT_COMPLIANCE: 'Compliance',
    STRAT_DIGITAL: 'Digital / Future Skills'
};

const DASHBOARD_TYPES = Object.keys(DASHBOARD_TYPE_LABELS);

const parseDashboardFilters = (filters = {}) => {
    const now = new Date();
    const rawYear = parseInteger(filters.year, now.getFullYear());
    const rawMonth = filters.month === undefined || filters.month === null || filters.month === ''
        ? null
        : parseInteger(filters.month, now.getMonth() + 1);

    const year = rawYear >= 2000 ? rawYear : now.getFullYear();
    const month = rawMonth && rawMonth >= 1 && rawMonth <= 12 ? rawMonth : null;

    return {
        month,
        year,
        departmentId: normalizeNullableId(filters.departmentId)
    };
};

const parseDashboardFilters = (filters = {}) => {
    const now = new Date();
    const rawYear = parseInteger(filters.year, now.getFullYear());
    const rawMonth = filters.month === undefined || filters.month === null || filters.month === ''
        ? null
        : parseInteger(filters.month, now.getMonth() + 1);

    const year = rawYear >= 2000 ? rawYear : now.getFullYear();
    const month = rawMonth && rawMonth >= 1 && rawMonth <= 12 ? rawMonth : null;

    return {
        month,
        year,
        departmentId: normalizeNullableId(filters.departmentId)
    };
};

const buildDashboardPeriod = ({ month, year }) => {
    const start = month
        ? new Date(year, month - 1, 1, 0, 0, 0, 0)
        : new Date(year, 0, 1, 0, 0, 0, 0);
    const end = month
        ? new Date(year, month, 0, 23, 59, 59, 999)
        : new Date(year, 11, 31, 23, 59, 59, 999);

    return {
        start,
        end,
        month,
        year,
        mode: month ? 'month' : 'year'
    };
};

const buildDashboardScope = (actor, filters = {}) => {
    const parsed = parseDashboardFilters(filters);
    const departmentId = actor.isAdmin
        ? (parsed.departmentId || null)
        : (actor.departmentId || null);

    return {
        ...parsed,
        departmentId,
        scope: departmentId ? 'department' : 'global'
    };
};

const getTimeBucketKey = (value, mode) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    if (mode === 'month') {
        return date.toISOString().slice(0, 10);
    }

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const buildTimeBuckets = ({ start, end, mode }) => {
    const buckets = [];
    const cursor = new Date(start);

    if (mode === 'month') {
        while (cursor <= end) {
            buckets.push({
                key: cursor.toISOString().slice(0, 10),
                label: cursor.toLocaleDateString('th-TH', { day: 'numeric' }),
                fullLabel: cursor.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
            });
            cursor.setDate(cursor.getDate() + 1);
        }

        return buckets;
    }

    while (cursor <= end) {
        buckets.push({
            key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`,
            label: cursor.toLocaleDateString('th-TH', { month: 'short' }),
            fullLabel: cursor.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
        });
        cursor.setMonth(cursor.getMonth() + 1);
    }

    return buckets;
};

const roundToOneDecimal = (value) => Number((value || 0).toFixed(1));


const getMonthDateRange = (month, year) => {
    if (!month || !year) {
        return null;
    }

    const parsedMonth = parseInt(month, 10);
    const parsedYear = parseInt(year, 10);

    if (Number.isNaN(parsedMonth) || Number.isNaN(parsedYear)) {
        return null;
    }

    return {
        start: new Date(parsedYear, parsedMonth - 1, 1, 0, 0, 0, 0),
        end: new Date(parsedYear, parsedMonth, 0, 23, 59, 59, 999)
    };
};

const getMonthDateRange = (month, year) => {
    if (!month || !year) {
        return null;
    }

    const parsedMonth = parseInt(month, 10);
    const parsedYear = parseInt(year, 10);

    if (Number.isNaN(parsedMonth) || Number.isNaN(parsedYear)) {
        return null;
    }

    return {
        start: new Date(parsedYear, parsedMonth - 1, 1, 0, 0, 0, 0),
        end: new Date(parsedYear, parsedMonth, 0, 23, 59, 59, 999)
    };
};

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

const getEnrollmentActivityTimestamp = (enrollment) => {
    const activityDate = enrollment?.completedAt || enrollment?.startedAt;
    return activityDate ? new Date(activityDate).getTime() : 0;
};

const buildUserTrackingSummary = (enrollments = []) => {
    const latestEnrollment = [...enrollments].sort(
        (left, right) => getEnrollmentActivityTimestamp(right) - getEnrollmentActivityTimestamp(left)
    )[0];

    return {
        status: latestEnrollment?.status || ENROLLMENT_STATUS.NOT_STARTED,
        latestCourseId: latestEnrollment?.courseId || null,
        latestCourseTitle: latestEnrollment?.course?.title || null,
        latestLearningAt: latestEnrollment?.completedAt || latestEnrollment?.startedAt || null,
        latestStartedAt: latestEnrollment?.startedAt || null,
        latestCompletedAt: latestEnrollment?.completedAt || null,
        progressPercent: latestEnrollment ? Math.round(Number(latestEnrollment.progressPercent || 0)) : 0,
        enrolledCourses: enrollments.length,
        completedCourses: enrollments.filter((enrollment) => enrollment.status === ENROLLMENT_STATUS.COMPLETED).length
    };
};

const buildAtRiskLearners = async ({ learnerWhere, scopeFilters, now, warningWindow }) => {
    const activeGoals = await prisma.learningGoal.findMany({
        where: {
            status: GOAL_STATUS.ACTIVE,
            expiryDate: {
                gte: now,
                lte: warningWindow
            },
            ...(scopeFilters.departmentId ? {
                OR: [
                    { scope: GOAL_SCOPES.GLOBAL },
                    { scope: GOAL_SCOPES.DEPARTMENT, departmentId: scopeFilters.departmentId }
                ]
            } : {})
        },
        select: {
            id: true,
            title: true,
            type: true,
            targetCount: true,
            expiryDate: true,
            createdAt: true,
            scope: true,
            departmentId: true,
            courses: {
                select: {
                    courseId: true
                }
            }
        },
        orderBy: [
            { expiryDate: 'asc' },
            { createdAt: 'desc' }
        ]
    });

    if (activeGoals.length === 0) {
        return [];
    }

    const targetUsers = await prisma.user.findMany({
        where: learnerWhere,
        select: {
            id: true,
            name: true,
            email: true,
            departmentId: true,
            department: true,
            departmentRef: {
                select: {
                    name: true
                }
            }
        }
    });

    if (targetUsers.length === 0) {
        return [];
    }

    const userIds = targetUsers.map((user) => user.id);
    const anyGoals = activeGoals.filter((goal) => goal.type === 'ANY');
    const specificGoals = activeGoals.filter((goal) => goal.type === 'SPECIFIC');
    const specificGoalCourseIds = [...new Set(
        specificGoals.flatMap((goal) => goal.courses.map((goalCourse) => goalCourse.courseId))
    )];

    const anyGoalDateRange = anyGoals.length > 0
        ? {
            start: anyGoals.reduce(
                (earliestDate, goal) => (goal.createdAt < earliestDate ? goal.createdAt : earliestDate),
                anyGoals[0].createdAt
            ),
            end: anyGoals.reduce((latestDate, goal) => {
                const goalEnd = goal.expiryDate || now;
                return goalEnd > latestDate ? goalEnd : latestDate;
            }, anyGoals[0].expiryDate || now)
        }
        : null;

    const completionFilters = [];

    if (anyGoalDateRange) {
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

    if (completionFilters.length === 0) {
        return [];
    }

    const completions = await prisma.userCourse.findMany({
        where: {
            userId: { in: userIds },
            status: ENROLLMENT_STATUS.COMPLETED,
            OR: completionFilters
        },
        select: {
            userId: true,
            courseId: true,
            completedAt: true
        }
    });

    const userCompletionsMap = completions.reduce((collection, completion) => {
        if (!collection[completion.userId]) {
            collection[completion.userId] = [];
        }

        collection[completion.userId].push(completion);
        return collection;
    }, {});

    const usersByDepartmentId = targetUsers.reduce((collection, user) => {
        const departmentKey = user.departmentId || '__NO_DEPARTMENT__';
        if (!collection[departmentKey]) {
            collection[departmentKey] = [];
        }

        collection[departmentKey].push(user);
        return collection;
    }, {});

    const atRisk = [];

    activeGoals.forEach((goal) => {
        const goalCourses = new Set(goal.courses.map((goalCourse) => goalCourse.courseId));
        const eligibleUsers = goal.scope === GOAL_SCOPES.DEPARTMENT
            ? (usersByDepartmentId[goal.departmentId || '__NO_DEPARTMENT__'] || [])
            : targetUsers;

        eligibleUsers.forEach((user) => {
            const userCompletions = userCompletionsMap[user.id] || [];
            const validCompletions = userCompletions.filter((completion) => {
                if (goal.type === 'SPECIFIC') {
                    return goalCourses.has(completion.courseId);
                }

                return completion.completedAt >= goal.createdAt &&
                    (!goal.expiryDate || completion.completedAt <= goal.expiryDate);
            });

            if (validCompletions.length >= goal.targetCount) {
                return;
            }

            atRisk.push({
                userId: user.id,
                userName: user.name,
                email: user.email,
                department: user.departmentRef?.name || user.department || null,
                courseId: goal.id,
                goalId: goal.id,
                courseTitle: goal.title,
                deadline: goal.expiryDate,
                isOverdue: goal.expiryDate ? goal.expiryDate < now : false,
                score: null,
                gapCount: goal.targetCount - validCompletions.length
            });
        });
    });

    return atRisk
        .sort((left, right) => (left.deadline || 0) - (right.deadline || 0))
        .slice(0, 500);
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
                // Fetch all for now to keep charts accurate, but with optimized counts above
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

        // Goal compliance mirrors the per-goal report: each goal/user assignment is successful
        // only when the user has enough valid completions for that goal's own rules/window.
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

        // AT-RISK LEARNERS: keep this isolated so the rest of analytics can still render.
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
    DASHBOARD_CACHE_TTL_MS,
    dashboardQueryCache,
    pruneDashboardCache,
    getDashboardCacheKey,
    resolveDashboardCache,
    DASHBOARD_TYPE_LABELS,
    DASHBOARD_TYPES,
    parseDashboardFilters,
    buildDashboardPeriod,
    buildDashboardScope,
    getTimeBucketKey,
    buildTimeBuckets,
    roundToOneDecimal,
    getMonthDateRange,
    buildLatestCourseScoreMap,
    getEnrollmentActivityTimestamp,
    buildUserTrackingSummary,
    buildAtRiskLearners,
    getDashboardStats,
    getAdvancedAnalytics,
};
