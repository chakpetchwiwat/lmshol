const {
    isProtectedAnnouncementDocument,
    isProtectedDocumentLesson
} = require('./user.documents');
const { getCourseRewardSummary } = require('./user.helpers');

const stripVisibilityAccess = (entity) => ({
    ...entity,
    departmentAccess: undefined,
    tierAccess: undefined
});

const serializeCourseCategory = (category) => (
    category ? stripVisibilityAccess(category) : null
);

const serializeCourseSummary = (course) => {
    const enrollment = course.enrollments[0];
    const rewardSummary = getCourseRewardSummary(course);

    return {
        ...course,
        enrollments: undefined,
        departmentAccess: undefined,
        tierAccess: undefined,
        category: serializeCourseCategory(course.category),
        lessonsCount: Array.isArray(course.lessons) ? course.lessons.length : 0,
        lessons: undefined,
        isEnrolled: !!enrollment,
        enrollmentStatus: enrollment ? enrollment.status : null,
        progressPercent: enrollment ? enrollment.progressPercent : 0,
        completedAt: enrollment ? enrollment.completedAt : null,
        ...rewardSummary
    };
};

const serializeCourseLesson = (lesson) => ({
    ...lesson,
    contentUrl: isProtectedDocumentLesson(lesson) ? null : lesson.contentUrl,
    hasDocument: isProtectedDocumentLesson(lesson),
    progress: lesson.progress[0] || null,
    isCompleted: lesson.progress[0]?.progress === 100,
    bestScore: lesson.quizAttempts[0]?.score || null,
    questionCount: lesson._count?.questions || 0,
    _count: undefined,
    quizAttempts: undefined
});

const serializeCourseStaff = (staff) => ({
    id: staff.id,
    userId: staff.userId,
    name: staff.user?.name || null,
    role: staff.role,
    isPrimary: staff.isPrimary
});

const getPrimaryInstructorName = (course) => {
    const primaryInstructor = Array.isArray(course.staff)
        ? course.staff.find((staff) => staff.role === 'instructor' && staff.isPrimary)
        : null;

    return primaryInstructor?.user?.name || course.instructorName;
};

const serializeCourseDetail = (course) => {
    const enrollment = course.enrollments[0];
    const rewardSummary = getCourseRewardSummary(course);

    return {
        ...course,
        enrollments: undefined,
        departmentAccess: undefined,
        tierAccess: undefined,
        category: serializeCourseCategory(course.category),
        instructorName: getPrimaryInstructorName(course),
        isEnrolled: !!enrollment,
        enrollmentStatus: enrollment ? enrollment.status : null,
        progressPercent: enrollment ? enrollment.progressPercent : 0,
        completedAt: enrollment ? enrollment.completedAt : null,
        ...rewardSummary,
        staff: Array.isArray(course.staff) ? course.staff.map(serializeCourseStaff) : [],
        lessonsCount: Array.isArray(course.lessons) ? course.lessons.length : 0,
        lessons: course.lessons.map(serializeCourseLesson)
    };
};

const serializeAnnouncementSummary = (announcement) => ({
    ...announcement,
    questionCount: announcement._count?.questions || 0,
    isAnnouncement: true,
    _count: undefined
});

const serializeAnnouncementDetail = (announcement) => ({
    ...announcement,
    contentUrl: isProtectedAnnouncementDocument(announcement) ? null : announcement.contentUrl,
    hasDocument: isProtectedAnnouncementDocument(announcement),
    questionCount: announcement._count?.questions || 0,
    _count: undefined
});

module.exports = {
    serializeAnnouncementDetail,
    serializeAnnouncementSummary,
    serializeCourseDetail,
    serializeCourseSummary
};
