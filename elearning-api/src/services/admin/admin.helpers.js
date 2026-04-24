const prisma = require('../../utils/prisma');
const authHelpers = require('../../utils/auth.helpers');

const getActorContext = (authUser) => authHelpers.getActorContext(prisma, authUser);

const parseInteger = (value, fallback = 0) => {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};

const parseFloatValue = (value, fallback = 0) => {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? fallback : parsed;
};

const parseOptionalDate = (value, fieldLabel = 'Expiration date') => {
    if (value === undefined) {
        return undefined;
    }

    if (value === null || value === '') {
        return null;
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        throw new Error(`${fieldLabel} is invalid`);
    }

    return parsed;
};

const getMonthDateRange = (month, year) => {
    if (!month || !year) {
        return null;
    }

    const parsedMonth = parseInt(month, 10);
    const parsedYear = parseInt(year, 10);

    if (Number.isNaN(parsedMonth) || Number.isNaN(parsedYear)) {
        return null;
    }

    return {
        start: new Date(parsedYear, parsedMonth - 1, 1, 0, 0, 0, 0),
        end: new Date(parsedYear, parsedMonth, 0, 23, 59, 59, 999)
    };
};

const normalizeNullableId = (value) => {
    if (value === undefined) {
        return undefined;
    }

    if (value === null || value === '') {
        return null;
    }

    return String(value);
};

const normalizeIdArray = (values) => {
    if (!Array.isArray(values)) {
        return [];
    }

    return [...new Set(
        values
            .filter(Boolean)
            .map((value) => String(value))
    )];
};

const sanitizeName = (value, entityLabel) => {
    const name = String(value || '').trim();

    if (!name) {
        throw new Error(`${entityLabel} name is required`);
    }

    return name;
};

const ensureReferenceName = async (tx, modelName, id) => {
    if (!id) {
        return null;
    }

    const entity = await tx[modelName].findUnique({
        where: { id },
        select: { id: true, name: true }
    });

    if (!entity) {
        throw new Error(`${modelName} not found`);
    }

    return entity;
};

const ensureReferenceIdsExist = async (tx, modelName, ids) => {
    if (!ids.length) {
        return;
    }

    const count = await tx[modelName].count({
        where: {
            id: {
                in: ids
            }
        }
    });

    if (count !== ids.length) {
        throw new Error(`Invalid ${modelName} selection`);
    }
};

const ensureInstructorPresetExists = async (tx, id) => {
    if (!id) {
        return null;
    }

    const preset = await tx.instructorPreset.findUnique({
        where: { id }
    });

    if (!preset) {
        throw new Error('Instructor preset not found');
    }

    return preset;
};

const buildTemporaryStateData = (input) => {
    const isTemporary = Boolean(input.isTemporary);
    const expiredAt = parseOptionalDate(input.expiredAt);

    if (isTemporary && !expiredAt) {
        throw new Error('Temporary items require an expiration date');
    }

    return {
        isTemporary,
        expiredAt: isTemporary ? expiredAt : null
    };
};

module.exports = {
    getActorContext,
    parseInteger,
    parseFloatValue,
    parseOptionalDate,
    getMonthDateRange,
    normalizeNullableId,
    normalizeIdArray,
    sanitizeName,
    ensureReferenceName,
    ensureReferenceIdsExist,
    ensureInstructorPresetExists,
    buildTemporaryStateData,
};
