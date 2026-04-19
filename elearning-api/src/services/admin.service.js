const prisma = require('../utils/prisma');
const bcrypt = require('bcryptjs');
const authHelpers = require('../utils/auth.helpers');
const { USER_ROLES } = require('../utils/constants/roles');
const { ENTITY_STATUS, ENROLLMENT_STATUS, REDEEM_STATUS } = require('../utils/constants/statuses');
const { POINT_SOURCE_TYPES } = require('../utils/constants/ledger');
const { TRANSACTION_TIMEOUTS } = require('../utils/constants/config');
const { ANNOUNCEMENT_SCOPES } = require('../utils/constants/scopes');


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

    return {
        data: {
            name: sanitizeName(input.name, 'Category'),
            icon: input.icon || 'Grid',
            type: input.type || 'KM_COURSE',
            order: parseInteger(input.order, 0),

            visibleToAll: input.visibleToAll !== undefined ? Boolean(input.visibleToAll) : true,
            ...temporaryState
        },
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

// DASHBOARD
const getDashboardStats = async (authUser) => {
    const actor = await getActorContext(authUser);
    const isManager = actor.role === USER_ROLES.MANAGER;
    const managedUsersWhere = buildAdminManagedUsersWhere(actor);
    const visibleCourseWhere = isManager
        ? buildDepartmentVisibleCourseWhere(actor.departmentId)
        : { status: ENTITY_STATUS.PUBLISHED };

    const [totalUsers, activeCourses, totalEnrollments, categories] = await Promise.all([
        prisma.user.count({ where: managedUsersWhere }),
        prisma.course.count({ where: visibleCourseWhere }),
        prisma.userCourse.count({
            where: isManager
                                ? {
                                    user: {
                                        departmentId: actor.departmentId,
                                        role: USER_ROLES.USER
                                    }
                                }
                : undefined
        }),
        prisma.category.findMany({
            include: {
                _count: {
                    select: {
                        courses: {
                            where: visibleCourseWhere
                        }
                    }
                }
            }
        })
    ]);

    const popularCoursesRaw = await prisma.course.findMany({
        where: visibleCourseWhere,
        include: {
            _count: {
                select: {
                    enrollments: isManager
                        ? {
                            where: {
                                user: {
                                    departmentId: actor.departmentId,
                                    role: USER_ROLES.USER
                                }
                            }
                        }
                        : true
                }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
    });

    const popularCourses = popularCoursesRaw
        .map((course) => ({
            id: course.id,
            title: course.title,
            students: course._count.enrollments,
            completionRate: '85%'
        }))
        .sort((left, right) => right.students - left.students)
        .slice(0, 5);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const weeklyEnrollments = await prisma.userCourse.findMany({
        where: {
            startedAt: {
                gte: weekStart
            },
            ...(isManager
                ? {
                    user: {
                        departmentId: actor.departmentId,
                        role: USER_ROLES.USER
                    }
                }
                : {})
        },
        select: {
            startedAt: true
        }
    });

    const countMap = {};
    weeklyEnrollments.forEach((enrollment) => {
        const day = new Date(enrollment.startedAt);
        day.setHours(0, 0, 0, 0);
        const key = day.toISOString().slice(0, 10);
        countMap[key] = (countMap[key] || 0) + 1;
    });

    const weeklyActivity = [];
    for (let i = 6; i >= 0; i -= 1) {
        const day = new Date();
        day.setDate(day.getDate() - i);
        day.setHours(0, 0, 0, 0);
        const key = day.toISOString().slice(0, 10);
        weeklyActivity.push({
            date: day.toLocaleDateString('th-TH', { weekday: 'short' }),
            count: countMap[key] || 0
        });
    }

    const coursesByType = await prisma.course.findMany({
        where: visibleCourseWhere,
        include: {
            category: true,
            _count: {
                select: {
                    enrollments: isManager
                        ? {
                            where: {
                                user: {
                                    departmentId: actor.departmentId,
                                    role: USER_ROLES.USER
                                }
                            }
                        }
                        : true
                }
            }
        }
    });

    const typeMap = {
        'STRAT_BUSINESS': { name: 'Business Acumen / Corporate Knowledge', value: 0, enrollmentCount: 0, courses: [] },
        'STRAT_CORE': { name: 'Core / Soft Skills', value: 0, enrollmentCount: 0, courses: [] },
        'STRAT_FUNCTIONAL': { name: 'Functional Skills', value: 0, enrollmentCount: 0, courses: [] },
        'STRAT_LEADERSHIP': { name: 'Leadership Skills', value: 0, enrollmentCount: 0, courses: [] },
        'STRAT_COMPLIANCE': { name: 'Compliance', value: 0, enrollmentCount: 0, courses: [] },
        'STRAT_DIGITAL': { name: 'Digital / Future Skills', value: 0, enrollmentCount: 0, courses: [] }
    };

    coursesByType.forEach(course => {
        const typeKey = course.category?.type || 'STRAT_BUSINESS';
        const group = typeMap[typeKey] || typeMap['STRAT_BUSINESS'];

        
        group.value += 1;
        group.enrollmentCount += course._count.enrollments;
        group.courses.push({
            id: course.id,
            title: course.title,
            students: course._count.enrollments
        });
    });

    const typeDistribution = Object.values(typeMap).filter(t => t.value > 0);

    return {
        totalUsers,
        activeCourses,
        totalEnrollments,
        popularCourses,
        weeklyActivity,
        categoryDistribution: categories
            .map((category) => ({
                name: category.name,
                value: category._count.courses
            }))
            .filter((category) => category.value > 0),
        typeDistribution,
        scope: isManager ? 'department' : 'global',
        department: isManager ? actor.department || null : null
    };
};

// ADVANCED DASHBOARD ANALYTICS
const getAdvancedAnalytics = async (authUser) => {
    const actor = await getActorContext(authUser);
    const isManager = actor.role === USER_ROLES.MANAGER;
    const departmentId = isManager ? actor.departmentId : null;

    try {
        // 1. Skill Gap Analysis (Mastery by Category Type)
        // Optimization: Use flat fetching instead of deep nesting to prevent timeouts
        const [categories, quizAttempts] = await Promise.all([
            prisma.category.findMany({ 
                select: { id: true, type: true } 
            }),
            prisma.quizAttempt.findMany({
                where: isManager ? { user: { departmentId: actor.departmentId } } : {},
                select: { 
                    score: true, 
                    lesson: { select: { courseId: true } } 
                }
            })
        ]);

        // Map course to category type for fast lookup
        const categoryRecords = await prisma.category.findMany({
            include: { courses: { select: { id: true } } }
        });

        const courseToTypeMap = {};
        categoryRecords.forEach(cat => {
            cat.courses.forEach(course => {
                courseToTypeMap[course.id] = cat.type;
            });
        });

        const statsMap = {}; // type -> { totalScore, count }
        quizAttempts.forEach(attempt => {
            const type = courseToTypeMap[attempt.lesson?.courseId];
            if (type) {
                if (!statsMap[type]) statsMap[type] = { totalScore: 0, count: 0 };
                statsMap[type].totalScore += attempt.score;
                statsMap[type].count += 1;
            }
        });

        const skillGapStats = categories.map(cat => ({
            type: cat.type,
            average_mastery: statsMap[cat.type] 
                ? statsMap[cat.type].totalScore / statsMap[cat.type].count 
                : 0
        }));

        // 2. Department Benchmarking
        const departments = await prisma.department.findMany({
            include: {
                users: {
                    include: {
                        enrollments: {
                            select: { status: true }
                        }
                    }
                }
            }
        });

        const departmentBenchmark = departments.map(dept => {
            const enrollments = dept.users.flatMap(u => u.enrollments);
            const completed = enrollments.filter(e => e.status === 'COMPLETED').length;
            const total = enrollments.length;
            return {
                name: dept.name,
                completion_rate: total > 0 ? (completed * 100) / total : 0
            };
        }).sort((a, b) => b.completion_rate - a.completion_rate);

        // 3. Incentive ROI (Last 6 Months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const [pointsLedger, completions] = await Promise.all([
            prisma.pointsLedger.findMany({
                where: { createdAt: { gte: sixMonthsAgo }, points: { gt: 0 } },
                select: { points: true, createdAt: true }
            }),
            prisma.userCourse.findMany({
                where: { completedAt: { gte: sixMonthsAgo }, status: 'COMPLETED' },
                select: { completedAt: true }
            })
        ]);

        const roiTrend = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthStr = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
            const monthKey = date.toISOString().slice(0, 7); // YYYY-MM

            const monthPoints = pointsLedger
                .filter(p => p.createdAt.toISOString().slice(0, 7) === monthKey)
                .reduce((sum, p) => sum + p.points, 0);
            
            const monthCompletions = completions
                .filter(c => c.completedAt.toISOString().slice(0, 7) === monthKey)
                .length;

            roiTrend.push({
                month: monthStr,
                points: monthPoints,
                completions: monthCompletions
            });
        }

        // 4. At-Risk Learners (Deadlines)
        const now = new Date();
        const threeDaysLater = new Date();
        threeDaysLater.setDate(now.getDate() + 3);

        const atRiskRaw = await prisma.userCourse.findMany({
            where: {
                status: { not: 'COMPLETED' },
                deadline: {
                    lte: threeDaysLater,
                    not: null
                },
                ...(isManager ? { user: { departmentId: actor.departmentId } } : {})
            },
            include: {
                user: { select: { name: true, department: true } },
                course: { select: { title: true } }
            },
            orderBy: { deadline: 'asc' },
            take: 5
        });

        const atRisk = atRiskRaw.map(item => ({
            name: item.user.name,
            department: item.user.department,
            course: item.course.title,
            deadline: item.deadline,
            isOverdue: item.deadline < now
        }));

        return {
            skillGap: skillGapStats,
            benchmarking: departmentBenchmark,
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
};

// USERS
const getUsers = async (authUser) => {
    const actor = await getActorContext(authUser);
    const users = await prisma.user.findMany({
        where: buildAdminManagedUsersWhere(actor),
        include: userInclude,
        orderBy: [
            { role: 'asc' },
            { pointsBalance: 'desc' }
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
    const { departmentId, tierId, month, year } = filters;
    
    const whereClause = {
        courseId
    };

    const userWhere = {};
    if (departmentId) userWhere.departmentId = departmentId;
    if (tierId) userWhere.tierId = tierId;
    if (Object.keys(userWhere).length > 0) {
        whereClause.user = userWhere;
    }

    if (month && year) {
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
        whereClause.startedAt = {
            gte: startDate,
            lte: endDate
        };
    }

    const enrollments = await prisma.userCourse.findMany({
        where: whereClause,
        include: {
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
        orderBy: {
            startedAt: 'desc'
        }
    });

    const userIds = enrollments.map(e => e.user.id);
    const quizAttemptsContext = await prisma.quizAttempt.findMany({
        where: {
            userId: { in: userIds },
            lesson: { courseId }
        },
        orderBy: { createdAt: 'desc' }
    });

    const quizMap = {};
    quizAttemptsContext.forEach(attempt => {
        if (!quizMap[attempt.userId]) {
            quizMap[attempt.userId] = attempt;
        }
    });

    return enrollments.map(enrollment => ({
        id: enrollment.id,
        user: {
            id: enrollment.user.id,
            name: enrollment.user.name,
            department: enrollment.user.departmentRef?.name || '-',
            tier: enrollment.user.tier?.name || '-'
        },
        status: enrollment.status,
        progressPercent: enrollment.progressPercent,
        startedAt: enrollment.startedAt,
        completedAt: enrollment.completedAt,
        quizScore: quizMap[enrollment.user.id]?.score ?? null,
        quizPassed: quizMap[enrollment.user.id]?.status === 'PASSED'
    }));
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

    const views = await prisma.announcementView.findMany({
        where: { announcementId: id },
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
