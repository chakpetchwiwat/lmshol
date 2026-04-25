const goalService = require('../services/goal.service');
const asyncHandler = require('../middleware/async');

const appendServerTiming = (res, metricName, durationMs) => {
    const metricValue = `${metricName};dur=${durationMs}`;
    const existingHeader = res.getHeader('Server-Timing');

    if (!existingHeader) {
        res.setHeader('Server-Timing', metricValue);
        return;
    }

    res.setHeader('Server-Timing', `${existingHeader}, ${metricValue}`);
};

const logGoalTiming = (event, req, durationMs, extra = {}) => {
    console.info('[goal-timing]', JSON.stringify({
        event,
        durationMs,
        goalId: req.params?.id || null,
        userId: req.user?.userId || null,
        role: req.user?.role || null,
        ...extra
    }));
};

const createGoal = asyncHandler(async (req, res) => {
    const goal = await goalService.createGoal(req.body, req.user);
    res.status(201).json({
        success: true,
        message: 'Goal created successfully',
        data: goal
    });
});

const getGoals = asyncHandler(async (req, res) => {
    const includeExpired = String(req.query.includeExpired).toLowerCase() === 'true';
    const goals = await goalService.getGoals(req.user, { includeExpired });
    res.json({
        success: true,
        data: goals
    });
});

const getGoalDetails = asyncHandler(async (req, res) => {
    const goal = await goalService.getGoalDetails(req.params.id, req.user);
    res.json({
        success: true,
        data: goal
    });
});

const archiveGoal = asyncHandler(async (req, res) => {
    await goalService.archiveGoal(req.params.id, req.user);
    res.json({
        success: true,
        message: 'Goal archived successfully'
    });
});

const republishGoal = asyncHandler(async (req, res) => {
    await goalService.republishGoal(req.params.id, req.user);
    res.json({
        success: true,
        message: 'Goal recovered successfully'
    });
});

const updateGoal = asyncHandler(async (req, res) => {
    const goal = await goalService.updateGoal(req.params.id, req.body, req.user);
    res.json({
        success: true,
        message: 'Goal updated successfully',
        data: goal
    });
});


const deleteGoal = asyncHandler(async (req, res) => {
    await goalService.deleteGoal(req.params.id, req.user);
    res.json({
        success: true,
        message: 'Goal deleted successfully'
    });
});

const getGoalReport = asyncHandler(async (req, res) => {
    const startedAt = Date.now();
    const report = await goalService.getGoalReport(req.params.id, req.user);
    const durationMs = Date.now() - startedAt;
    appendServerTiming(res, 'goal-report', durationMs);
    logGoalTiming('goal.report.completed', req, durationMs, {
        rows: report?.report?.length || 0,
        goalType: report?.goal?.type || null,
        goalScope: report?.goal?.scope || null,
        courseCount: report?.goal?.courses?.length || 0
    });
    res.json({
        success: true,
        data: report
    });
});

const getGoalTrackingSummary = asyncHandler(async (req, res) => {
    const startedAt = Date.now();
    const summary = await goalService.getGoalTrackingSummary(req.user, req.query);
    const durationMs = Date.now() - startedAt;
    appendServerTiming(res, 'goal-summary', durationMs);
    res.json({
        success: true,
        data: summary
    });
});

module.exports = {
    createGoal,
    getGoals,
    getGoalDetails,
    archiveGoal,
    republishGoal,
    updateGoal,
    deleteGoal,
    getGoalReport,
    getGoalTrackingSummary
};
