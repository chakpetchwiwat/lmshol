const prisma = require('../../../utils/prisma');
const { ENROLLMENT_STATUS, USER_STATUS, ENTITY_STATUS } = require('../../../utils/constants/statuses');
const { MANAGED_USER_ROLES } = require('../../../utils/constants/roles');
const { mapCourseRecord } = require('../admin.serializers');
const { courseInclude } = require('../admin.queries');
const { getMonthDateRange } = require('../admin.helpers');

const getCourseHistory = async (courseId, filters = {}) => {
    const { departmentId, tierId, month, year, status, dateField } = filters;
    const effectiveDateField = dateField === 'completedAt' ? 'completedAt' : 'startedAt';
    const dateRange = getMonthDateRange(month, year);
    const hasDateFilter = Boolean(dateRange);

    const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
            departmentAccess: { select: { departmentId: true } },
            tierAccess: { include: { tier: { select: { order: true } } } }
        }
    });

    if (!course) throw new Error('Course not found');

    const accessibleDepartmentIds = course.departmentAccess.map((entry) => entry.departmentId);
    const maxAllowedTierOrder = course.tierAccess.reduce((highestOrder, entry) => {
        const entryOrder = entry.tier?.order;
        if (entryOrder === undefined || entryOrder === null) return highestOrder;
        return highestOrder === null ? entryOrder : Math.max(highestOrder, entryOrder);
    }, null);

    const userWhere = {
        roles: { hasSome: MANAGED_USER_ROLES },
        status: USER_STATUS.ACTIVE
    };

    if (departmentId) userWhere.departmentId = departmentId;
    if (tierId) userWhere.tierId = tierId;

    if (!course.visibleToAll) {
        if (accessibleDepartmentIds.length > 0) {
            userWhere.departmentId = departmentId ? departmentId : { in: accessibleDepartmentIds };
        }
        if (maxAllowedTierOrder !== null) {
            userWhere.tier = { is: { order: { lte: maxAllowedTierOrder } } };
        }
    }

    const enrollmentWhere = { courseId, user: userWhere };
    if (status && status !== ENROLLMENT_STATUS.NOT_STARTED) enrollmentWhere.status = status;
    if (hasDateFilter) {
        enrollmentWhere[effectiveDateField] = { gte: dateRange.start, lte: dateRange.end };
    }

    const enrollments = await prisma.userCourse.findMany({
        where: enrollmentWhere,
        select: {
            id: true, userId: true, status: true, progressPercent: true, startedAt: true, completedAt: true,
            user: {
                select: {
                    id: true, name: true,
                    departmentRef: { select: { name: true } },
                    tier: { select: { name: true } }
                }
            }
        },
        orderBy: [{ completedAt: 'desc' }, { startedAt: 'desc' }]
    });

    const enrolledUserIds = enrollments.map((enrollment) => enrollment.userId);
    const shouldIncludeNotStarted = !hasDateFilter && (!status || status === ENROLLMENT_STATUS.NOT_STARTED);

    let notStartedUsers = [];
    if (shouldIncludeNotStarted) {
        notStartedUsers = await prisma.user.findMany({
            where: {
                ...userWhere,
                ...(enrolledUserIds.length > 0 ? { id: { notIn: enrolledUserIds } } : {})
            },
            select: {
                id: true, name: true,
                departmentRef: { select: { name: true } },
                tier: { select: { name: true } }
            },
            orderBy: { name: 'asc' }
        });
    }

    let quizMap = {};
    if (enrolledUserIds.length > 0) {
        const quizAttemptsContext = await prisma.quizAttempt.findMany({
            where: { userId: { in: enrolledUserIds }, lesson: { courseId } },
            select: { userId: true, score: true, status: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        });
        quizMap = quizAttemptsContext.reduce((acc, attempt) => {
            if (!acc[attempt.userId]) acc[attempt.userId] = attempt;
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

    return [...records, ...notStartedRecords]
        .filter((record) => {
            if (status && record.status !== status) return false;
            if (hasDateFilter) {
                const targetDate = record[effectiveDateField];
                if (!targetDate) return false;
                const selectedDate = new Date(targetDate);
                return selectedDate >= dateRange.start && selectedDate <= dateRange.end;
            }
            return true;
        })
        .sort((left, right) => {
            const leftTime = left[effectiveDateField] ? new Date(left[effectiveDateField]).getTime() : null;
            const rightTime = right[effectiveDateField] ? new Date(right[effectiveDateField]).getTime() : null;
            if (leftTime !== null && rightTime !== null) return rightTime - leftTime;
            if (leftTime !== null) return -1;
            if (rightTime !== null) return 1;
            return left.user.name.localeCompare(right.user.name, 'th');
        });
};

const getCourseQuizAttempts = async (courseId) => {
    const attempts = await prisma.quizAttempt.findMany({
        where: { lesson: { courseId } },
        include: {
            user: {
                select: {
                    id: true, name: true, email: true, department: true,
                    departmentRef: { select: { name: true } },
                    tier: { select: { name: true } }
                }
            },
            lesson: { select: { id: true, title: true, passScore: true } }
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

const republishCourse = async (id) => {
    const course = await prisma.course.update({
        where: { id },
        data: { isTemporary: false, expiredAt: null, status: ENTITY_STATUS.PUBLISHED },
        include: courseInclude
    });
    return mapCourseRecord(course);
};

const archiveCourse = async (id) => {
    const pastDate = new Date();
    pastDate.setMinutes(pastDate.getMinutes() - 5);
    const course = await prisma.course.update({
        where: { id },
        data: { isTemporary: true, expiredAt: pastDate },
        include: courseInclude
    });
    return mapCourseRecord(course);
};

module.exports = {
    getCourseHistory,
    getCourseQuizAttempts,
    republishCourse,
    archiveCourse
};
