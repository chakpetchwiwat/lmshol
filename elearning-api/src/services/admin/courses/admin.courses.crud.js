const prisma = require('../../../utils/prisma');
const { USER_ROLES } = require('../../../utils/constants/roles');
const { TRANSACTION_TIMEOUTS } = require('../../../utils/constants/config');
const { mapCourseRecord } = require('../admin.serializers');
const { courseInclude } = require('../admin.queries');
const { saveCourseCompetencies } = require('../admin.competencies');
const { 
    parseInteger, 
    normalizeNullableId, 
    normalizeIdArray, 
    ensureReferenceName, 
    ensureReferenceIdsExist, 
    ensureInstructorPresetExists, 
    buildTemporaryStateData, 
    parseFloatValue 
} = require('../admin.helpers');

const buildCourseMutationPayload = async (tx, input) => {
    const visibleDepartmentIds = normalizeIdArray(input.visibleDepartmentIds);
    const visibleTierIds = normalizeIdArray(input.visibleTierIds);
    const visibleCohortRoleIds = normalizeIdArray(input.visibleCohortRoleIds);
    const categoryId = normalizeNullableId(input.categoryId);
    const instructorPresetId = normalizeNullableId(input.instructorPresetId);
    const temporaryState = buildTemporaryStateData(input);

    await ensureReferenceIdsExist(tx, 'department', visibleDepartmentIds);
    await ensureReferenceIdsExist(tx, 'tier', visibleTierIds);
    await ensureReferenceIdsExist(tx, 'cohortRole', visibleCohortRoleIds);
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

    const certificateEnabled = input.certificateEnabled !== undefined ? Boolean(input.certificateEnabled) : undefined;
    const certificatePassingScore = input.certificatePassingScore !== undefined ? parseInteger(input.certificatePassingScore, 80) : undefined;
    const certificateTemplateId = normalizeNullableId(input.certificateTemplateId);
    const certificateSignatureSlots = Array.isArray(input.certificateSignatureSlots)
        ? input.certificateSignatureSlots.slice(0, 2).map((slot, index) => ({
            id: slot.id || `signature-${index + 1}`,
            label: slot.label || `Signature ${index + 1}`,
            type: slot.type || (index === 0 ? 'ORGANIZATION' : 'INSTRUCTOR'),
            enabled: slot.enabled !== false,
            instructorPresetId: slot.instructorPresetId || null,
            organizationPresetId: slot.organizationPresetId || null,
            name: slot.name || null,
            title: slot.title || null,
            signatureImageUrl: slot.signatureImageUrl || null,
            stampImageUrl: slot.stampImageUrl || null
        }))
        : undefined;

    return {
        data,
        visibleDepartmentIds,
        visibleTierIds,
        visibleCohortRoleIds,
        certificateEnabled,
        certificatePassingScore,
        certificateTemplateId,
        certificateSignatureSlots
    };
};

const saveCourseVisibility = async (tx, courseId, visibleToAll, visibleDepartmentIds, visibleTierIds, visibleCohortRoleIds) => {
    await tx.courseDepartmentAccess.deleteMany({ where: { courseId } });
    await tx.courseTierAccess.deleteMany({ where: { courseId } });
    await tx.courseCohortRoleAccess.deleteMany({ where: { courseId } });

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

    if (visibleCohortRoleIds && visibleCohortRoleIds.length > 0) {
        await tx.courseCohortRoleAccess.createMany({
            data: visibleCohortRoleIds.map((cohortRoleId) => ({
                courseId,
                cohortRoleId
            }))
        });
    }
};

const getAdminCourses = async (user, options = {}) => {
    const { page, limit, search, categoryId, courseView } = options;
    const where = {};
    
    // If not admin/superadmin, only show courses where user is staff
    if (user?.role !== USER_ROLES.ADMIN && user?.role !== USER_ROLES.SUPERADMIN) {
        const userId = user.userId || user.id;
        if (userId) {
            where.staff = {
                some: {
                    userId: userId
                }
            };
        } else {
            // Security: If we can't identify the user, they see nothing
            return page && limit ? { items: [], total: 0, pages: 0, currentPage: page } : [];
        }
    }

    if (categoryId && categoryId !== 'all') {
        where.categoryId = categoryId;
    }

    if (search) {
        where.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
        ];
    }

    const referenceDate = new Date();
    if (courseView === 'archived') {
        where.isTemporary = true;
        where.expiredAt = { lt: referenceDate };
    } else if (courseView === 'active') {
        const activeClause = {
            OR: [
                { isTemporary: false },
                { expiredAt: null },
                { expiredAt: { gte: referenceDate } }
            ]
        };
        if (where.OR) {
            where.AND = [
                { OR: where.OR },
                activeClause
            ];
            delete where.OR;
        } else {
            where.OR = activeClause.OR;
        }
    }

    // If page & limit are specified, paginate
    if (page !== undefined && limit !== undefined) {
        const skip = (page - 1) * limit;
        const baseWhere = {};
        if (user?.role !== USER_ROLES.ADMIN && user?.role !== USER_ROLES.SUPERADMIN) {
            const userId = user.userId || user.id;
            if (userId) {
                baseWhere.staff = {
                    some: {
                        userId: userId
                    }
                };
            }
        }

        const [total, courses, activeCount, archivedCount] = await Promise.all([
            prisma.course.count({ where }),
            prisma.course.findMany({
                where,
                include: courseInclude,
                orderBy: [
                    { isTemporary: 'desc' },
                    { createdAt: 'desc' }
                ],
                skip,
                take: limit
            }),
            prisma.course.count({
                where: {
                    ...baseWhere,
                    OR: [
                        { isTemporary: false },
                        { expiredAt: null },
                        { expiredAt: { gte: referenceDate } }
                    ]
                }
            }),
            prisma.course.count({
                where: {
                    ...baseWhere,
                    isTemporary: true,
                    expiredAt: { lt: referenceDate }
                }
            })
        ]);

        return {
            items: courses.map(mapCourseRecord),
            total,
            pages: Math.ceil(total / limit),
            currentPage: page,
            activeCount,
            archivedCount
        };
    }

    const courses = await prisma.course.findMany({
        where,
        include: courseInclude,
        orderBy: [
            { isTemporary: 'desc' },
            { createdAt: 'desc' }
        ]
    });

    return courses.map(mapCourseRecord);
};

