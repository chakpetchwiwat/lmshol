const prisma = require('../../utils/prisma');
const { ENTITY_STATUS } = require('../../utils/constants/statuses');
const { ANNOUNCEMENT_SCOPES } = require('../../utils/constants/scopes');
const { TRANSACTION_TIMEOUTS } = require('../../utils/constants/config');
const { announcementInclude, buildAnnouncementWhereForActor } = require('./admin.queries');
const { mapAnnouncementRecord } = require('./admin.serializers');
const { getActorContext, parseInteger, parseOptionalDate, normalizeNullableId, sanitizeName, ensureReferenceName } = require('./admin.helpers');

const DASHBOARD_CACHE_TTL_MS = (() => {
    const parsed = parseInt(process.env.DASHBOARD_CACHE_TTL_MS || '30000', 10);
    return Number.isNaN(parsed) ? 30000 : Math.max(parsed, 0);
})();

const announcementHistoryCache = new Map();

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
    getAnnouncementHistoryCacheKey,
    resolveAnnouncementHistoryCache,
    clearAnnouncementHistoryCache,
    buildAnnouncementQuestionsCreate,
    buildAnnouncementMutationPayload,
    getAdminAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    archiveAnnouncement,
    republishAnnouncement,
    getAnnouncementHistory,
};
