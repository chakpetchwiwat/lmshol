const prisma = require('../utils/prisma');
const bcrypt = require('bcryptjs');
const authHelpers = require('../utils/auth.helpers');
const { USER_ROLES, MANAGED_USER_ROLES } = require('../utils/constants/roles');
const { ENTITY_STATUS, ENROLLMENT_STATUS, REDEEM_STATUS, USER_STATUS, GOAL_STATUS } = require('../utils/constants/statuses');
const { POINT_SOURCE_TYPES } = require('../utils/constants/ledger');
const { TRANSACTION_TIMEOUTS } = require('../utils/constants/config');
const { ANNOUNCEMENT_SCOPES, GOAL_SCOPES } = require('../utils/constants/scopes');


const courseInclude = {
    category: true,
    instructorPreset: true,
    departmentAccess: {
        include: {
            department: true
        }
    },
    tierAccess: {
        include: {
            tier: true
        }
    },
    _count: {
        select: {
            enrollments: true,
            lessons: true
        }
    }
};

const announcementInclude = {
    department: true,
    creator: {
        select: {
            id: true,
            name: true,
            email: true
        }
    },
    questions: {
        include: {
            choices: true
        },
        orderBy: {
            order: 'asc'
        }
    }
};

const userInclude = {
    departmentRef: true,
    tier: true,
    _count: {
        select: {
            enrollments: {
                where: {
                    status: ENROLLMENT_STATUS.COMPLETED
                }
            }
        }
    }
};

const categoryInclude = {
    departmentAccess: {
        include: {
            department: true
        }
    },
    tierAccess: {
        include: {
            tier: true
        }
    }
};

const parseInteger = (value, fallback = 0) => {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};

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

const getAnnouncementHistoryCacheKey = (announcementId, actor) => JSON.stringify({
    namespace: 'announcement-history',
    announcementId,
    role: actor.effectiveRole || actor.role || null,
    departmentId: actor.departmentId || null
});

const resolveAnnouncementHistoryCache = async (cacheKey, producer) => {
    if (DASHBOARD_CACHE_TTL_MS <= 0) {
        return producer();
    }

    const now = Date.now();
    const existingEntry = announcementHistoryCache.get(cacheKey);

    if (existingEntry?.value !== undefined && existingEntry.expiresAt > now) {
        return existingEntry.value;
    }

    if (existingEntry?.promise) {
        return existingEntry.promise;
    }

    const pendingPromise = producer()
        .then((value) => {
            announcementHistoryCache.set(cacheKey, {
                value,
                expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS
            });
            return value;
        })
        .catch((error) => {
            announcementHistoryCache.delete(cacheKey);
            throw error;
        });

    announcementHistoryCache.set(cacheKey, { promise: pendingPromise });
    return pendingPromise;
};

const clearAnnouncementHistoryCache = (announcementId) => {
    const cacheFragment = `"announcementId":"${announcementId}"`;
    for (const cacheKey of announcementHistoryCache.keys()) {
        if (cacheKey.includes(cacheFragment)) {
            announcementHistoryCache.delete(cacheKey);
        }
    }
};

const parseFloatValue = (value, fallback = undefined) => {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? fallback : parsed;
};

const parseOptionalDate = (value, fieldLabel = 'Expiration date') => {
    if (value === undefined) {
        return undefined;
    }

    if (value === null || value === '') {
        return null;
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        throw new Error(`${fieldLabel} is invalid`);
    }

    return parsed;
};

const normalizeNullableId = (value) => {
    if (value === undefined) {
        return undefined;
    }

    if (value === null || value === '') {
        return null;
    }

    return String(value);
};

const normalizeIdArray = (values) => {
    if (!Array.isArray(values)) {
        return [];
    }

    return [...new Set(
        values
            .filter(Boolean)
            .map((value) => String(value))
    )];
};

const sanitizeName = (value, entityLabel) => {
    const name = String(value || '').trim();

    if (!name) {
        throw new Error(`${entityLabel} name is required`);
    }

    return name;
};

const mapUserRecord = authHelpers.mapUserRecord;

const mapCourseRecord = (course) => {
    const { departmentAccess, tierAccess, instructorPreset, ...rest } = course;
    const visibleDepartments = departmentAccess?.map((item) => item.department) || [];
    const visibleTiers = tierAccess?.map((item) => item.tier) || [];
    const isArchived = authHelpers.isTimedEntityExpired(rest);

    return {
        ...rest,
        isArchived,
        instructorPreset,
        visibleDepartments,
        visibleDepartmentIds: visibleDepartments.map((department) => department.id),
        visibleTiers,
        visibleTierIds: visibleTiers.map((tier) => tier.id)
    };
};

const mapCategoryRecord = (category) => {
    const { departmentAccess, tierAccess, ...rest } = category;
    const visibleDepartments = departmentAccess?.map((item) => item.department) || [];
    const visibleTiers = tierAccess?.map((item) => item.tier) || [];
    const isArchived = authHelpers.isTimedEntityExpired(rest);

    return {
        ...rest,
        isArchived,
        visibleDepartments,
        visibleDepartmentIds: visibleDepartments.map((department) => department.id),
        visibleTiers,
        visibleTierIds: visibleTiers.map((tier) => tier.id),
        type: rest.type || 'KM_COURSE'
    };
};


const mapAnnouncementRecord = (announcement) => {
    const { creator, questions, ...rest } = announcement;
    const isArchived = authHelpers.isExpiredAt(rest.expiredAt);

    return {
        ...rest,
        creator,
        questions: questions || [],
        questionCount: Array.isArray(questions) ? questions.length : 0,
        isArchived
    };
};

const getActorContext = (authUser) => authHelpers.getActorContext(prisma, authUser);

const buildAdminManagedUsersWhere = (actor, extraWhere = {}) => authHelpers.buildUserManagementWhere(actor, extraWhere);

const buildDepartmentVisibleCourseWhere = (departmentId) => authHelpers.buildVisibilityWhere(
    { departmentId, isManager: true },
    { status: ENTITY_STATUS.PUBLISHED }
);

const buildScopedUserWhere = async (actor, targetUserId) => {
    const where = authHelpers.buildUserManagementWhere(actor);
    return {
        ...where,
        id: targetUserId
    };
};

