const prisma = require('../../utils/prisma');
const xlsx = require('xlsx');

const normalizeText = (value) => {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text || null;
};

const normalizeCode = (value, fallback) => {
    const source = normalizeText(value) || fallback;
    return String(source || '')
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^\w.-]/g, '_')
        .toUpperCase();
};

const normalizeRequiredLevel = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const levelMatch = String(value).match(/\d+/);
    const level = levelMatch ? parseInt(levelMatch[0], 10) : NaN;
    if (Number.isNaN(level) || level < 1) {
        throw new Error('Invalid competency level.');
    }
    return level;
};

const normalizeLookupKey = (value) => String(value || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

const splitImportList = (value) => {
    const text = normalizeText(value);
    if (!text) return [];
    return text
        .split(/[,;|\n]+/)
        .map((item) => normalizeText(item))
        .filter(Boolean);
};

const parseDisplayOrder = (value, fallback = 0) => {
    const match = String(value || '').match(/\d+/);
    return match ? parseInt(match[0], 10) : fallback;
};

const parseLevelCount = (value, fallback = 3) => {
    const count = parseDisplayOrder(value, fallback);
    return count > 0 ? count : fallback;
};

const parseMeasurementLevels = (description, levelCount) => {
    const source = normalizeText(description);
    const count = parseLevelCount(levelCount, 3);
    const parts = source
        ? source.split('|').map((part) => normalizeText(part)).filter(Boolean)
        : [];

    return Array.from({ length: count }, (_, index) => {
        const level = index + 1;
        const part = parts.find((item) => {
            const numeric = item.match(/(?:ระดับ|level|l)\s*(\d+|i{1,5}|iv|v)/i)?.[1];
            if (!numeric) return false;
            const roman = { i: 1, ii: 2, iii: 3, iv: 4, v: 5 };
            const parsed = /^\d+$/.test(numeric) ? parseInt(numeric, 10) : roman[numeric.toLowerCase()];
            return parsed === level;
        }) || parts[index] || null;

        return {
            level,
            label: `Level ${level}`,
            description: part,
            measurementCriteria: part,
            displayOrder: index
        };
    });
};

const makeImportCode = (value, fallback) => normalizeCode(value, fallback)
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

const buildGbtRows = (fileBuffer) => {
    const workbook = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
        blankrows: false
    });

    if (rows.length < 2) {
        throw new Error('GBT workbook has no competency rows.');
    }

    return rows.slice(1)
        .map((row, index) => {
            const firstColumns = row.slice(0, 11);
            return {
                rowNumber: index + 2,
                levelGroup: normalizeText(firstColumns[0]),
                competencyType: normalizeText(firstColumns[1]),
                categoryName: normalizeText(firstColumns[2]),
                code: normalizeText(firstColumns[3]),
                sourceRole: normalizeText(firstColumns[4]),
                legacyCode: normalizeText(firstColumns[5]),
                name: normalizeText(firstColumns[6]),
                description: normalizeText(firstColumns[7]),
                note: normalizeText(firstColumns[8]),
                levelCount: normalizeText(firstColumns[9]),
                measurementDescription: normalizeText(firstColumns[10])
            };
        })
        .filter((row) => row.code && row.name);
};

const normalizeMappings = (mappings = []) => {
    if (!Array.isArray(mappings)) return [];

    const seen = new Set();
    return mappings
        .map((mapping) => ({
            competencyId: normalizeText(mapping?.competencyId),
            requiredLevel: normalizeRequiredLevel(mapping?.requiredLevel),
            note: normalizeText(mapping?.note)
        }))
        .filter((mapping) => Boolean(mapping.competencyId))
        .filter((mapping) => {
            if (seen.has(mapping.competencyId)) return false;
            seen.add(mapping.competencyId);
            return true;
        });
};

