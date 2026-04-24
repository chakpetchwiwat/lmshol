const prisma = require('../../utils/prisma');
const { ENTITY_STATUS, REDEEM_STATUS } = require('../../utils/constants/statuses');
const { POINT_SOURCE_TYPES } = require('../../utils/constants/ledger');
const { mapCategoryRecord, mapCourseRecord } = require('./admin.serializers');
const { categoryInclude, courseInclude } = require('./admin.queries');
const { parseInteger, parseOptionalDate, normalizeNullableId, normalizeIdArray, sanitizeName, ensureReferenceName, ensureReferenceIdsExist, ensureInstructorPresetExists, buildTemporaryStateData } = require('./admin.helpers');

const buildCategoryMutationPayload = async (tx, input) => {
    const visibleDepartmentIds = normalizeIdArray(input.visibleDepartmentIds);
    const visibleTierIds = normalizeIdArray(input.visibleTierIds);
    const temporaryState = buildTemporaryStateData(input);

    await ensureReferenceIdsExist(tx, 'department', visibleDepartmentIds);
    await ensureReferenceIdsExist(tx, 'tier', visibleTierIds);

    const mutationData = {
        name: sanitizeName(input.name, 'Category'),
        icon: input.icon || 'Grid',
        type: input.type || 'KM_COURSE',
        visibleToAll: input.visibleToAll !== undefined ? Boolean(input.visibleToAll) : true,
        ...temporaryState
    };

    if (input.order !== undefined) {
        mutationData.order = parseInteger(input.order, 0);
    }

    return {
        data: mutationData,
        visibleDepartmentIds,
        visibleTierIds
    };
};

const saveCategoryVisibility = async (tx, categoryId, visibleToAll, visibleDepartmentIds, visibleTierIds) => {
    await tx.categoryDepartmentAccess.deleteMany({ where: { categoryId } });
    await tx.categoryTierAccess.deleteMany({ where: { categoryId } });

    if (visibleToAll) {
        return;
    }

    if (visibleDepartmentIds.length > 0) {
        await tx.categoryDepartmentAccess.createMany({
            data: visibleDepartmentIds.map((departmentId) => ({
                categoryId,
                departmentId
            }))
        });
    }

    if (visibleTierIds.length > 0) {
        await tx.categoryTierAccess.createMany({
            data: visibleTierIds.map((tierId) => ({
                categoryId,
                tierId
            }))
        });
    }
};

const getCategories = async () => {
    const categories = await prisma.category.findMany({
        include: categoryInclude,
        orderBy: [
            { isTemporary: 'desc' },
            { order: 'asc' }
        ]
    });

    return categories.map(mapCategoryRecord);
};

const createCategory = async (input) => prisma.$transaction(async (tx) => {
    const { data, visibleDepartmentIds, visibleTierIds } = await buildCategoryMutationPayload(tx, input);

    const category = await tx.category.create({
        data
    });

    await saveCategoryVisibility(tx, category.id, data.visibleToAll, visibleDepartmentIds, visibleTierIds);

    const createdCategory = await tx.category.findUnique({
        where: { id: category.id },
        include: categoryInclude
    });

    return mapCategoryRecord(createdCategory);
});

const updateCategory = async (id, input) => prisma.$transaction(async (tx) => {
    const { data, visibleDepartmentIds, visibleTierIds } = await buildCategoryMutationPayload(tx, input);

    await tx.category.update({
        where: { id },
        data
    });

    await saveCategoryVisibility(tx, id, data.visibleToAll, visibleDepartmentIds, visibleTierIds);

    const updatedCategory = await tx.category.findUnique({
        where: { id },
        include: categoryInclude
    });

    return mapCategoryRecord(updatedCategory);
});

const republishCategory = async (id) => {
    const category = await prisma.category.update({
        where: { id },
        data: {
            isTemporary: false,
            expiredAt: null
        },
        include: categoryInclude
    });

    return mapCategoryRecord(category);
};

const archiveCategory = async (id) => prisma.category.update({
    where: { id },
    data: {
        isTemporary: true,
        expiredAt: new Date()
    },
    include: categoryInclude
});

const deleteCategory = async (id) => prisma.category.delete({
    where: { id }
});

const reorderCategories = async (categoryIds) => prisma.$transaction(
    categoryIds.map((id, index) => prisma.category.update({
        where: { id },
        data: { order: index }
    }))
);

module.exports = {
    buildCategoryMutationPayload,
    saveCategoryVisibility,
    getCategories,
    createCategory,
    updateCategory,
    republishCategory,
    archiveCategory,
    deleteCategory,
    reorderCategories,
};