const buildPointsHistory = async (userId) => {
    const ledger = await prisma.pointsLedger.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
    });

    if (ledger.length === 0) {
        return [];
    }

    const courseIds = [...new Set(ledger
        .filter((entry) => entry.sourceType === POINT_SOURCE_TYPES.COURSE && entry.sourceId)
        .map((entry) => entry.sourceId))];
    const lessonIds = [...new Set(ledger
        .filter((entry) => entry.sourceType === POINT_SOURCE_TYPES.QUIZ && entry.sourceId)
        .map((entry) => entry.sourceId))];
    const redeemIds = [...new Set(ledger
        .filter((entry) => [POINT_SOURCE_TYPES.REDEEM, POINT_SOURCE_TYPES.REWARD_ADJUST].includes(entry.sourceType) && entry.sourceId)
        .map((entry) => entry.sourceId))];

    const [courses, lessons, redeems] = await Promise.all([
        courseIds.length
            ? prisma.course.findMany({
                where: { id: { in: courseIds } },
                select: { id: true, title: true }
            })
            : Promise.resolve([]),
        lessonIds.length
            ? prisma.lesson.findMany({
                where: { id: { in: lessonIds } },
                select: { id: true, title: true }
            })
            : Promise.resolve([]),
        redeemIds.length
            ? prisma.redeemRequest.findMany({
                where: { id: { in: redeemIds } },
                include: {
                    reward: {
                        select: {
                            name: true
                        }
                    }
                }
            })
            : Promise.resolve([])
    ]);

    const courseMap = Object.fromEntries(courses.map((course) => [course.id, course]));
    const lessonMap = Object.fromEntries(lessons.map((lesson) => [lesson.id, lesson]));
    const redeemMap = Object.fromEntries(redeems.map((redeem) => [redeem.id, redeem]));

    return ledger.map((entry) => {
        let sourceLabel = entry.note || 'Point activity';

        if (entry.sourceType === POINT_SOURCE_TYPES.COURSE) {
            sourceLabel = courseMap[entry.sourceId]?.title
                ? `Completed course: ${courseMap[entry.sourceId].title}`
                : (entry.note || 'Completed course');
        }

        if (entry.sourceType === POINT_SOURCE_TYPES.QUIZ) {
            sourceLabel = lessonMap[entry.sourceId]?.title
                ? `Passed quiz: ${lessonMap[entry.sourceId].title}`
                : (entry.note || 'Passed quiz');
        }

        if (entry.sourceType === POINT_SOURCE_TYPES.REDEEM) {
            sourceLabel = redeemMap[entry.sourceId]?.reward?.name
                ? `Redeemed reward: ${redeemMap[entry.sourceId].reward.name}`
                : (entry.note || 'Redeemed reward');
        }

        if (entry.sourceType === POINT_SOURCE_TYPES.REWARD_ADJUST) {
            sourceLabel = redeemMap[entry.sourceId]?.reward?.name
                ? `Reward adjustment: ${redeemMap[entry.sourceId].reward.name}`
                : (entry.note || 'Reward adjustment');
        }

        if (entry.sourceType === POINT_SOURCE_TYPES.ADMIN_EDIT) {
            sourceLabel = entry.note || 'Admin adjusted points';
        }

        return {
            ...entry,
            direction: entry.points >= 0 ? 'earned' : 'spent',
            sourceLabel
        };
    });
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

const ensureReferenceName = async (tx, modelName, id) => {
    if (!id) {
        return null;
    }

    const entity = await tx[modelName].findUnique({
        where: { id },
        select: { id: true, name: true }
    });

    if (!entity) {
        throw new Error(`${modelName} not found`);
    }

    return entity;
};

const ensureReferenceIdsExist = async (tx, modelName, ids) => {
    if (!ids.length) {
        return;
    }

    const count = await tx[modelName].count({
        where: {
            id: {
                in: ids
            }
        }
    });

    if (count !== ids.length) {
        throw new Error(`Invalid ${modelName} selection`);
    }
};

const ensureInstructorPresetExists = async (tx, id) => {
    if (!id) {
        return null;
    }

    const preset = await tx.instructorPreset.findUnique({
        where: { id }
    });

    if (!preset) {
        throw new Error('Instructor preset not found');
    }

    return preset;
};

const buildTemporaryStateData = (input) => {
    const isTemporary = Boolean(input.isTemporary);
    const expiredAt = parseOptionalDate(input.expiredAt);

    if (isTemporary && !expiredAt) {
        throw new Error('Temporary items require an expiration date');
    }

    return {
        isTemporary,
        expiredAt: isTemporary ? expiredAt : null
    };
};

const buildUserMutationData = async (tx, inputData, { isCreate = false } = {}) => {
    const data = {};
    const { password, pointsBalance, ...baseData } = inputData;

    if (baseData.name !== undefined) {
        data.name = baseData.name;
    }

    if (baseData.email !== undefined) {
        data.email = baseData.email;
    }

    if (baseData.role !== undefined) {
        if (![USER_ROLES.USER, USER_ROLES.MANAGER, USER_ROLES.ADMIN].includes(baseData.role)) {
            throw new Error('Invalid role');
        }
        data.role = baseData.role;
    }

    if (password) {
        data.password = await bcrypt.hash(password, 10);
    } else if (isCreate) {
        data.password = await bcrypt.hash('password123', 10);
    }

    if (pointsBalance !== undefined) {
        data.pointsBalance = parseInteger(pointsBalance, 0);
    } else if (isCreate) {
        data.pointsBalance = 0;
    }

    const departmentId = normalizeNullableId(baseData.departmentId);
    if (departmentId !== undefined) {
        const department = await ensureReferenceName(tx, 'department', departmentId);
        data.departmentId = department?.id || null;
        data.department = department?.name || null;
    } else if (baseData.department !== undefined && !isCreate) {
        data.department = baseData.department || null;
    }

    const tierId = normalizeNullableId(baseData.tierId);
    if (tierId !== undefined) {
        const tier = await ensureReferenceName(tx, 'tier', tierId);
        data.tierId = tier?.id || null;
    }

    if (baseData.employmentDate !== undefined) {
        data.employmentDate = baseData.employmentDate ? new Date(baseData.employmentDate) : null;
    } else if (isCreate) {
        data.employmentDate = new Date();
    }

    return data;
};

