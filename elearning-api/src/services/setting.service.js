const prisma = require('../utils/prisma');
const authHelpers = require('../utils/auth.helpers');
const { USER_PERMISSIONS, ADMIN_PANEL_PERMISSIONS } = require('../utils/constants/roles');

const getDepartmentWeeklyGoalKey = (departmentId) => `weekly_goal_department_${departmentId}`;

const getSettings = async (authUser) => {
    const settings = await prisma.systemSetting.findMany();
    const settingsMap = {};
    settings.forEach(s => {
        settingsMap[s.key] = s.value;
    });

    let scope = 'global';
    let departmentId = null;

    if (authUser?.userId && authUser.permission !== USER_PERMISSIONS.ADMIN && authUser.permission !== USER_PERMISSIONS.SUPERADMIN) {
        const actor = await authHelpers.getActorContext(prisma, authUser);
        departmentId = actor?.departmentId || null;
        if (departmentId) {
            const departmentGoalKey = getDepartmentWeeklyGoalKey(departmentId);
            if (settingsMap[departmentGoalKey] !== undefined) {
                settingsMap.weekly_goal = settingsMap[departmentGoalKey];
                scope = 'department';
            }
        }
    }
    
    // Default values if not set
    if (!settingsMap['weekly_goal']) settingsMap['weekly_goal'] = '1';

    settingsMap.weekly_goal_scope = scope;
    settingsMap.weekly_goal_departmentId = departmentId;
    
    return settingsMap;
};

const updateSetting = async (key, value, authUser) => {
    const actor = await authHelpers.getActorContext(prisma, authUser);

    if (!actor || !ADMIN_PANEL_PERMISSIONS.includes(actor.permission)) {
        throw new Error('Admin panel access required');
    }

    let targetKey = key;
    let scope = 'global';

    if (actor.permission === USER_PERMISSIONS.MANAGER) {
        if (key !== 'weekly_goal') {
            throw new Error('Manager can only update weekly goal');
        }

        if (!actor.departmentId) {
            throw new Error('Manager account must belong to a department');
        }

        targetKey = getDepartmentWeeklyGoalKey(actor.departmentId);
        scope = 'department';
    }

    const setting = await prisma.systemSetting.upsert({
        where: { key: targetKey },
        update: { value: String(value) },
        create: { key: targetKey, value: String(value) }
    });

    return {
        ...setting,
        key,
        scope,
        departmentId: actor.departmentId || null
    };
};

module.exports = {
    getSettings,
    updateSetting
};