const resolveImportedCompetencyMappings = async (tx, input = {}) => {
    const codes = splitImportList(input.codes);
    const names = splitImportList(input.names);
    const levels = splitImportList(input.levels);
    const notes = splitImportList(input.notes);
    const itemCount = Math.max(codes.length, names.length);

    if (itemCount === 0) {
        return { mappings: [], unmatched: [] };
    }

    const competencies = await tx.competency.findMany({
        include: {
            levels: true,
            legacyCodes: true
        }
    });

    const byCode = new Map();
    const byName = new Map();
    competencies.forEach((competency) => {
        byCode.set(normalizeLookupKey(competency.code), competency);
        byName.set(normalizeLookupKey(competency.name), competency);
        
        // Match by any of the legacy codes in the new table relation
        if (competency.legacyCodes && Array.isArray(competency.legacyCodes)) {
            competency.legacyCodes.forEach(lc => {
                byCode.set(normalizeLookupKey(lc.code), competency);
            });
        }
        
        // Backward compatibility: match by legacyCode string
        if (competency.legacyCode) {
            competency.legacyCode.split(',').forEach(c => {
                const trimmed = c.trim();
                if (trimmed) {
                    byCode.set(normalizeLookupKey(trimmed), competency);
                }
            });
        }
    });

    const seen = new Set();
    const mappings = [];
    const unmatched = [];

    for (let index = 0; index < itemCount; index++) {
        const code = codes[index] || (codes.length === 1 ? codes[0] : null);
        const name = names[index] || (names.length === 1 ? names[0] : null);
        const competency = (
            code ? byCode.get(normalizeLookupKey(code)) : null
        ) || (
            name ? byName.get(normalizeLookupKey(name)) : null
        );

        if (!competency) {
            unmatched.push([code, name].filter(Boolean).join(' / ') || `item ${index + 1}`);
            continue;
        }

        if (seen.has(competency.id)) continue;
        seen.add(competency.id);

        const levelValue = levels[index] || (levels.length === 1 ? levels[0] : null);
        const noteValue = notes[index] || (notes.length === 1 ? notes[0] : null);
        mappings.push({
            competencyId: competency.id,
            requiredLevel: normalizeRequiredLevel(levelValue),
            note: normalizeText(noteValue)
        });
    }

    return { mappings, unmatched };
};

const competencyInclude = {
    category: {
        include: {
            group: true
        }
    },
    legacyCodes: true,
    levels: {
        orderBy: [
            { displayOrder: 'asc' },
            { level: 'asc' }
        ]
    }
};

const courseCompetencyInclude = {
    competency: {
        include: competencyInclude
    }
};

const certificateCompetencyInclude = courseCompetencyInclude;

const serializeCompetency = (competency) => {
    if (!competency) return null;
    return {
        ...competency,
        group: competency.category?.group || null,
        groupId: competency.category?.groupId || null,
        categoryName: competency.category?.name || null,
        groupName: competency.category?.group?.name || null,
        legacyCodes: Array.isArray(competency.legacyCodes)
            ? competency.legacyCodes.map(lc => lc.code)
            : []
    };
};

const serializeMapping = (mapping) => ({
    id: mapping.id,
    competencyId: mapping.competencyId,
    requiredLevel: mapping.requiredLevel,
    note: mapping.note || '',
    competency: mapping.competency ? serializeCompetency(mapping.competency) : null
});

const getCompetencies = async () => {
    const competencies = await prisma.competency.findMany({
        include: competencyInclude,
        orderBy: [
            { category: { group: { displayOrder: 'asc' } } },
            { category: { displayOrder: 'asc' } },
            { displayOrder: 'asc' },
            { name: 'asc' }
        ]
    });

    return competencies.map(serializeCompetency);
};

const getCompetencyTree = async () => prisma.competencyGroup.findMany({
    include: {
        categories: {
            include: {
                competencies: {
                    include: {
                        levels: {
                            orderBy: [
                                { displayOrder: 'asc' },
                                { level: 'asc' }
                            ]
                        }
                    },
                    orderBy: [
                        { displayOrder: 'asc' },
                        { name: 'asc' }
                    ]
                }
            },
            orderBy: [
                { displayOrder: 'asc' },
                { name: 'asc' }
            ]
        }
    },
    orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' }
    ]
});

