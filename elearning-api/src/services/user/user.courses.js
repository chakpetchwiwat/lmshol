const prisma = require('../../utils/prisma');
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

    return courses
        .filter((course) => canAccessCourse(course, userContext, referenceDate))
        .map(serializeCourseSummary);
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
                    }
                }
            },
            enrollments: {
                where: { userId }
            }
        }
    });

    if (!course || !canAccessCourse(course, userContext, referenceDate)) {
        return null;
    }

    return serializeCourseDetail(course);
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
    getCourseDetails,
    getCategories,
    getLessonQuestions
};
