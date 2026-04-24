const prisma = require('../../utils/prisma');
const { ENTITY_STATUS, REDEEM_STATUS } = require('../../utils/constants/statuses');
const { POINT_SOURCE_TYPES } = require('../../utils/constants/ledger');
const { mapCategoryRecord, mapCourseRecord } = require('./admin.serializers');
const { categoryInclude, courseInclude } = require('./admin.queries');
const { parseInteger, parseOptionalDate, normalizeNullableId, normalizeIdArray, sanitizeName, ensureReferenceName, ensureReferenceIdsExist, ensureInstructorPresetExists, buildTemporaryStateData } = require('./admin.helpers');

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

module.exports = {
    buildCourseMutationPayload,
    saveCourseVisibility,
    getAdminCourses,
    createCourse,
    updateCourse,
    republishCourse,
    archiveCourse,
    getCourseHistory,
    deleteCourse,
    getCourseLessons,
    createLesson,
    updateLesson,
    deleteLesson,
    reorderLessons,
    getCourseQuizAttempts,
};
