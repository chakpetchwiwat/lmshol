const test = require('node:test');
const assert = require('node:assert/strict');

const {
    serializeAnnouncementDetail,
    serializeAnnouncementSummary,
    serializeCourseDetail,
    serializeCourseSummary
} = require('../src/services/user/user.serializers');

const createCourse = () => ({
    id: 'course-1',
    title: 'Course One',
    points: 50,
    departmentAccess: [{ departmentId: 'dept-a' }],
    tierAccess: [{ tierId: 'tier-a' }],
    category: {
        id: 'cat-1',
        name: 'Category One',
        departmentAccess: [{ departmentId: 'dept-a' }],
        tierAccess: [{ tierId: 'tier-a' }]
    },
    lessons: [
        {
            id: 'lesson-1',
            type: 'document',
            title: 'Doc Lesson',
            contentUrl: 'docs/guide.pdf',
            points: 0,
            progress: [{ progress: 100 }],
            quizAttempts: [],
            _count: { questions: 0 }
        },
        {
            id: 'lesson-2',
            type: 'quiz',
            title: 'Quiz Lesson',
            contentUrl: 'https://example.com/quiz',
            points: 25,
            progress: [],
            quizAttempts: [{ score: 80 }],
            _count: { questions: 3 }
        }
    ],
    enrollments: [{
        status: 'IN_PROGRESS',
        progressPercent: 40,
        completedAt: null
    }]
});

test('serializeCourseSummary preserves public course list contract', () => {
    const serialized = serializeCourseSummary(createCourse());

    assert.equal(serialized.id, 'course-1');
    assert.equal(serialized.lessons, undefined);
    assert.equal(serialized.lessonsCount, 2);
    assert.equal(serialized.departmentAccess, undefined);
    assert.equal(serialized.tierAccess, undefined);
    assert.equal(serialized.category.departmentAccess, undefined);
    assert.equal(serialized.category.tierAccess, undefined);
    assert.equal(serialized.isEnrolled, true);
    assert.equal(serialized.enrollmentStatus, 'IN_PROGRESS');
    assert.equal(serialized.progressPercent, 40);
    assert.equal(serialized.completionPoints, 50);
    assert.equal(serialized.quizPoints, 25);
    assert.equal(serialized.totalPoints, 75);
});

test('serializeCourseDetail preserves lesson document and quiz metadata contract', () => {
    const serialized = serializeCourseDetail(createCourse());

    assert.equal(serialized.lessonsCount, 2);
    assert.equal(serialized.lessons[0].contentUrl, null);
    assert.equal(serialized.lessons[0].hasDocument, true);
    assert.equal(serialized.lessons[0].progress.progress, 100);
    assert.equal(serialized.lessons[0].isCompleted, true);
    assert.equal(serialized.lessons[0].questionCount, 0);
    assert.equal(serialized.lessons[0]._count, undefined);
    assert.equal(serialized.lessons[0].quizAttempts, undefined);

    assert.equal(serialized.lessons[1].contentUrl, 'https://example.com/quiz');
    assert.equal(serialized.lessons[1].hasDocument, false);
    assert.equal(serialized.lessons[1].bestScore, 80);
    assert.equal(serialized.lessons[1].questionCount, 3);
});

test('serializeCourseDetail returns staff and uses primary CourseStaff instructor before legacy instructor', () => {
    const course = {
        ...createCourse(),
        instructorName: 'Legacy Instructor',
        staff: [{
            id: 'staff-1',
            userId: 'user-1',
            role: 'instructor',
            isPrimary: true,
            user: {
                id: 'user-1',
                name: 'Primary Instructor'
            }
        }]
    };

    const serialized = serializeCourseDetail(course);

    assert.equal(serialized.instructorName, 'Primary Instructor');
    assert.deepEqual(serialized.staff, [{
        id: 'staff-1',
        userId: 'user-1',
        name: 'Primary Instructor',
        role: 'instructor',
        isPrimary: true
    }]);
});

test('serializeCourseDetail falls back to legacy instructor when no primary CourseStaff instructor exists', () => {
    const course = {
        ...createCourse(),
        instructorName: 'Legacy Instructor',
        staff: []
    };

    const serialized = serializeCourseDetail(course);

    assert.equal(serialized.instructorName, 'Legacy Instructor');
    assert.deepEqual(serialized.staff, []);
});

test('serializeAnnouncementSummary preserves announcement list contract', () => {
    const serialized = serializeAnnouncementSummary({
        id: 'announcement-1',
        title: 'Announcement',
        _count: { questions: 4 }
    });

    assert.equal(serialized.id, 'announcement-1');
    assert.equal(serialized.questionCount, 4);
    assert.equal(serialized.isAnnouncement, true);
    assert.equal(serialized._count, undefined);
});

test('serializeAnnouncementDetail hides protected announcement document content', () => {
    const serialized = serializeAnnouncementDetail({
        id: 'announcement-1',
        type: 'document',
        contentUrl: 'announcements/policy.pdf',
        _count: { questions: 2 }
    });

    assert.equal(serialized.contentUrl, null);
    assert.equal(serialized.hasDocument, true);
    assert.equal(serialized.questionCount, 2);
    assert.equal(serialized._count, undefined);
});
