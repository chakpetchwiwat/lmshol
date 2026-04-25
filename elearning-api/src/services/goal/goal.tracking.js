const authHelpers = require('../../utils/auth.helpers');
const { getGoals } = require('./goal.crud');
const { getGoalReport } = require('./goal.reports');

const getGoalTrackingSummary = async (authUser, queryParams = {}) => {
    // 1. Get all goals for the user, but we don't need expired ones for the summary
    const allGoals = await getGoals(authUser, { includeExpired: false });

    const filterDepartment = queryParams.department || null;

    // 2. Filter strictly active goals (should already be done by includeExpired: false, but just in case)
    const activeGoals = allGoals.filter(goal => {
        if (goal.status !== 'ACTIVE') return false;
        if (!goal.expiryDate) return true;
        return new Date(goal.expiryDate).getTime() >= Date.now();
    });

    // 3. Get reports in parallel, mapping to just the summary counts
    const summaryResults = await Promise.allSettled(
        activeGoals.map(async (goal) => {
            const reportData = await getGoalReport(goal.id, authUser);
            
            // Filter rows based on department query param if provided
            let visibleRows = reportData.report || [];
            if (filterDepartment) {
                visibleRows = visibleRows.filter(row => row.department === filterDepartment);
            }

            const counts = { ALL: 0, COMPLETED: 0, IN_PROGRESS: 0, NOT_STARTED: 0 };
            
            for (const row of visibleRows) {
                counts.ALL++;
                const status = row.userStatus || 'NOT_STARTED';
                counts[status] = (counts[status] || 0) + 1;
            }

            return {
                id: goal.id,
                title: goal.title,
                type: goal.type,
                scope: goal.scope,
                departmentId: goal.departmentId,
                targetCount: goal.targetCount,
                targetCountLabel: goal.type === 'ANY' 
                    ? `${goal.targetCount || 0} คอร์ส` 
                    : `${goal.courses?.length || goal.targetCount || 0} คอร์สที่กำหนด`,
                departmentName: goal.department?.name || null,
                expiryDate: goal.expiryDate,
                counts
            };
        })
    );

    // 4. Return successful summaries
    const summaries = summaryResults
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);

    // Sort by expiry date, ascending
    summaries.sort((left, right) => {
        const leftDate = new Date(left.expiryDate || '9999-12-31').getTime();
        const rightDate = new Date(right.expiryDate || '9999-12-31').getTime();
        return leftDate - rightDate;
    });

    return summaries;
};

module.exports = {
    getGoalTrackingSummary
};