const createCompetencyGroup = async (input = {}) => prisma.competencyGroup.create({
    data: {
        code: normalizeCode(input.code, input.name),
        name: normalizeText(input.name),
        description: normalizeText(input.description),
        displayOrder: parseInt(input.displayOrder || 0, 10),
        status: input.status || 'ACTIVE'
    }
});

const createCompetencyCategory = async (input = {}) => prisma.competencyCategory.create({
    data: {
        groupId: normalizeText(input.groupId),
        code: normalizeCode(input.code, input.name),
        name: normalizeText(input.name),
        description: normalizeText(input.description),
        displayOrder: parseInt(input.displayOrder || 0, 10),
        status: input.status || 'ACTIVE'
    }
});

const createCompetency = async (input = {}) => {
    const mainCode = normalizeCode(input.code, input.name);
    // Validate main code uniqueness
    const existing = await prisma.competency.findUnique({ where: { code: mainCode } });
    if (existing) {
        throw new Error(`รหัสสมรรถนะหลัก (Code) '${mainCode}' มีอยู่แล้วในระบบ กรุณาใช้รหัสอื่น`);
    }

    const legacyCodesList = Array.isArray(input.legacyCodes)
        ? input.legacyCodes.map(c => normalizeText(c)).filter(Boolean)
        : [];
    const legacyCodeStr = legacyCodesList.join(', ');

    return prisma.$transaction(async (tx) => {
        const competency = await tx.competency.create({
            data: {
                categoryId: normalizeText(input.categoryId),
                gbtLevel: normalizeText(input.gbtLevel),
                competencyType: normalizeText(input.competencyType),
                code: mainCode,
                legacyCode: legacyCodeStr,
                sourceRole: normalizeText(input.sourceRole),
                name: normalizeText(input.name),
                description: normalizeText(input.description),
                conditionsNote: normalizeText(input.conditionsNote),
                measurementLevelCount: input.measurementLevelCount ? parseInt(input.measurementLevelCount, 10) : null,
                measurementDescription: normalizeText(input.measurementDescription),
                sourceColumnK: normalizeText(input.sourceColumnK),
                displayOrder: parseInt(input.displayOrder || 0, 10),
                status: input.status || 'ACTIVE',
                levels: Array.isArray(input.levels) && input.levels.length > 0
                    ? {
                        create: input.levels.map((level, index) => ({
                            level: normalizeRequiredLevel(level.level || index + 1),
                            label: normalizeText(level.label),
                            description: normalizeText(level.description),
                            measurementCriteria: normalizeText(level.measurementCriteria),
                            displayOrder: parseInt(level.displayOrder ?? index, 10)
                        }))
                    }
                    : undefined
            },
            include: competencyInclude
        });

        for (const code of legacyCodesList) {
            await tx.competencyLegacyCode.create({
                data: {
                    competencyId: competency.id,
                    code
                }
            });
        }

        return tx.competency.findUnique({
            where: { id: competency.id },
            include: competencyInclude
        });
    });
};