const buildCourseMutationPayload = async (tx, input) => {
    const visibleDepartmentIds = normalizeIdArray(input.visibleDepartmentIds);
    const visibleTierIds = normalizeIdArray(input.visibleTierIds);
    const categoryId = normalizeNullableId(input.categoryId);
    const instructorPresetId = normalizeNullableId(input.instructorPresetId);
    const temporaryState = buildTemporaryStateData(input);

    // Using sequential await instead of Promise.all to prevent "Transaction already closed" 
    // errors when one check fails while others are still running on the same tx object.
    await ensureReferenceIdsExist(tx, 'department', visibleDepartmentIds);
    await ensureReferenceIdsExist(tx, 'tier', visibleTierIds);
    await ensureReferenceName(tx, 'category', categoryId);
    const instructorPreset = await ensureInstructorPresetExists(tx, instructorPresetId);

    const data = {
        title: input.title,
        description: input.description || null,
        categoryId,
        instructorPresetId: instructorPreset?.id || null,
        points: parseInteger(input.points, 0),
        status: input.status || undefined,
        image: input.image || null,
        visibleToAll: input.visibleToAll !== undefined ? Boolean(input.visibleToAll) : true,
        ...temporaryState,
        instructorName: input.instructorName || instructorPreset?.name || null,
        instructorRole: input.instructorRole || instructorPreset?.role || null,
        instructorAvatar: input.instructorAvatar || instructorPreset?.avatar || null,
        instructorBio: input.instructorBio || instructorPreset?.bio || null,
        previewVideoUrl: input.previewVideoUrl || null,
        totalDuration: input.totalDuration || null,
        whatYouWillLearn: input.whatYouWillLearn || null,
        whatYouWillGet: input.whatYouWillGet || null,
        rating: parseFloatValue(input.rating, 4.8),
        reviewCount: parseInteger(input.reviewCount, 1240),
        studentCount: parseInteger(input.studentCount, 5000)
    };

    return {
        data,
        visibleDepartmentIds,
        visibleTierIds
    };
};

const saveCourseVisibility = async (tx, courseId, visibleToAll, visibleDepartmentIds, visibleTierIds) => {
    await tx.courseDepartmentAccess.deleteMany({ where: { courseId } });
    await tx.courseTierAccess.deleteMany({ where: { courseId } });

    if (visibleToAll) {
        return;
    }

    if (visibleDepartmentIds.length > 0) {
        await tx.courseDepartmentAccess.createMany({
            data: visibleDepartmentIds.map((departmentId) => ({
                courseId,
                departmentId
            }))
        });
    }

    if (visibleTierIds.length > 0) {
        await tx.courseTierAccess.createMany({
            data: visibleTierIds.map((tierId) => ({
                courseId,
                tierId
            }))
        });
    }
};

const buildCategoryMutationPayload = async (tx, input) => {
    const visibleDepartmentIds = normalizeIdArray(input.visibleDepartmentIds);
    const visibleTierIds = normalizeIdArray(input.visibleTierIds);
    const temporaryState = buildTemporaryStateData(input);

    await ensureReferenceIdsExist(tx, 'department', visibleDepartmentIds);
    await ensureReferenceIdsExist(tx, 'tier', visibleTierIds);

    const mutationData = {
        name: sanitizeName(input.name, 'Category'),
        icon: input.icon || 'Grid',
        type: input.type || 'KM_COURSE',
        visibleToAll: input.visibleToAll !== undefined ? Boolean(input.visibleToAll) : true,
        ...temporaryState
    };

    if (input.order !== undefined) {
        mutationData.order = parseInteger(input.order, 0);
    }

    return {
        data: mutationData,
        visibleDepartmentIds,
        visibleTierIds
    };
};

const saveCategoryVisibility = async (tx, categoryId, visibleToAll, visibleDepartmentIds, visibleTierIds) => {
    await tx.categoryDepartmentAccess.deleteMany({ where: { categoryId } });
    await tx.categoryTierAccess.deleteMany({ where: { categoryId } });

    if (visibleToAll) {
        return;
    }

    if (visibleDepartmentIds.length > 0) {
        await tx.categoryDepartmentAccess.createMany({
            data: visibleDepartmentIds.map((departmentId) => ({
                categoryId,
                departmentId
            }))
        });
    }

    if (visibleTierIds.length > 0) {
        await tx.categoryTierAccess.createMany({
            data: visibleTierIds.map((tierId) => ({
                categoryId,
                tierId
            }))
        });
    }
};

const buildAnnouncementQuestionsCreate = (questions = []) => questions.map((question, index) => ({
    text: question.text,
    order: index,
    points: parseInteger(question.points, 1),
    choices: {
        create: (question.choices || []).map((choice) => ({
            text: choice.text,
            isCorrect: !!choice.isCorrect
        }))
    }
}));

const buildAnnouncementMutationPayload = async (tx, actor, input) => {
    const requestedDepartmentId = normalizeNullableId(input.departmentId);
    const scope = (input.scope || ANNOUNCEMENT_SCOPES.DEPARTMENT).toUpperCase();
    
    // Only admins can create GLOBAL announcements
    const effectiveScope = actor.isAdmin ? scope : ANNOUNCEMENT_SCOPES.DEPARTMENT;
    
    let departmentId = null;
    if (effectiveScope === ANNOUNCEMENT_SCOPES.DEPARTMENT) {
        departmentId = actor.isManager ? actor.departmentId : requestedDepartmentId;
        
        if (!departmentId) {
            throw new Error('Department is required for department-scoped announcements');
        }
        
        await ensureReferenceName(tx, 'department', departmentId);
    }


    const type = String(input.type || 'article').trim().toLowerCase();
    const questions = Array.isArray(input.questions) ? input.questions : [];
    const formattedQuestions = type === 'quiz' ? buildAnnouncementQuestionsCreate(questions) : [];

    return {
        data: {
            title: sanitizeName(input.title, 'Announcement'),
            description: input.description || null,
            image: input.image || null,
            type,
            contentUrl: input.contentUrl || null,
            content: input.content || null,
            duration: input.duration ? String(input.duration) : null,
            passScore: type === 'quiz' ? parseInteger(input.passScore, 60) : null,
            scope: effectiveScope,
            departmentId,
            status: input.status || ENTITY_STATUS.PUBLISHED,
            expiredAt: parseOptionalDate(input.expiredAt, 'Announcement expiration date')

        },
        formattedQuestions
    };
};

