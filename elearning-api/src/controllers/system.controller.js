const { checkSystemHealth } = require('../services/system/system.health');
const asyncHandler = require('../middleware/async');

// @desc    Get system health metrics
// @route   GET /api/admin/system/health
// @access  Admin/Manager
exports.getSystemHealth = asyncHandler(async (req, res, next) => {
    const health = await checkSystemHealth();
    
    res.status(200).json({
        success: true,
        data: health
    });
});