const updateCompetency = async (id, input = {}) => {
    const mainCode = normalizeCode(input.code, input.name);
    const existing = await prisma.competency.findUnique({ where: { code: mainCode } });
    if (existing && existing.id !== id) {
        throw new Error(`รหัสสมรรถนะหลัก (Code) '${mainCode}' มีอยู่แล้วในระบบ กรุณาใช้รหัสอื่น`);
    }

    const legacyCodesList = Array.isArray(input.legacyCodes)
        ? input.legacyCodes.map(c => normalizeText(c)).filter(Boolean)
        : [];
    const legacyCodeStr = legacyCodesList.join(', ');

    return prisma.$transaction(async (tx) => {
        const competency = await tx.competency.update({
            where: { id },
            data: {
                categoryId: normalizeText(input.categoryId),
                gbtLevel: normalizeText(input.gbtLevel),
                competencyType: normalizeText(input.competencyType),
                code: mainCode,
                legacyCode: legacyCodeStr,
                sourceRole: normalizeText(input.sourceRole),
                name: normalizeText(input.name),
                description: normalizeText(input.description),
                conditionsNote: normalizeText(input.conditionsNote),
                measurementLevelCount: input.measurementLevelCount ? parseInt(input.measurementLevelCount, 10) : null,
                measurementDescription: normalizeText(input.measurementDescription),
                sourceColumnK: normalizeText(input.sourceColumnK),
                displayOrder: parseInt(input.displayOrder || 0, 10),
                status: input.status || 'ACTIVE'
            }
        });

        // Sync legacy codes
        await tx.competencyLegacyCode.deleteMany({
            where: {
                competencyId: id,
                code: {
                    notIn: legacyCodesList
                }
            }
        });

        for (const code of legacyCodesList) {
            await tx.competencyLegacyCode.upsert({
                where: {
                    competencyId_code: {
                        competencyId: id,
                        code
                    }
                },
                update: {},
                create: {
                    competencyId: id,
                    code
                }
            });
        }

        // Sync levels
        if (Array.isArray(input.levels)) {
            const inputLevels = input.levels.map((level, index) => normalizeRequiredLevel(level.level || index + 1));
            await tx.competencyLevel.deleteMany({
                where: {
                    competencyId: id,
                    level: {
                        notIn: inputLevels
                    }
                }
            });

            for (let index = 0; index < input.levels.length; index++) {
                const levelData = input.levels[index];
                const levelNum = normalizeRequiredLevel(levelData.level || index + 1);
                await tx.competencyLevel.upsert({
                    where: {
                        competencyId_level: {
                            competencyId: id,
                            level: levelNum
                        }
                    },
                    update: {
                        label: normalizeText(levelData.label),
                        description: normalizeText(levelData.description),
                        measurementCriteria: normalizeText(levelData.measurementCriteria),
                        displayOrder: parseInt(levelData.displayOrder ?? index, 10)
                    },
                    create: {
                        competencyId: id,
                        level: levelNum,
                        label: normalizeText(levelData.label),
                        description: normalizeText(levelData.description),
                        measurementCriteria: normalizeText(levelData.measurementCriteria),
                        displayOrder: parseInt(levelData.displayOrder ?? index, 10)
                    }
                });
            }
        }

        return tx.competency.findUnique({
            where: { id },
            include: competencyInclude
        });
    });
};

const deleteCompetency = async (id) => {
    return prisma.competency.delete({
        where: { id }
    });
};

const updateCompetencyGroup = async (id, input = {}) => {
    return prisma.competencyGroup.update({
        where: { id },
        data: {
            code: normalizeCode(input.code, input.name),
            name: normalizeText(input.name),
            description: normalizeText(input.description),
            displayOrder: parseInt(input.displayOrder || 0, 10),
            status: input.status || 'ACTIVE'
        }
    });
};

const deleteCompetencyGroup = async (id) => {
    return prisma.competencyGroup.delete({
        where: { id }
    });
};

const updateCompetencyCategory = async (id, input = {}) => {
    return prisma.competencyCategory.update({
        where: { id },
        data: {
            groupId: normalizeText(input.groupId),
            code: normalizeCode(input.code, input.name),
            name: normalizeText(input.name),
            description: normalizeText(input.description),
            displayOrder: parseInt(input.displayOrder || 0, 10),
            status: input.status || 'ACTIVE'
        }
    });
};

const deleteCompetencyCategory = async (id) => {
    return prisma.competencyCategory.delete({
        where: { id }
    });
};

