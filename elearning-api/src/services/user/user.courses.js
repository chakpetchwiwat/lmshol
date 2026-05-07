const prisma = require('../../utils/prisma');
const { Prisma } = require('@prisma/client');
const crypto = require('crypto');
const authHelpers = require('../../utils/auth.helpers');
const {
    buildCategoryVisibilityWhere,
    buildCourseVisibilityWhere,
    canAccessCourse,
    getVisibleCourseQuery
} = require('./user.visibility');
const {
    serializeCourseDetail,
    serializeCourseSummary
} = require('./user.serializers');

const getBookmarkedCourseIds = async (userId, courseIds = []) => {
    if (!courseIds.length) return new Set();

    const rows = await prisma.$queryRaw`
        SELECT "courseId"
        FROM "UserCourseBookmark"
        WHERE "userId" = ${userId}
        AND "courseId" IN (${Prisma.join(courseIds)})
    `;

    return new Set(rows.map((row) => row.courseId));
};

const withBookmarkState = (courses, bookmarkedCourseIds) => (
    courses.map((course) => ({
        ...course,
        isBookmarked: bookmarkedCourseIds.has(course.id)
    }))
);

const getCourses = async (userId) => {
    const userContext = await getVisibleCourseQuery(userId);
    const referenceDate = new Date();
    const courses = await prisma.course.findMany({
        where: buildCourseVisibilityWhere(userContext, referenceDate),
        orderBy: [
            { isTemporary: 'desc' },
            { createdAt: 'desc' }
        ],
        include: {
            category: {
                include: {
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
                }
            },
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
            lessons: {
                select: {
                    type: true,
                    points: true
                }
            },
            enrollments: {
                where: { userId }
            }
        }
    });

    const visibleCourses = courses.filter((course) => canAccessCourse(course, userContext, referenceDate));
    const bookmarkedCourseIds = await getBookmarkedCourseIds(userId, visibleCourses.map((course) => course.id));

    return withBookmarkState(visibleCourses, bookmarkedCourseIds).map(serializeCourseSummary);
};

const getBookmarkedCourses = async (userId) => {
    const courses = await getCourses(userId);
    return courses.filter((course) => course.isBookmarked);
};

const getCourseDetails = async (courseId, userId) => {
    const userContext = await getVisibleCourseQuery(userId);
    const referenceDate = new Date();
    const course = await prisma.course.findFirst({
        where: {
            id: courseId,
            ...buildCourseVisibilityWhere(userContext, referenceDate)
        },
        include: {
            category: {
                include: {
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
                }
            },
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
            lessons: {
                orderBy: { order: 'asc' },
                include: {
                    progress: {
                        where: { userId }
                    },
                    _count: {
                        select: { questions: true }
                    },
                    quizAttempts: {
                        where: { userId },
                        orderBy: { score: 'desc' },
                        take: 1
                    },
                    assessmentSubmissions: {
                        where: { userId },
                        orderBy: { submittedAt: 'desc' },
                        take: 1,
                        include: {
                            gradedBy: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }
                }
            },
            enrollments: {
                where: { userId }
            },
            staff: {
                orderBy: [
                    { role: 'asc' },
                    { isPrimary: 'desc' },
                    { createdAt: 'asc' }
                ],
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            }
        }
    });

    if (!course || !canAccessCourse(course, userContext, referenceDate)) {
        return null;
    }

    const bookmarkedCourseIds = await getBookmarkedCourseIds(userId, [course.id]);
    return serializeCourseDetail({
        ...course,
        isBookmarked: bookmarkedCourseIds.has(course.id)
    });
};

const bookmarkCourse = async (userId, courseId) => {
    const course = await getCourseDetails(courseId, userId);
    if (!course) {
        throw new Error('Course not found');
    }

    await prisma.$executeRaw`
        INSERT INTO "UserCourseBookmark" ("id", "userId", "courseId", "createdAt")
        VALUES (${crypto.randomUUID()}, ${userId}, ${courseId}, CURRENT_TIMESTAMP)
        ON CONFLICT ("userId", "courseId") DO NOTHING
    `;

    return { courseId, isBookmarked: true };
};

const unbookmarkCourse = async (userId, courseId) => {
    await prisma.$executeRaw`
        DELETE FROM "UserCourseBookmark"
        WHERE "userId" = ${userId}
        AND "courseId" = ${courseId}
    `;

    return { courseId, isBookmarked: false };
};

const getCategories = async (userId) => {
    const userContext = await getVisibleCourseQuery(userId);
    const referenceDate = new Date();
    const categories = await prisma.category.findMany({
        where: {
            AND: [
                buildCategoryVisibilityWhere(userContext, referenceDate),
                authHelpers.buildTimedVisibilityWhere({ referenceDate })
            ]
        },
        include: {
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
        },
        orderBy: [
            { isTemporary: 'desc' },
            { order: 'asc' }
        ]
    });

    return categories
        .filter((category) => authHelpers.canAccessEntity(userContext, category, referenceDate))
        .map((category) => ({
            ...category,
            departmentAccess: undefined,
            tierAccess: undefined
        }));
};

const getLessonQuestions = async (lessonId) => {
    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
            questions: {
                include: {
                    choices: {
                        select: {
                            id: true,
                            questionId: true,
                            text: true
                        }
                    }
                },
                orderBy: { order: 'asc' }
            }
        }
    });
    return lesson?.questions || [];
};

module.exports = {
    getCourses,
    getBookmarkedCourses,
    getCourseDetails,
    bookmarkCourse,
    unbookmarkCourse,
    getCategories,
    getLessonQuestions
};