const buildAnnouncementWhereForActor = (actor, extraWhere = {}) => (
    actor.isManager
        ? {
            OR: [
                { scope: ANNOUNCEMENT_SCOPES.GLOBAL },
                { departmentId: actor.departmentId }
            ],
            ...extraWhere
        }
        : extraWhere

);

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

const buildLearnerWhere = (departmentId = null) => ({
    role: USER_ROLES.USER,
    ...(departmentId ? { departmentId } : {})
});

const buildVisibleCourseWhereForDashboard = (departmentId = null) => (
    departmentId
        ? buildDepartmentVisibleCourseWhere(departmentId)
        : { status: ENTITY_STATUS.PUBLISHED }
);

const buildDateOverlapWhere = (start, end) => ({
    OR: [
        { startedAt: { gte: start, lte: end } },
        { completedAt: { gte: start, lte: end } }
    ]
});

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

const getDashboardUserSummary = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    department: user.departmentRef?.name || user.department || null
});

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

        // GOAL COMPLIANCE CALCULATION
        let goalTotalAssignments = 0;
        let goalSuccessfulAssignments = 0;

        if (activeGoals.length > 0) {
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
            const userCompletionCountMap = enrollments
                .filter(e => e.status === ENROLLMENT_STATUS.COMPLETED)
                .reduce((acc, e) => {
                    if (!acc[e.userId]) acc[e.userId] = new Set();
                    acc[e.userId].add(e.courseId);
                    return acc;
                }, {});

            activeGoals.forEach(goal => {
                const targetUserIds = goal.scope === GOAL_SCOPES.GLOBAL
                    ? allComplianceUserIds
                    : (usersByDept[goal.departmentId] || []);

                if (targetUserIds.length === 0) return;

                const goalCourseIds = goal.courses.map(c => c.courseId);
                
                targetUserIds.forEach(userId => {
                    goalTotalAssignments++;
                    const userCompletedCourseIds = userCompletionCountMap[userId] || new Set();
                    
                    let isGoalMet = false;
                    if (goal.type === 'ANY') {
                        // For ANY goals, we need to check completions within the goal's lifespan
                        // Since dashboard enrollments are already period-filtered, we check count
                        // (This is an approximation for the dashboard view)
                        const count = [...userCompletedCourseIds].length; 
                        isGoalMet = count >= goal.targetCount;
                    } else {
                        const completedSpecificCount = goalCourseIds.filter(id => userCompletedCourseIds.has(id)).length;
                        isGoalMet = completedSpecificCount >= goal.targetCount;
                    }

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

// USERS
const getUsers = async (authUser) => {
    const actor = await getActorContext(authUser);
    const users = await prisma.user.findMany({
        where: buildAdminManagedUsersWhere(actor),
        include: userInclude,
        orderBy: [
            { tier: { order: 'asc' } },
            { role: 'asc' },
            { name: 'asc' }
        ]
    });

    const balances = await prisma.pointsLedger.groupBy({
        by: ['userId'],
        where: {
            userId: {
                in: users.map((user) => user.id)
            }
        },
        _sum: {
            points: true
        }
    });

    const balanceMap = Object.fromEntries(
        balances.map((item) => [item.userId, item._sum.points || 0])
    );

    return users.map((user) => ({
        ...mapUserRecord(user),
        pointsBalance: balanceMap[user.id] ?? 0
    }));
};

const getUserDetails = async (id, authUser) => {
    const actor = await getActorContext(authUser);
    const user = await prisma.user.findFirst({
        where: await buildScopedUserWhere(actor, id),
        include: {
            departmentRef: true,
            tier: true,
            enrollments: {
                include: {
                    course: {
                        include: {
                            category: true
                        }
                    }
                },
                orderBy: { startedAt: 'desc' }
            },
            _count: {
                select: {
                    enrollments: true
                }
            }
        }
    });

    if (!user) {
        throw new Error('User not found');
    }

    const mappedUser = mapUserRecord(user);
    const pointsHistory = await buildPointsHistory(user.id);
    const actualPointsBalance = pointsHistory.reduce((sum, entry) => sum + entry.points, 0);

    return {
        ...mappedUser,
        pointsBalance: actualPointsBalance,
        enrollments: user.enrollments.map((enrollment) => ({
            id: enrollment.id,
            status: enrollment.status,
            progressPercent: enrollment.progressPercent,
            startedAt: enrollment.startedAt,
            completedAt: enrollment.completedAt,
            course: {
                id: enrollment.course.id,
                title: enrollment.course.title,
                categoryName: enrollment.course.category?.name || null,
                points: enrollment.course.points
            }
        })),
        pointsHistory
    };
};

const createUser = async (inputData) => prisma.$transaction(async (tx) => {
    try {
        const data = await buildUserMutationData(tx, inputData, { isCreate: true });

        const user = await tx.user.create({
            data: {
                ...data,
                role: inputData.role || USER_ROLES.USER
            },
            include: {
                departmentRef: true,
                tier: true
            }
        });

        if ((data.pointsBalance || 0) > 0) {
            await tx.pointsLedger.create({
                data: {
                    userId: user.id,
                    sourceType: POINT_SOURCE_TYPES.ADMIN_EDIT,
                    points: data.pointsBalance,
                    note: 'Initial balance set during user creation'
                }
            });
        }

        return mapUserRecord(user);
    } catch (error) {
        console.error('Transaction Error in createUser:', error.message);
        throw error;
    }
}, {
    maxWait: TRANSACTION_TIMEOUTS.DEFAULT_MAX_WAIT,
    timeout: TRANSACTION_TIMEOUTS.DEFAULT_TIMEOUT
});

const updateUser = async (id, inputData) => prisma.$transaction(async (tx) => {
    try {
        const data = await buildUserMutationData(tx, inputData);

        if (inputData.pointsBalance !== undefined) {
            const targetBalance = parseInteger(inputData.pointsBalance, 0);
            const ledgerEntries = await tx.pointsLedger.findMany({
                where: { userId: id }
            });
            const currentBalance = ledgerEntries.reduce((sum, entry) => sum + entry.points, 0);
            const difference = targetBalance - currentBalance;

            if (difference !== 0) {
                await tx.pointsLedger.create({
                    data: {
                        userId: id,
                        sourceType: POINT_SOURCE_TYPES.ADMIN_EDIT,
                        points: difference,
                        note: `Admin adjusted balance by ${difference} (Target: ${targetBalance})`
                    }
                });
            }
        }

        const user = await tx.user.update({
            where: { id },
            data,
            include: {
                departmentRef: true,
                tier: true
            }
        });

        return mapUserRecord(user);
    } catch (error) {
        console.error('Transaction Error in updateUser:', error.message);
        throw error;
    }
}, {
    maxWait: TRANSACTION_TIMEOUTS.DEFAULT_MAX_WAIT,
    timeout: TRANSACTION_TIMEOUTS.DEFAULT_TIMEOUT
});

const deleteUser = async (id) => prisma.user.delete({ where: { id } });

// DEPARTMENTS
const getDepartments = async (authUser) => {
    const actor = await getActorContext(authUser);

    return prisma.department.findMany({
        where: actor.role === USER_ROLES.MANAGER && actor.departmentId
            ? { id: actor.departmentId }
            : undefined,
        orderBy: { name: 'asc' }
    });
};

const createDepartment = async (data) => prisma.department.create({
    data: {
        name: sanitizeName(data.name, 'Department')
    }
});

const updateDepartment = async (id, data) => prisma.department.update({
    where: { id },
    data: {
        name: sanitizeName(data.name, 'Department')
    }
});

const deleteDepartment = async (id) => prisma.department.delete({
    where: { id }
});

// TIERS
const getTiers = async (authUser) => {
    await getActorContext(authUser);

    return prisma.tier.findMany({
        orderBy: { order: 'asc' }
    });
};

const createTier = async (data) => prisma.tier.create({
    data: {
        name: sanitizeName(data.name, 'Tier'),
        accessAdmin: Boolean(data.accessAdmin),
        order: parseInteger(data.order, 0)
    }
});

const updateTier = async (id, data) => prisma.tier.update({
    where: { id },
    data: {
        name: sanitizeName(data.name, 'Tier'),
        accessAdmin: Boolean(data.accessAdmin),
        order: parseInteger(data.order, 0)
    }
});

const deleteTier = async (id) => prisma.tier.delete({
    where: { id }
});

const reorderTiers = async (tierIds) => prisma.$transaction(
    tierIds.map((id, index) => prisma.tier.update({
        where: { id },
        data: { order: index }
    }))
);

// INSTRUCTORS
const getInstructorPresets = async () => prisma.instructorPreset.findMany({
    orderBy: [
        { name: 'asc' },
        { createdAt: 'desc' }
    ]
});

const createInstructorPreset = async (input) => prisma.instructorPreset.create({
    data: {
        name: sanitizeName(input.name, 'Instructor preset'),
        role: input.role || null,
        avatar: input.avatar || null,
        bio: input.bio || null
    }
});

const updateInstructorPreset = async (id, input) => prisma.instructorPreset.update({
    where: { id },
    data: {
        name: sanitizeName(input.name, 'Instructor preset'),
        role: input.role || null,
        avatar: input.avatar || null,
        bio: input.bio || null
    }
});

const deleteInstructorPreset = async (id) => prisma.instructorPreset.delete({
    where: { id }
});


// COURSES
const getAdminCourses = async () => {
    const courses = await prisma.course.findMany({
        include: courseInclude,
        orderBy: [
            { isTemporary: 'desc' },
            { createdAt: 'desc' }
        ]
    });

    return courses.map(mapCourseRecord);
};

const createCourse = async (input) => prisma.$transaction(async (tx) => {
    try {
        const { data, visibleDepartmentIds, visibleTierIds } = await buildCourseMutationPayload(tx, input);

        const course = await tx.course.create({
            data
        });

        await saveCourseVisibility(tx, course.id, data.visibleToAll, visibleDepartmentIds, visibleTierIds);

        const createdCourse = await tx.course.findUnique({
            where: { id: course.id },
            include: courseInclude
        });

        return mapCourseRecord(createdCourse);
    } catch (error) {
        console.error('Transaction Error in createCourse:', error.message);
        throw error;
    }
}, {
    maxWait: TRANSACTION_TIMEOUTS.DEFAULT_MAX_WAIT, 
    timeout: TRANSACTION_TIMEOUTS.LONG_RUNNING_TIMEOUT 
});

const updateCourse = async (id, input) => prisma.$transaction(async (tx) => {
    try {
        const { data, visibleDepartmentIds, visibleTierIds } = await buildCourseMutationPayload(tx, input);

        await tx.course.update({
            where: { id },
            data
        });

        await saveCourseVisibility(tx, id, data.visibleToAll, visibleDepartmentIds, visibleTierIds);

        const updatedCourse = await tx.course.findUnique({
            where: { id },
            include: courseInclude
        });

        return mapCourseRecord(updatedCourse);
    } catch (error) {
        console.error('Transaction Error in updateCourse:', error.message);
        throw error;
    }
}, {
    maxWait: TRANSACTION_TIMEOUTS.DEFAULT_MAX_WAIT,
    timeout: TRANSACTION_TIMEOUTS.LONG_RUNNING_TIMEOUT
});

const republishCourse = async (id) => {
    const course = await prisma.course.update({
        where: { id },
        data: {
            isTemporary: false,
            expiredAt: null,
            status: ENTITY_STATUS.PUBLISHED
        },
        include: courseInclude
    });

    return mapCourseRecord(course);
};

const archiveCourse = async (id) => {
    const pastDate = new Date();
    pastDate.setMinutes(pastDate.getMinutes() - 5);
    
    const course = await prisma.course.update({
        where: { id },
        data: {
            isTemporary: true,
            expiredAt: pastDate
        },
        include: courseInclude
    });

    return mapCourseRecord(course);
};

const getCourseHistory = async (courseId, filters = {}) => {
    const { departmentId, tierId, month, year, status, dateField } = filters;
    const effectiveDateField = dateField === 'completedAt' ? 'completedAt' : 'startedAt';
    const dateRange = getMonthDateRange(month, year);
    const hasDateFilter = Boolean(dateRange);

    const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
            departmentAccess: {
                select: {
                    departmentId: true
                }
            },
            tierAccess: {
                include: {
                    tier: {
                        select: {
                            order: true
                        }
                    }
                }
            }
        }
    });

    if (!course) {
        throw new Error('Course not found');
    }

    const accessibleDepartmentIds = course.departmentAccess.map((entry) => entry.departmentId);
    const maxAllowedTierOrder = course.tierAccess.reduce((highestOrder, entry) => {
        const entryOrder = entry.tier?.order;
        if (entryOrder === undefined || entryOrder === null) {
            return highestOrder;
        }

        return highestOrder === null ? entryOrder : Math.max(highestOrder, entryOrder);
    }, null);

    const userWhere = {
        role: { in: MANAGED_USER_ROLES },
        status: USER_STATUS.ACTIVE
    };

    if (departmentId) {
        userWhere.departmentId = departmentId;
    }

    if (tierId) {
        userWhere.tierId = tierId;
    }

    if (!course.visibleToAll) {
        if (accessibleDepartmentIds.length > 0) {
            userWhere.departmentId = departmentId
                ? departmentId
                : { in: accessibleDepartmentIds };
        }

        if (maxAllowedTierOrder !== null) {
            userWhere.tier = {
                is: {
                    order: { lte: maxAllowedTierOrder }
                }
            };
        }
    }

    const enrollmentWhere = {
        courseId,
        user: userWhere
    };

    if (status && status !== ENROLLMENT_STATUS.NOT_STARTED) {
        enrollmentWhere.status = status;
    }

    if (hasDateFilter) {
        enrollmentWhere[effectiveDateField] = {
            gte: dateRange.start,
            lte: dateRange.end
        };
    }

    const enrollments = await prisma.userCourse.findMany({
        where: enrollmentWhere,
        select: {
            id: true,
            userId: true,
            status: true,
            progressPercent: true,
            startedAt: true,
            completedAt: true,
            user: {
                select: {
                    id: true,
                    name: true,
                    departmentRef: {
                        select: { name: true }
                    },
                    tier: {
                        select: { name: true }
                    }
                }
            }
        },
        orderBy: [
            { completedAt: 'desc' },
            { startedAt: 'desc' }
        ]
    });

    const enrolledUserIds = enrollments.map((enrollment) => enrollment.userId);
    const shouldIncludeNotStarted = !hasDateFilter && (!status || status === ENROLLMENT_STATUS.NOT_STARTED);

    let notStartedUsers = [];
    if (shouldIncludeNotStarted) {
        notStartedUsers = await prisma.user.findMany({
            where: {
                ...userWhere,
                ...(enrolledUserIds.length > 0
                    ? {
                        id: {
                            notIn: enrolledUserIds
                        }
                    }
                    : {})
            },
            select: {
                id: true,
                name: true,
                departmentRef: {
                    select: { name: true }
                },
                tier: {
                    select: { name: true }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });
    }

    let quizMap = {};
    if (enrolledUserIds.length > 0) {
        const quizAttemptsContext = await prisma.quizAttempt.findMany({
            where: {
                userId: { in: enrolledUserIds },
                lesson: { courseId }
            },
            select: {
                userId: true,
                score: true,
                status: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });

        quizMap = quizAttemptsContext.reduce((acc, attempt) => {
            if (!acc[attempt.userId]) {
                acc[attempt.userId] = attempt;
            }

            return acc;
        }, {});
    }

    const records = enrollments.map((enrollment) => ({
        id: enrollment.id,
        user: {
            id: enrollment.user.id,
            name: enrollment.user.name,
            department: enrollment.user.departmentRef?.name || '-',
            tier: enrollment.user.tier?.name || '-'
        },
        status: enrollment.status,
        progressPercent: enrollment?.progressPercent || 0,
        startedAt: enrollment?.startedAt || null,
        completedAt: enrollment?.completedAt || null,
        quizScore: quizMap[enrollment.userId]?.score ?? null,
        quizPassed: quizMap[enrollment.userId]?.status === 'PASSED'
    }));

    const notStartedRecords = notStartedUsers.map((user) => ({
        id: `not-started-${user.id}`,
        user: {
            id: user.id,
            name: user.name,
            department: user.departmentRef?.name || '-',
            tier: user.tier?.name || '-'
        },
        status: ENROLLMENT_STATUS.NOT_STARTED,
        progressPercent: 0,
        startedAt: null,
        completedAt: null,
        quizScore: null,
        quizPassed: false
    }));

    const filteredRecords = [...records, ...notStartedRecords].filter((record) => {
        if (status && record.status !== status) {
            return false;
        }

        if (hasDateFilter) {
            const targetDate = record[effectiveDateField];
            if (!targetDate) {
                return false;
            }

            const selectedDate = new Date(targetDate);
            return selectedDate >= dateRange.start && selectedDate <= dateRange.end;
        }

        return true;
    });

    return filteredRecords.sort((left, right) => {
        const leftPrimaryDate = left[effectiveDateField] ? new Date(left[effectiveDateField]).getTime() : null;
        const rightPrimaryDate = right[effectiveDateField] ? new Date(right[effectiveDateField]).getTime() : null;

        if (leftPrimaryDate !== null && rightPrimaryDate !== null) {
            return rightPrimaryDate - leftPrimaryDate;
        }

        if (leftPrimaryDate !== null) {
            return -1;
        }

        if (rightPrimaryDate !== null) {
            return 1;
        }

        return left.user.name.localeCompare(right.user.name, 'th');
    });
};

const deleteCourse = async (id) => prisma.course.delete({ where: { id } });

// ANNOUNCEMENTS
const getAdminAnnouncements = async (authUser) => {
    const actor = await getActorContext(authUser);
    const announcements = await prisma.announcement.findMany({
        where: buildAnnouncementWhereForActor(actor),
        include: announcementInclude,
        orderBy: [
            { createdAt: 'desc' }
        ]
    });

    return announcements.map(mapAnnouncementRecord);
};

const createAnnouncement = async (authUser, input) => prisma.$transaction(async (tx) => {
    const actor = await getActorContext(authUser);
    const { data, formattedQuestions } = await buildAnnouncementMutationPayload(tx, actor, input);

    const announcement = await tx.announcement.create({
        data: {
            ...data,
            createdById: actor.id,
            questions: formattedQuestions.length > 0
                ? {
                    create: formattedQuestions
                }
                : undefined
        },
        include: announcementInclude
    });

    return mapAnnouncementRecord(announcement);
}, {
    maxWait: TRANSACTION_TIMEOUTS.DEFAULT_MAX_WAIT,
    timeout: TRANSACTION_TIMEOUTS.LONG_RUNNING_TIMEOUT
});

const updateAnnouncement = async (id, authUser, input) => prisma.$transaction(async (tx) => {
    const actor = await getActorContext(authUser);
    const existingAnnouncement = await tx.announcement.findFirst({
        where: buildAnnouncementWhereForActor(actor, { id }),
        select: { id: true }
    });

    if (!existingAnnouncement) {
        throw new Error('Announcement not found');
    }

    const { data, formattedQuestions } = await buildAnnouncementMutationPayload(tx, actor, input);

    await tx.announcementQuestion.deleteMany({
        where: { announcementId: id }
    });

    const announcement = await tx.announcement.update({
        where: { id },
        data: {
            ...data,
            questions: formattedQuestions.length > 0
                ? {
                    create: formattedQuestions
                }
                : undefined
        },
        include: announcementInclude
    });

    return mapAnnouncementRecord(announcement);
}, {
    maxWait: TRANSACTION_TIMEOUTS.DEFAULT_MAX_WAIT,
    timeout: TRANSACTION_TIMEOUTS.LONG_RUNNING_TIMEOUT
}).then((result) => {
    clearAnnouncementHistoryCache(id);
    return result;
});

const deleteAnnouncement = async (id, authUser) => {
    const actor = await getActorContext(authUser);
    const announcement = await prisma.announcement.findFirst({
        where: buildAnnouncementWhereForActor(actor, { id }),
        select: { id: true }
    });

    if (!announcement) {
        throw new Error('Announcement not found');
    }

    return prisma.announcement.delete({
        where: { id }
    }).then((result) => {
        clearAnnouncementHistoryCache(id);
        return result;
    });
};

// CATEGORIES
const getCategories = async () => {
    const categories = await prisma.category.findMany({
        include: categoryInclude,
        orderBy: [
            { isTemporary: 'desc' },
            { order: 'asc' }
        ]
    });

    return categories.map(mapCategoryRecord);
};

const createCategory = async (input) => prisma.$transaction(async (tx) => {
    const { data, visibleDepartmentIds, visibleTierIds } = await buildCategoryMutationPayload(tx, input);

    const category = await tx.category.create({
        data
    });

    await saveCategoryVisibility(tx, category.id, data.visibleToAll, visibleDepartmentIds, visibleTierIds);

    const createdCategory = await tx.category.findUnique({
        where: { id: category.id },
        include: categoryInclude
    });

    return mapCategoryRecord(createdCategory);
});

const updateCategory = async (id, input) => prisma.$transaction(async (tx) => {
    const { data, visibleDepartmentIds, visibleTierIds } = await buildCategoryMutationPayload(tx, input);

    await tx.category.update({
        where: { id },
        data
    });

    await saveCategoryVisibility(tx, id, data.visibleToAll, visibleDepartmentIds, visibleTierIds);

    const updatedCategory = await tx.category.findUnique({
        where: { id },
        include: categoryInclude
    });

    return mapCategoryRecord(updatedCategory);
});

const republishCategory = async (id) => {
    const category = await prisma.category.update({
        where: { id },
        data: {
            isTemporary: false,
            expiredAt: null
        },
        include: categoryInclude
    });

    return mapCategoryRecord(category);
};

const archiveCategory = async (id) => prisma.category.update({
    where: { id },
    data: {
        isTemporary: true,
        expiredAt: new Date()
    },
    include: categoryInclude
});

const deleteCategory = async (id) => prisma.category.delete({
    where: { id }
});

const reorderCategories = async (categoryIds) => prisma.$transaction(
    categoryIds.map((id, index) => prisma.category.update({
        where: { id },
        data: { order: index }
    }))
);

// REWARDS
const getAdminRewards = async () => prisma.reward.findMany({
    orderBy: { createdAt: 'desc' }
});

const createReward = async (data) => prisma.reward.create({
    data: {
        ...data,
        pointsCost: parseInteger(data.pointsCost, 0),
        stock: parseInteger(data.stock, 0),
        maxPerUser: parseInteger(data.maxPerUser, 1)
    }
});

const updateReward = async (id, data) => {
    const updateData = { ...data };

    if (updateData.maxPerUser !== undefined) {
        updateData.maxPerUser = parseInteger(updateData.maxPerUser, 1);
    }

    if (updateData.pointsCost !== undefined) {
        updateData.pointsCost = parseInteger(updateData.pointsCost, 0);
    }

    if (updateData.stock !== undefined) {
        updateData.stock = parseInteger(updateData.stock, 0);
    }

    return prisma.reward.update({
        where: { id },
        data: updateData
    });
};

const deleteReward = async (id) => prisma.reward.delete({
    where: { id }
});

// REDEMPTIONS
const getRedeemRequests = async () => prisma.redeemRequest.findMany({
    include: {
        user: {
            select: {
                name: true,
                email: true
            }
        },
        reward: true
    },
    orderBy: { requestedAt: 'desc' }
});

const updateRedeemStatus = async (id, status, adminNote) => {
    const request = await prisma.redeemRequest.findUnique({ where: { id } });
    if (!request) {
        throw new Error('Request not found');
    }

    return prisma.$transaction(async (tx) => {
        try {
            if (status === REDEEM_STATUS.REJECTED && request.status !== REDEEM_STATUS.REJECTED) {
                await tx.pointsLedger.create({
                    data: {
                        userId: request.userId,
                        sourceType: POINT_SOURCE_TYPES.REWARD_ADJUST,
                        sourceId: request.id,
                        points: request.pointsCost,
                        note: `Refund for rejected redeem: ${id}`
                    }
                });

                await tx.reward.update({
                    where: { id: request.rewardId },
                    data: {
                        stock: {
                            increment: 1
                        }
                    }
                });
            }

            return tx.redeemRequest.update({
                where: { id },
                data: {
                    status,
                    adminNote,
                    updatedAt: new Date()
                }
            });
        } catch (error) {
            console.error('Transaction Error in updateRedeemStatus:', error.message);
            throw error;
        }
    }, {
        maxWait: TRANSACTION_TIMEOUTS.DEFAULT_MAX_WAIT,
        timeout: TRANSACTION_TIMEOUTS.DEFAULT_TIMEOUT
    });
};

// LESSONS
const getCourseLessons = async (courseId) => prisma.lesson.findMany({
    where: { courseId },
    include: {
        questions: {
            include: { choices: true },
            orderBy: { order: 'asc' }
        }
    },
    orderBy: { order: 'asc' }
});

const createLesson = async (data) => {
    const { questions, ...lessonData } = data;
    const formattedData = {
        ...lessonData,
        order: parseInteger(lessonData.order, 0),
        points: parseInteger(lessonData.points, 0),
        passScore: parseInteger(lessonData.passScore, 0),
        duration: lessonData.duration ? String(lessonData.duration) : undefined
    };

    if (lessonData.type === 'quiz' && questions && questions.length > 0) {
        formattedData.questions = {
            create: questions.map((question, index) => ({
                text: question.text,
                order: index,
                points: parseInteger(question.points, 1),
                choices: {
                    create: question.choices.map((choice) => ({
                        text: choice.text,
                        isCorrect: !!choice.isCorrect
                    }))
                }
            }))
        };
    }

    return prisma.lesson.create({
        data: formattedData,
        include: {
            questions: {
                include: { choices: true }
            }
        }
    });
};

const updateLesson = async (id, data) => {
    const { questions, ...lessonData } = data;

    if (lessonData.type === 'quiz') {
        await prisma.question.deleteMany({
            where: { lessonId: id }
        });
    }

    const formattedData = {
        ...lessonData,
        order: parseInteger(lessonData.order, 0),
        points: parseInteger(lessonData.points, 0),
        passScore: parseInteger(lessonData.passScore, 0),
        duration: lessonData.duration ? String(lessonData.duration) : undefined
    };

    if (lessonData.type === 'quiz' && questions && questions.length > 0) {
        formattedData.questions = {
            create: questions.map((question, index) => ({
                text: question.text,
                order: index,
                points: parseInteger(question.points, 1),
                choices: {
                    create: question.choices.map((choice) => ({
                        text: choice.text,
                        isCorrect: !!choice.isCorrect
                    }))
                }
            }))
        };
    }

    return prisma.lesson.update({
        where: { id },
        data: formattedData,
        include: {
            questions: {
                include: { choices: true }
            }
        }
    });
};

const deleteLesson = async (id) => prisma.lesson.delete({ where: { id } });

const reorderLessons = async (lessonIds) => prisma.$transaction(
    lessonIds.map((id, index) => prisma.lesson.update({
        where: { id },
        data: { order: index }
    }))
);

const getCourseQuizAttempts = async (courseId) => {
    const attempts = await prisma.quizAttempt.findMany({
        where: {
            lesson: {
                courseId
            }
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
                            name: true
                        }
                    },
                    tier: {
                        select: {
                            name: true
                        }
                    }
                }
            },
            lesson: {
                select: {
                    id: true,
                    title: true,
                    passScore: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    return attempts.map((attempt) => ({
        ...attempt,
        user: {
            ...attempt.user,
            department: attempt.user.departmentRef?.name || attempt.user.department || null,
            tier: attempt.user.tier?.name || null
        }
    }));
};

const archiveAnnouncement = async (id, authUser) => {
    const actor = await getActorContext(authUser);
    const where = buildAnnouncementWhereForActor(actor, { id });

    return prisma.announcement.update({
        where: { id },
        data: {
            expiredAt: new Date()
        }
    }).then((result) => {
        clearAnnouncementHistoryCache(id);
        return result;
    });
};

const republishAnnouncement = async (id, authUser) => {
    const actor = await getActorContext(authUser);
    const where = buildAnnouncementWhereForActor(actor, { id });

    return prisma.announcement.update({
        where: { id },
        data: {
            expiredAt: null
        }
    }).then((result) => {
        clearAnnouncementHistoryCache(id);
        return result;
    });
};

const getAnnouncementHistory = async (id, authUser) => {
    const actor = await getActorContext(authUser);
    const where = buildAnnouncementWhereForActor(actor, { id });

    const announcement = await prisma.announcement.findFirst({
        where
    });

    if (!announcement) {
        throw new Error('Announcement not found');
    }

    const cacheKey = getAnnouncementHistoryCacheKey(id, actor);

    return resolveAnnouncementHistoryCache(cacheKey, async () => {
        const views = await prisma.announcementView.findMany({
            where: { announcementId: id },
            select: {
                id: true,
                score: true,
                passed: true,
                viewedAt: true,
                updatedAt: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        department: true,
                        departmentRef: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: { viewedAt: 'desc' }
        });

        return views.map((view) => ({
            ...view,
            user: {
                ...view.user,
                department: view.user.departmentRef?.name || view.user.department || null
            }
        }));
    });
};

module.exports = {
    getDashboardStats,
    getAdvancedAnalytics,
    getUsers,
    getUserDetails,
    createUser,
    updateUser,
    deleteUser,
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    getTiers,
    createTier,
    updateTier,
    deleteTier,
    reorderTiers,
    getInstructorPresets,
    createInstructorPreset,
    updateInstructorPreset,
    deleteInstructorPreset,
    getAdminCourses,
    createCourse,
    updateCourse,
    republishCourse,
    archiveCourse,
    getCourseHistory,
    deleteCourse,
    getAdminAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    archiveAnnouncement,
    republishAnnouncement,
    getAnnouncementHistory,
    getCategories,
    createCategory,
    updateCategory,
    republishCategory,
    archiveCategory,
    deleteCategory,
    reorderCategories,
    getAdminRewards,
    createReward,
    updateReward,
    deleteReward,
    getRedeemRequests,
    updateRedeemStatus,
    getCourseLessons,
    createLesson,
    updateLesson,
    deleteLesson,
    reorderLessons,
    getCourseQuizAttempts
};
