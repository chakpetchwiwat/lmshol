const test = require('node:test');
const assert = require('node:assert/strict');

const { ENTITY_STATUS } = require('../src/utils/constants/statuses');
const { ANNOUNCEMENT_SCOPES } = require('../src/utils/constants/scopes');
const {
    getDocumentPreviewMeta,
    getStorageObjectRefFromContentUrl
} = require('../src/services/user/user.documents');
const { getCourseRewardSummary } = require('../src/services/user/user.helpers');
const {
    buildAnnouncementVisibilityWhere,
    canAccessAnnouncement
} = require('../src/services/user/user.visibility');

test('getStorageObjectRefFromContentUrl parses storage paths and Supabase object URLs', () => {
    assert.deepEqual(getStorageObjectRefFromContentUrl('courses/docs/intro.pdf'), {
        bucket: 'uploads',
        path: 'courses/docs/intro.pdf'
    });

    assert.deepEqual(getStorageObjectRefFromContentUrl('/uploads/courses/docs/intro.pdf'), {
        bucket: 'uploads',
        path: 'courses/docs/intro.pdf'
    });

    assert.deepEqual(
        getStorageObjectRefFromContentUrl('https://example.supabase.co/storage/v1/object/public/uploads/courses%2Fintro.pdf'),
        {
            bucket: 'uploads',
            path: 'courses/intro.pdf'
        }
    );

    assert.equal(getStorageObjectRefFromContentUrl(''), null);
    assert.equal(getStorageObjectRefFromContentUrl('https://example.com/file.pdf'), null);
});

test('getDocumentPreviewMeta resolves filename, extension, and viewer type', () => {
    assert.deepEqual(getDocumentPreviewMeta('folder/Policy%20Guide.PDF'), {
        fileName: 'Policy Guide.PDF',
        extension: 'pdf',
        viewerType: 'pdf'
    });

    assert.deepEqual(getDocumentPreviewMeta('https://example.com/docs/report.xlsx'), {
        fileName: 'report.xlsx',
        extension: 'xlsx',
        viewerType: 'office'
    });

    assert.deepEqual(getDocumentPreviewMeta('notes/readme.txt'), {
        fileName: 'readme.txt',
        extension: 'txt',
        viewerType: 'document'
    });

    assert.deepEqual(getDocumentPreviewMeta(''), {
        fileName: 'document',
        extension: '',
        viewerType: 'document'
    });
});

test('getCourseRewardSummary totals course completion and quiz points only', () => {
    assert.deepEqual(
        getCourseRewardSummary({
            points: 50,
            lessons: [
                { type: 'quiz', points: 10 },
                { type: 'video', points: 999 },
                { type: 'quiz', points: '15' }
            ]
        }),
        {
            completionPoints: 50,
            quizPoints: 25,
            totalPoints: 75
        }
    );

    assert.deepEqual(getCourseRewardSummary({ points: null, lessons: null }), {
        completionPoints: 0,
        quizPoints: 0,
        totalPoints: 0
    });
});

test('announcement visibility where preserves admin and scoped user behavior', () => {
    const referenceDate = new Date('2026-04-12T00:00:00.000Z');

    assert.deepEqual(buildAnnouncementVisibilityWhere({ isAdmin: true }, referenceDate), {});

    assert.deepEqual(
        buildAnnouncementVisibilityWhere({ isAdmin: false, departmentId: 'dept-a' }, referenceDate),
        {
            AND: [
                { status: ENTITY_STATUS.PUBLISHED },
                {
                    OR: [
                        { expiredAt: null },
                        { expiredAt: { gt: referenceDate } }
                    ]
                },
                {
                    OR: [
                        { scope: ANNOUNCEMENT_SCOPES.GLOBAL },
                        { departmentId: 'dept-a' }
                    ]
                }
            ]
        }
    );
});

test('canAccessAnnouncement enforces publication, expiry, and department scope', () => {
    const referenceDate = new Date('2026-04-12T00:00:00.000Z');
    const userContext = { isAdmin: false, departmentId: 'dept-a' };

    assert.equal(canAccessAnnouncement({ status: ENTITY_STATUS.DRAFT }, { isAdmin: true }, referenceDate), true);

    assert.equal(
        canAccessAnnouncement({
            status: ENTITY_STATUS.PUBLISHED,
            scope: ANNOUNCEMENT_SCOPES.GLOBAL,
            expiredAt: null
        }, userContext, referenceDate),
        true
    );

    assert.equal(
        canAccessAnnouncement({
            status: ENTITY_STATUS.PUBLISHED,
            scope: ANNOUNCEMENT_SCOPES.DEPARTMENT,
            departmentId: 'dept-a',
            expiredAt: null
        }, userContext, referenceDate),
        true
    );

    assert.equal(
        canAccessAnnouncement({
            status: ENTITY_STATUS.PUBLISHED,
            scope: ANNOUNCEMENT_SCOPES.DEPARTMENT,
            departmentId: 'dept-b',
            expiredAt: null
        }, userContext, referenceDate),
        false
    );

    assert.equal(
        canAccessAnnouncement({
            status: ENTITY_STATUS.PUBLISHED,
            scope: ANNOUNCEMENT_SCOPES.GLOBAL,
            expiredAt: '2026-04-11T23:59:59.999Z'
        }, userContext, referenceDate),
        false
    );
});
