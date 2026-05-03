const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const ErrorResponse = require('../../utils/errorResponse');

const SUPABASE_BUCKET = 'secure-documents';
const DOCUMENT_SIGNED_URL_TTL_SECONDS = 90;
const DOCUMENT_ACCESS_TOKEN_TTL_SECONDS = 120;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

const isProtectedDocumentLesson = (lesson) => (
    !!lesson?.contentUrl && !['video', 'quiz'].includes(String(lesson?.type || '').toLowerCase())
);

const isProtectedAnnouncementDocument = (announcement) => (
    !!announcement?.contentUrl && !['video', 'quiz'].includes(String(announcement?.type || '').toLowerCase())
);

const getStorageObjectRefFromContentUrl = (contentUrl) => {
    const trimmedUrl = String(contentUrl || '').trim();

    if (!trimmedUrl) {
        return null;
    }

    if (!/^https?:\/\//i.test(trimmedUrl)) {
        return {
            bucket: SUPABASE_BUCKET,
            path: trimmedUrl.replace(/^\/+/, '').replace(/^uploads\//, '')
        };
    }

    try {
        const parsedUrl = new URL(trimmedUrl);
        const match = parsedUrl.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);

        if (match) {
            return {
                bucket: decodeURIComponent(match[1]),
                path: decodeURIComponent(match[2])
            };
        }
    } catch (error) {
        return null;
    }

    return null;
};

const createDocumentAccessToken = ({ userId, resourceType, resourceId, contentUrl }) => {
    const storageRef = getStorageObjectRefFromContentUrl(contentUrl);
    const sourceUrl = String(contentUrl || '').trim();

    if (!storageRef?.path && !/^https?:\/\//i.test(sourceUrl)) {
        throw new ErrorResponse('Document source is unavailable', 404);
    }

    return jwt.sign(
        {
            type: 'document_access',
            userId,
            resourceType,
            resourceId,
            bucket: storageRef?.bucket || SUPABASE_BUCKET,
            path: storageRef?.path || null,
            sourceUrl: storageRef?.path ? null : sourceUrl
        },
        process.env.JWT_SECRET,
        { expiresIn: DOCUMENT_ACCESS_TOKEN_TTL_SECONDS }
    );
};

const verifyDocumentAccessToken = (token, { resourceType, resourceId }) => {
    if (!token) {
        throw new ErrorResponse('Document access token is required', 401);
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        if (
            payload?.type !== 'document_access'
            || payload?.resourceType !== resourceType
            || payload?.resourceId !== resourceId
            || (!payload?.path && !payload?.sourceUrl)
        ) {
            throw new ErrorResponse('Invalid document access token', 401);
        }

        return payload;
    } catch (error) {
        if (error instanceof ErrorResponse) {
            throw error;
        }

        throw new ErrorResponse('Invalid or expired document access token', 401);
    }
};

const getDocumentFilename = (documentRef) => {
    const rawRef = String(documentRef || '').trim();

    if (!rawRef) {
        return 'document';
    }

    if (!/^https?:\/\//i.test(rawRef)) {
        return decodeURIComponent(path.posix.basename(rawRef)) || 'document';
    }

    try {
        const parsedUrl = new URL(rawRef);
        return decodeURIComponent(path.posix.basename(parsedUrl.pathname)) || 'document';
    } catch (error) {
        return 'document';
    }
};

const getDocumentPreviewMeta = (documentRef) => {
    const fileName = getDocumentFilename(documentRef);
    const lowerFileName = fileName.toLowerCase();
    const extensionMatch = lowerFileName.match(/\.([a-z0-9]+)$/i);
    const extension = extensionMatch?.[1] || '';
    const pdfExtensions = ['pdf'];
    const officeExtensions = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

    return {
        fileName,
        extension,
        viewerType: pdfExtensions.includes(extension)
            ? 'pdf'
            : officeExtensions.includes(extension)
                ? 'office'
                : 'document'
    };
};

