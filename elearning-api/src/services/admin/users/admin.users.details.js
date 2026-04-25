const prisma = require('../../../utils/prisma');
const { POINT_SOURCE_TYPES } = require('../../../utils/constants/ledger');
const { mapUserRecord } = require('../admin.serializers');
const { buildScopedUserWhere } = require('../admin.queries');
const { getActorContext } = require('../admin.helpers');

const buildPointsHistory = async (userId) => {
    const ledger = await prisma.pointsLedger.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
    });

    if (ledger.length === 0) return [];

    const courseIds = [...new Set(ledger.filter(e => e.sourceType === POINT_SOURCE_TYPES.COURSE && e.sourceId).map(e => e.sourceId))];
    const lessonIds = [...new Set(ledger.filter(e => e.sourceType === POINT_SOURCE_TYPES.QUIZ && e.sourceId).map(e => e.sourceId))];
    const redeemIds = [...new Set(ledger.filter(e => [POINT_SOURCE_TYPES.REDEEM, POINT_SOURCE_TYPES.REWARD_ADJUST].includes(e.sourceType) && e.sourceId).map(e => e.sourceId))];

    const [courses, lessons, redeems] = await Promise.all([
        courseIds.length ? prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : Promise.resolve([]),
        lessonIds.length ? prisma.lesson.findMany({ where: { id: { in: lessonIds } }, select: { id: true, title: true } }) : Promise.resolve([]),
        redeemIds.length ? prisma.redeemRequest.findMany({ where: { id: { in: redeemIds } }, include: { reward: { select: { name: true } } } }) : Promise.resolve([])
    ]);

    const courseMap = Object.fromEntries(courses.map(c => [c.id, c]));
    const lessonMap = Object.fromEntries(lessons.map(l => [l.id, l]));
    const redeemMap = Object.fromEntries(redeems.map(r => [r.id, r]));

    return ledger.map((entry) => {
        let sourceLabel = entry.note || 'Point activity';
        if (entry.sourceType === POINT_SOURCE_TYPES.COURSE) {
            sourceLabel = courseMap[entry.sourceId]?.title ? `Completed course: ${courseMap[entry.sourceId].title}` : (entry.note || 'Completed course');
        } else if (entry.sourceType === POINT_SOURCE_TYPES.QUIZ) {
            sourceLabel = lessonMap[entry.sourceId]?.title ? `Passed quiz: ${lessonMap[entry.sourceId].title}` : (entry.note || 'Passed quiz');
        } else if (entry.sourceType === POINT_SOURCE_TYPES.REDEEM || entry.sourceType === POINT_SOURCE_TYPES.REWARD_ADJUST) {
            sourceLabel = redeemMap[entry.sourceId]?.reward?.name ? `Activity: ${redeemMap[entry.sourceId].reward.name}` : (entry.note || 'Reward activity');
        }
        return { ...entry, direction: entry.points >= 0 ? 'earned' : 'spent', sourceLabel };
    });
};

const getUserDetails = async (id, authUser) => {
    const actor = await getActorContext(authUser);
    const user = await prisma.user.findFirst({
        where: await buildScopedUserWhere(actor, id),
        include: {
            departmentRef: true,
            tier: true,
            enrollments: {
                include: { course: { include: { category: true } } },
                orderBy: { startedAt: 'desc' }
            }
        }
    });

    if (!user) throw new Error('User not found');

    const pointsHistory = await buildPointsHistory(user.id);
    const actualPointsBalance = pointsHistory.reduce((sum, entry) => sum + entry.points, 0);

    return {
        ...mapUserRecord(user),
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

module.exports = {
    getUserDetails,
    buildPointsHistory
};
