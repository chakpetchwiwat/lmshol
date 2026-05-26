const authHelpers = require('../../utils/auth.helpers');

const mapUserRecord = authHelpers.mapUserRecord;

const mapCourseRecord = (course) => {
    const { departmentAccess, tierAccess, cohortRoleAccess, instructorPreset, ...rest } = course;
    const visibleDepartments = departmentAccess?.map((item) => item.department) || [];
    const visibleTiers = tierAccess?.map((item) => item.tier) || [];
    const visibleCohortRoles = cohortRoleAccess?.map((item) => item.cohortRole) || [];
    const isArchived = authHelpers.isTimedEntityExpired(rest);

    return {
        ...rest,
        isArchived,
        instructorPreset,
        visibleDepartments,
        visibleDepartmentIds: visibleDepartments.map((d) => d.id),
        visibleTiers,
        visibleTierIds: visibleTiers.map((t) => t.id),
        visibleCohortRoles,
        visibleCohortRoleIds: visibleCohortRoles.map((cr) => cr.id),
        certificateEnabled: rest.certificateSetting?.enabled || false,
        certificatePassingScore: rest.certificateSetting?.passingScore || 80,
        certificateTemplateId: rest.certificateSetting?.templateId || '',
        certificateSignatureSlots: rest.certificateSetting?.signatureSlots || null
    };
};

const mapCategoryRecord = (category) => {
    const { departmentAccess, tierAccess, ...rest } = category;
    const visibleDepartments = departmentAccess?.map((item) => item.department) || [];
    const visibleTiers = tierAccess?.map((item) => item.tier) || [];
    const isArchived = authHelpers.isTimedEntityExpired(rest);

    return {
        ...rest,
        isArchived,
        visibleDepartments,
        visibleDepartmentIds: visibleDepartments.map((department) => department.id),
        visibleTiers,
        visibleTierIds: visibleTiers.map((tier) => tier.id),
        type: rest.type || 'KM_COURSE'
    };
};

const mapAnnouncementRecord = (announcement) => {
    const { creator, questions, ...rest } = announcement;
    const isArchived = authHelpers.isExpiredAt(rest.expiredAt);

    return {
        ...rest,
        creator,
        questions: questions || [],
        questionCount: Array.isArray(questions) ? questions.length : 0,
        isArchived
    };
};

const getDashboardUserSummary = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    department: user.departmentRef?.name || user.department || null,
    tier: user.tier?.name || null
});

module.exports = {
    mapUserRecord,
    mapCourseRecord,
    mapCategoryRecord,
    mapAnnouncementRecord,
    getDashboardUserSummary
};