const importGbtCompetencies = async (fileBuffer) => {
    if (!fileBuffer) {
        throw new Error('Please upload a GBT Excel file.');
    }

    const rows = buildGbtRows(fileBuffer);
    const summary = {
        importedRows: rows.length,
        groupsCreated: 0,
        groupsUpdated: 0,
        categoriesCreated: 0,
        categoriesUpdated: 0,
        competenciesCreated: 0,
        competenciesUpdated: 0,
        levelsUpserted: 0,
        skippedRows: 0,
        logs: []
    };

    await prisma.$transaction(async (tx) => {
        const groupCodeToId = new Map();
        const categoryCodeToId = new Map();

        for (const row of rows) {
            const groupCode = makeImportCode(row.levelGroup, 'GBT_LEVEL');
            const groupName = row.levelGroup || 'GBT Level';
            const categoryCode = makeImportCode(`${groupCode}_${row.categoryName}`, `${groupCode}_CATEGORY`);
            const categoryName = row.categoryName || 'Uncategorized';
            const levels = parseMeasurementLevels(row.measurementDescription, row.levelCount);
            const measurementLevelCount = parseLevelCount(row.levelCount, levels.length || 3);
            let groupId = groupCodeToId.get(groupCode);
            if (!groupId) {
                const existingGroup = await tx.competencyGroup.findUnique({ where: { code: groupCode } });
                const group = existingGroup
                    ? await tx.competencyGroup.update({
                        where: { id: existingGroup.id },
                        data: {
                            name: groupName,
                            description: row.competencyType,
                            displayOrder: parseDisplayOrder(row.levelGroup, summary.groupsUpdated)
                        }
                    })
                    : await tx.competencyGroup.create({
                        data: {
                            code: groupCode,
                            name: groupName,
                            description: row.competencyType,
                            displayOrder: parseDisplayOrder(row.levelGroup, summary.groupsCreated)
                        }
                    });

                if (existingGroup) summary.groupsUpdated++;
                else summary.groupsCreated++;
                groupId = group.id;
                groupCodeToId.set(groupCode, groupId);
            }

            let categoryId = categoryCodeToId.get(categoryCode);
            if (!categoryId) {
                const existingCategory = await tx.competencyCategory.findUnique({ where: { code: categoryCode } });
                const category = existingCategory
                    ? await tx.competencyCategory.update({
                        where: { id: existingCategory.id },
                        data: {
                            groupId,
                            name: categoryName,
                            description: row.competencyType,
                            displayOrder: summary.categoriesUpdated
                        }
                    })
                    : await tx.competencyCategory.create({
                        data: {
                            groupId,
                            code: categoryCode,
                            name: categoryName,
                            description: row.competencyType,
                            displayOrder: summary.categoriesCreated
                        }
                    });

                if (existingCategory) summary.categoriesUpdated++;
                else summary.categoriesCreated++;
                categoryId = category.id;
                categoryCodeToId.set(categoryCode, categoryId);
            }

            const existingCompetency = await tx.competency.findUnique({ where: { code: row.code } });
            const competency = existingCompetency
                ? await tx.competency.update({
                    where: { id: existingCompetency.id },
                    data: {
                        categoryId,
                        gbtLevel: row.levelGroup,
                        competencyType: row.competencyType,
                        legacyCode: row.legacyCode,
                        sourceRole: row.sourceRole,
                        name: row.name,
                        description: row.description,
                        conditionsNote: row.note,
                        measurementLevelCount,
                        measurementDescription: row.measurementDescription,
                        sourceColumnK: row.measurementDescription,
                        displayOrder: row.rowNumber,
                        status: 'ACTIVE'
                    }
                })
                : await tx.competency.create({
                    data: {
                        categoryId,
                        gbtLevel: row.levelGroup,
                        competencyType: row.competencyType,
                        code: row.code,
                        legacyCode: row.legacyCode,
                        sourceRole: row.sourceRole,
                        name: row.name,
                        description: row.description,
                        conditionsNote: row.note,
                        measurementLevelCount,
                        measurementDescription: row.measurementDescription,
                        sourceColumnK: row.measurementDescription,
                        displayOrder: row.rowNumber,
                        status: 'ACTIVE'
                    }
                });

            if (existingCompetency) summary.competenciesUpdated++;
            else summary.competenciesCreated++;

            // Handle legacy codes for this imported competency
            const legacyCodesList = row.legacyCode
                ? row.legacyCode.split(',').map(c => c.trim()).filter(Boolean)
                : [];
            
            await tx.competencyLegacyCode.deleteMany({
                where: {
                    competencyId: competency.id,
                    code: {
                        notIn: legacyCodesList
                    }
                }
            });

            for (const code of legacyCodesList) {
                await tx.competencyLegacyCode.upsert({
                    where: {
                        competencyId_code: {
                            competencyId: competency.id,
                            code: code
                        }
                    },
                    update: {},
                    create: {
                        competencyId: competency.id,
                        code: code
                    }
                });
            }

            for (const levelInput of levels) {
                await tx.competencyLevel.upsert({
                    where: {
                        competencyId_level: {
                            competencyId: competency.id,
                            level: levelInput.level
                        }
                    },
                    update: {
                        label: levelInput.label,
                        description: levelInput.description,
                        measurementCriteria: levelInput.measurementCriteria,
                        displayOrder: levelInput.displayOrder
                    },
                    create: {
                        competencyId: competency.id,
                        ...levelInput
                    }
                });
                summary.levelsUpserted++;
            }

            await tx.competencyLevel.deleteMany({
                where: {
                    competencyId: competency.id,
                    level: {
                        notIn: levels.map((level) => level.level)
                    }
                }
            });
        }
    }, { timeout: 600000 });

    summary.logs.push(`Imported ${summary.importedRows} GBT competency rows.`);
    return summary;
};