const getDocumentUpstreamResponse = async (documentAccessPayload) => {
    const { bucket, path: storagePath, sourceUrl } = documentAccessPayload || {};
    let upstreamUrl = '';
    let fileName = 'document';

    if (storagePath) {
        if (!supabase) {
            throw new ErrorResponse('Secure document storage is unavailable', 500);
        }

        const { data, error } = await supabase.storage
            .from(bucket || SUPABASE_BUCKET)
            .createSignedUrl(storagePath, DOCUMENT_SIGNED_URL_TTL_SECONDS);

        if (error || !data?.signedUrl) {
            throw new ErrorResponse('Unable to create secure document access', 500);
        }

        upstreamUrl = data.signedUrl;
        fileName = getDocumentFilename(storagePath);
    } else if (sourceUrl) {
        upstreamUrl = sourceUrl;
        fileName = getDocumentFilename(sourceUrl);
    } else {
        throw new ErrorResponse('Document source is unavailable', 404);
    }

    const upstreamResponse = await fetch(upstreamUrl, {
        method: 'GET',
        redirect: 'follow'
    });

    if (!upstreamResponse.ok || !upstreamResponse.body) {
        throw new ErrorResponse('Unable to load secure document preview', 502);
    }

    return {
        upstreamResponse,
        fileName
    };
};

const getLessonDocumentAccess = async (userId, lessonId) => {
    const prisma = require('../../utils/prisma');
    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        select: {
            id: true,
            courseId: true,
            type: true,
            contentUrl: true
        }
    });

    if (!lesson) {
        throw new ErrorResponse('Lesson not found', 404);
    }

    if (!isProtectedDocumentLesson(lesson)) {
        throw new ErrorResponse('Document not found for this lesson', 404);
    }

    const enrollment = await prisma.userCourse.findUnique({
        where: {
            userId_courseId: {
                userId,
                courseId: lesson.courseId
            }
        }
    });

    if (!enrollment) {
        throw new ErrorResponse('You must enroll before opening this document', 403);
    }

    const token = createDocumentAccessToken({
        userId,
        resourceType: 'lesson',
        resourceId: lesson.id,
        contentUrl: lesson.contentUrl
    });
    const previewMeta = getDocumentPreviewMeta(lesson.contentUrl);

    return {
        lessonId: lesson.id,
        accessUrl: `/api/user/lessons/${lesson.id}/document-stream?token=${encodeURIComponent(token)}`,
        expiresIn: DOCUMENT_ACCESS_TOKEN_TTL_SECONDS,
        ...previewMeta
    };
};

const getLessonDocumentStream = async (lessonId, token) => {
    const documentAccessPayload = verifyDocumentAccessToken(token, {
        resourceType: 'lesson',
        resourceId: lessonId
    });
    return getDocumentUpstreamResponse(documentAccessPayload);
};

const getAnnouncementDocumentAccess = async (userId, announcementId) => {
    const prisma = require('../../utils/prisma');
    const { getVisibleCourseQuery, buildAnnouncementVisibilityWhere, canAccessAnnouncement } = require('./user.visibility');
    const userContext = await getVisibleCourseQuery(userId);
    const referenceDate = new Date();
    const announcement = await prisma.announcement.findFirst({
        where: {
            id: announcementId,
            ...buildAnnouncementVisibilityWhere(userContext, referenceDate)
        },
        select: {
            id: true,
            type: true,
            contentUrl: true,
            departmentId: true,
            status: true,
            expiredAt: true
        }
    });

    if (!announcement || !canAccessAnnouncement(announcement, userContext, referenceDate)) {
        throw new ErrorResponse('Announcement not found', 404);
    }

    if (!isProtectedAnnouncementDocument(announcement)) {
        throw new ErrorResponse('Document not found for this announcement', 404);
    }

    const token = createDocumentAccessToken({
        userId,
        resourceType: 'announcement',
        resourceId: announcement.id,
        contentUrl: announcement.contentUrl
    });
    const previewMeta = getDocumentPreviewMeta(announcement.contentUrl);

    return {
        announcementId: announcement.id,
        accessUrl: `/api/user/announcements/${announcement.id}/document-stream?token=${encodeURIComponent(token)}`,
        expiresIn: DOCUMENT_ACCESS_TOKEN_TTL_SECONDS,
        ...previewMeta
    };
};

const getAnnouncementDocumentStream = async (announcementId, token) => {
    const documentAccessPayload = verifyDocumentAccessToken(token, {
        resourceType: 'announcement',
        resourceId: announcementId
    });
    return getDocumentUpstreamResponse(documentAccessPayload);
};

module.exports = {
    DOCUMENT_ACCESS_TOKEN_TTL_SECONDS,
    getDocumentPreviewMeta,
    getDocumentUpstreamResponse,
    getStorageObjectRefFromContentUrl,
    isProtectedAnnouncementDocument,
    isProtectedDocumentLesson,
    createDocumentAccessToken,
    verifyDocumentAccessToken,
    getLessonDocumentAccess,
    getLessonDocumentStream,
    getAnnouncementDocumentAccess,
    getAnnouncementDocumentStream
};

