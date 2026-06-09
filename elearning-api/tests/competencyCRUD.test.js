const test = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../src/utils/prisma');
const AdminCompetencies = require('../src/services/admin/admin.competencies');

test('Competency Framework CRUD & Legacy Codes Integration Test', async (t) => {
  // Test data constants
  const GROUP_CODE = 'TEST_GROUP_X';
  const CAT_CODE = 'TEST_CAT_X';
  const COMP_CODE_1 = 'TEST_COMP_X1';
  const COMP_CODE_2 = 'TEST_COMP_X2';
  
  let testGroup = null;
  let testCategory = null;
  let testCompetency = null;

  // Cleanup helper
  const cleanup = async () => {
    try {
      await prisma.competencyLegacyCode.deleteMany({
        where: { competency: { code: { in: [COMP_CODE_1, COMP_CODE_2] } } }
      });
      await prisma.competency.deleteMany({
        where: { code: { in: [COMP_CODE_1, COMP_CODE_2] } }
      });
      await prisma.competencyCategory.deleteMany({
        where: { code: CAT_CODE }
      });
      await prisma.competencyGroup.deleteMany({
        where: { code: GROUP_CODE }
      });
      await prisma.competencyType.deleteMany({
        where: { code: { in: ['TEST_TYPE_Y', 'TEST_TYPE_Y_RENAMED'] } }
      });
    } catch (err) {
      console.warn("Cleanup warning:", err.message);
    }
  };

  // Run cleanup before we start
  await cleanup();

  await t.test('1. Create Competency Group and Category', async () => {
    testGroup = await AdminCompetencies.createCompetencyGroup({
      code: GROUP_CODE,
      name: 'Test Group Name',
      description: 'Test Group Desc',
      displayOrder: 99
    });
    assert.ok(testGroup.id);
    assert.equal(testGroup.code, GROUP_CODE);

    testCategory = await AdminCompetencies.createCompetencyCategory({
      groupId: testGroup.id,
      code: CAT_CODE,
      name: 'Test Category Name',
      description: 'Test Category Desc',
      displayOrder: 99
    });
    assert.ok(testCategory.id);
    assert.equal(testCategory.code, CAT_CODE);
  });

  await t.test('2. Create Competency with multiple legacy codes and rubrics', async () => {
    testCompetency = await AdminCompetencies.createCompetency({
      categoryId: testCategory.id,
      code: COMP_CODE_1,
      name: 'Test Competency Name',
      description: 'Test Competency Desc',
      legacyCodes: ['LEGACY_X1', 'LEGACY_X2'],
      levels: [
        { level: 1, label: 'L1', description: 'Level 1 Rubric', displayOrder: 0 },
        { level: 2, label: 'L2', description: 'Level 2 Rubric', displayOrder: 1 }
      ]
    });

    assert.ok(testCompetency.id);
    assert.equal(testCompetency.code, COMP_CODE_1);
    
    // Check legacyCode string synchronization (comma-separated)
    assert.equal(testCompetency.legacyCode, 'LEGACY_X1, LEGACY_X2');

    // Check relation table entries in database
    const dbLegacyCodes = await prisma.competencyLegacyCode.findMany({
      where: { competencyId: testCompetency.id },
      orderBy: { code: 'asc' }
    });
    assert.equal(dbLegacyCodes.length, 2);
    assert.equal(dbLegacyCodes[0].code, 'LEGACY_X1');
    assert.equal(dbLegacyCodes[1].code, 'LEGACY_X2');

    // Check levels
    assert.equal(testCompetency.levels.length, 2);
    assert.equal(testCompetency.levels[0].level, 1);
    assert.equal(testCompetency.levels[1].level, 2);
  });

  await t.test('3. Enforce uniqueness of Main Code', async () => {
    await assert.rejects(
      async () => {
        await AdminCompetencies.createCompetency({
          categoryId: testCategory.id,
          code: COMP_CODE_1, // duplicate code
          name: 'Duplicate Competency'
        });
      },
      /มีอยู่แล้วในระบบ/
    );
  });

  await t.test('4. Update Competency (sync legacy codes and levels)', async () => {
    const updated = await AdminCompetencies.updateCompetency(testCompetency.id, {
      categoryId: testCategory.id,
      code: COMP_CODE_1,
      name: 'Updated Name',
      legacyCodes: ['LEGACY_X2', 'LEGACY_X3', 'LEGACY_X4'], // removed X1, added X3, X4
      levels: [
        { level: 2, label: 'L2 Updated', description: 'Level 2 Rubric Updated', displayOrder: 0 },
        { level: 3, label: 'L3', description: 'Level 3 Rubric', displayOrder: 1 } // removed 1, added 3
      ]
    });

    assert.equal(updated.name, 'Updated Name');
    assert.equal(updated.legacyCode, 'LEGACY_X2, LEGACY_X3, LEGACY_X4');

    // Check database relation table has updated entries
    const dbLegacyCodes = await prisma.competencyLegacyCode.findMany({
      where: { competencyId: testCompetency.id },
      orderBy: { code: 'asc' }
    });
    assert.equal(dbLegacyCodes.length, 3);
    assert.equal(dbLegacyCodes[0].code, 'LEGACY_X2');
    assert.equal(dbLegacyCodes[1].code, 'LEGACY_X3');
    assert.equal(dbLegacyCodes[2].code, 'LEGACY_X4');

    // Check levels in DB
    const dbLevels = await prisma.competencyLevel.findMany({
      where: { competencyId: testCompetency.id },
      orderBy: { level: 'asc' }
    });
    assert.equal(dbLevels.length, 2);
    assert.equal(dbLevels[0].level, 2);
    assert.equal(dbLevels[0].label, 'L2 Updated');
    assert.equal(dbLevels[1].level, 3);
  });

  await t.test('5. Resolve competency mappings matches via new legacyCodes table', async () => {
    const mappingsResult = await AdminCompetencies.resolveImportedCompetencyMappings(prisma, {
      codes: 'LEGACY_X3', // matches the newly mapped legacy code!
      names: '',
      levels: '2',
      notes: 'Test mapping note'
    });

    assert.equal(mappingsResult.mappings.length, 1);
    assert.equal(mappingsResult.mappings[0].competencyId, testCompetency.id);
    assert.equal(mappingsResult.mappings[0].requiredLevel, 2);
  });

  let testType = null;
  await t.test('5.5. Test database synchronization cascades', async () => {
    // A. Create a CompetencyType
    testType = await AdminCompetencies.createCompetencyType({
      code: 'TEST_TYPE_Y',
      name: 'Test Type Y Name',
      description: 'Test Type Y Desc',
      displayOrder: 99
    });
    assert.ok(testType.id);

    // B. Assign this CompetencyType to the category by setting category description to the type's name
    const updatedCat = await AdminCompetencies.updateCompetencyCategory(testCategory.id, {
      groupId: testGroup.id,
      code: testCategory.code,
      name: testCategory.name,
      description: 'Test Type Y Name',
      displayOrder: testCategory.displayOrder
    });
    assert.equal(updatedCat.description, 'Test Type Y Name');

    // C. Verify that the child competency's competencyType and competencyTypeId are automatically updated
    const checkCompAfterCatUpdate = await prisma.competency.findUnique({
      where: { id: testCompetency.id }
    });
    assert.equal(checkCompAfterCatUpdate.competencyType, 'Test Type Y Name');
    assert.equal(checkCompAfterCatUpdate.competencyTypeId, testType.id);

    // D. Rename the CompetencyType
    const renamedType = await AdminCompetencies.updateCompetencyType(testType.id, {
      code: 'TEST_TYPE_Y_RENAMED',
      name: 'Test Type Y Renamed Name',
      description: 'Test Type Y Desc',
      displayOrder: 99
    });
    assert.equal(renamedType.name, 'Test Type Y Renamed Name');

    // E. Verify that Category description is updated automatically to 'Test Type Y Renamed Name'
    const checkCatAfterTypeRename = await prisma.competencyCategory.findUnique({
      where: { id: testCategory.id }
    });
    assert.equal(checkCatAfterTypeRename.description, 'Test Type Y Renamed Name');

    // F. Verify that child competency's competencyType string is updated automatically
    const checkCompAfterTypeRename = await prisma.competency.findUnique({
      where: { id: testCompetency.id }
    });
    assert.equal(checkCompAfterTypeRename.competencyType, 'Test Type Y Renamed Name');

    // G. Create a new competency under this category, and verify it automatically derives the type
    const newCompetency = await AdminCompetencies.createCompetency({
      categoryId: testCategory.id,
      code: COMP_CODE_2,
      name: 'Derived Type Competency',
      levels: []
    });
    assert.equal(newCompetency.competencyType, 'Test Type Y Renamed Name');
    assert.equal(newCompetency.competencyTypeId, testType.id);

    // H. Delete the CompetencyType
    await AdminCompetencies.deleteCompetencyType(testType.id);
    const checkType = await prisma.competencyType.findUnique({ where: { id: testType.id } });
    assert.equal(checkType, null);

    // I. Verify that Category description is set to null
    const checkCatAfterTypeDelete = await prisma.competencyCategory.findUnique({
      where: { id: testCategory.id }
    });
    assert.equal(checkCatAfterTypeDelete.description, null);

    // Clean up the second competency
    await AdminCompetencies.deleteCompetency(newCompetency.id);
  });

  await t.test('6. Delete Group, Category, and Competency', async () => {
    // Delete competency
    await AdminCompetencies.deleteCompetency(testCompetency.id);
    const checkComp = await prisma.competency.findUnique({ where: { id: testCompetency.id } });
    assert.equal(checkComp, null);

    // Legacy codes and levels should be deleted via cascade
    const checkCodes = await prisma.competencyLegacyCode.findMany({ where: { competencyId: testCompetency.id } });
    assert.equal(checkCodes.length, 0);

    // Delete category
    await AdminCompetencies.deleteCompetencyCategory(testCategory.id);
    const checkCat = await prisma.competencyCategory.findUnique({ where: { id: testCategory.id } });
    assert.equal(checkCat, null);

    // Delete group
    await AdminCompetencies.deleteCompetencyGroup(testGroup.id);
    const checkGrp = await prisma.competencyGroup.findUnique({ where: { id: testGroup.id } });
    assert.equal(checkGrp, null);
  });

  // Final cleanup just in case
  await cleanup();
});