const ensureCompetencyMappingsValid = async (tx, mappings) => {
    if (mappings.length === 0) return;

    const competencies = await tx.competency.findMany({
        where: {
            id: {
                in: mappings.map((mapping) => mapping.competencyId)
            }
        },
        include: {
            levels: true
        }
    });

    if (competencies.length !== mappings.length) {
        throw new Error('Some competency items were not found.');
    }

    const competencyById = new Map(competencies.map((competency) => [competency.id, competency]));
    for (const mapping of mappings) {
        if (!mapping.requiredLevel) continue;
        const competency = competencyById.get(mapping.competencyId);
        const hasConfiguredLevels = Array.isArray(competency.levels) && competency.levels.length > 0;
        if (hasConfiguredLevels && !competency.levels.some((level) => level.level === mapping.requiredLevel)) {
            throw new Error(`Invalid level for competency ${competency.code}.`);
        }
    }
};

const saveCourseCompetencies = async (tx, courseId, mappingsInput) => {
    if (!Array.isArray(mappingsInput)) return;

    const mappings = normalizeMappings(mappingsInput);
    await ensureCompetencyMappingsValid(tx, mappings);
    await tx.courseCompetency.deleteMany({ where: { courseId } });

    if (mappings.length === 0) return;

    await tx.courseCompetency.createMany({
        data: mappings.map((mapping) => ({
            courseId,
            competencyId: mapping.competencyId,
            requiredLevel: mapping.requiredLevel,
            note: mapping.note
        }))
    });
};

const saveUserCertificateCompetencies = async (tx, userCertificateId, mappingsInput) => {
    if (!Array.isArray(mappingsInput)) return;

    const mappings = normalizeMappings(mappingsInput);
    await ensureCompetencyMappingsValid(tx, mappings);
    await tx.userCertificateCompetency.deleteMany({ where: { userCertificateId } });

    if (mappings.length === 0) return;

    await tx.userCertificateCompetency.createMany({
        data: mappings.map((mapping) => ({
            userCertificateId,
            competencyId: mapping.competencyId,
            requiredLevel: mapping.requiredLevel,
            note: mapping.note
        }))
    });
};

module.exports = {
    competencyInclude,
    courseCompetencyInclude,
    certificateCompetencyInclude,
    getCompetencies,
    getCompetencyTree,
    createCompetencyGroup,
    updateCompetencyGroup,
    deleteCompetencyGroup,
    createCompetencyCategory,
    updateCompetencyCategory,
    deleteCompetencyCategory,
    createCompetency,
    updateCompetency,
    deleteCompetency,
    importGbtCompetencies,
    serializeMapping,
    resolveImportedCompetencyMappings,
    saveCourseCompetencies,
    saveUserCertificateCompetencies
};