const createCourse = async (input) => prisma.$transaction(async (tx) => {
    const { data, visibleDepartmentIds, visibleTierIds, visibleCohortRoleIds, certificateEnabled, certificatePassingScore, certificateTemplateId, certificateSignatureSlots } = await buildCourseMutationPayload(tx, input);
    const course = await tx.course.create({ data });
    await saveCourseVisibility(tx, course.id, data.visibleToAll, visibleDepartmentIds, visibleTierIds, visibleCohortRoleIds);
    await saveCourseCompetencies(tx, course.id, input.competencies);

    if (certificateEnabled !== undefined) {
        const defaultTemplate = certificateTemplateId
            ? await tx.certificateTemplate.findUnique({ where: { id: certificateTemplateId } })
            : await tx.certificateTemplate.findFirst({ where: { isDefault: true } });
        if (defaultTemplate) {
            await tx.courseCertificateSetting.upsert({
                where: { courseId: course.id },
                create: {
                    courseId: course.id,
                    templateId: defaultTemplate.id,
                    enabled: certificateEnabled,
                    issueMode: 'AUTOMATIC',
                    passingScore: certificatePassingScore || 80,
                    signatureSlots: certificateSignatureSlots
                },
                update: {
                    templateId: defaultTemplate.id,
                    enabled: certificateEnabled,
                    issueMode: 'AUTOMATIC',
                    passingScore: certificatePassingScore || 80,
                    signatureSlots: certificateSignatureSlots
                }
            });
        }
    }
    const createdCourse = await tx.course.findUnique({
        where: { id: course.id },
        include: courseInclude
    });
    return mapCourseRecord(createdCourse);
}, {
    maxWait: TRANSACTION_TIMEOUTS.DEFAULT_MAX_WAIT, 
    timeout: TRANSACTION_TIMEOUTS.LONG_RUNNING_TIMEOUT 
});

const updateCourse = async (id, input) => prisma.$transaction(async (tx) => {
    const { data, visibleDepartmentIds, visibleTierIds, visibleCohortRoleIds, certificateEnabled, certificatePassingScore, certificateTemplateId, certificateSignatureSlots } = await buildCourseMutationPayload(tx, input);
    await tx.course.update({ where: { id }, data });
    await saveCourseVisibility(tx, id, data.visibleToAll, visibleDepartmentIds, visibleTierIds, visibleCohortRoleIds);
    await saveCourseCompetencies(tx, id, input.competencies);

    if (certificateEnabled !== undefined) {
        const defaultTemplate = certificateTemplateId
            ? await tx.certificateTemplate.findUnique({ where: { id: certificateTemplateId } })
            : await tx.certificateTemplate.findFirst({ where: { isDefault: true } });
        if (defaultTemplate) {
            await tx.courseCertificateSetting.upsert({
                where: { courseId: id },
                create: {
                    courseId: id,
                    templateId: defaultTemplate.id,
                    enabled: certificateEnabled,
                    issueMode: 'AUTOMATIC',
                    passingScore: certificatePassingScore || 80,
                    signatureSlots: certificateSignatureSlots
                },
                update: {
                    templateId: defaultTemplate.id,
                    enabled: certificateEnabled,
                    issueMode: 'AUTOMATIC',
                    passingScore: certificatePassingScore || 80,
                    signatureSlots: certificateSignatureSlots
                }
            });
        }
    }
    const updatedCourse = await tx.course.findUnique({
        where: { id },
        include: courseInclude
    });
    return mapCourseRecord(updatedCourse);
}, {
    maxWait: TRANSACTION_TIMEOUTS.DEFAULT_MAX_WAIT,
    timeout: TRANSACTION_TIMEOUTS.LONG_RUNNING_TIMEOUT
});

const deleteCourse = async (id) => prisma.course.delete({ where: { id } });

module.exports = {
    getAdminCourses,
    createCourse,
    updateCourse,
    deleteCourse
};
