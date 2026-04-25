const prisma = require('../../../utils/prisma');
const { TRANSACTION_TIMEOUTS } = require('../../../utils/constants/config');
const { mapCourseRecord } = require('../admin.serializers');
const { courseInclude } = require('../admin.queries');
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
    const categoryId = normalizeNullableId(input.categoryId);
    const instructorPresetId = normalizeNullableId(input.instructorPresetId);
    const temporaryState = buildTemporaryStateData(input);

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
    const { data, visibleDepartmentIds, visibleTierIds } = await buildCourseMutationPayload(tx, input);
    const course = await tx.course.create({ data });
    await saveCourseVisibility(tx, course.id, data.visibleToAll, visibleDepartmentIds, visibleTierIds);
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
    const { data, visibleDepartmentIds, visibleTierIds } = await buildCourseMutationPayload(tx, input);
    await tx.course.update({ where: { id }, data });
    await saveCourseVisibility(tx, id, data.visibleToAll, visibleDepartmentIds, visibleTierIds);
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
