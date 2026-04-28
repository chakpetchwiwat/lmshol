const { checkSystemHealth } = require('../services/system/system.health');
const { resetRateLimit } = require('../services/system/system.security');
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

// @desc    Reset rate limit for a specific identifier
// @route   POST /api/admin/system/security/reset
// @access  SuperAdmin
exports.resetRateLimit = asyncHandler(async (req, res, next) => {
    const { identifier } = req.body;
    
    if (!identifier) {
        return res.status(400).json({
            success: false,
            message: 'Identifier (IP or User ID) is required'
        });
    }

    const result = await resetRateLimit(identifier);
    
    res.status(200).json(result);
});
