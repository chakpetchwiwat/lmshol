const express = require('express');
const router = express.Router();
const goalController = require('../controllers/goal.controller');
const { verifyToken, verifyAdminPanelAccess } = require('../middleware/auth');
const { goalReportRateLimiter } = require('../middleware/rateLimiters');

// All goal routes require admin or manager access
router.use(verifyToken);

router.get('/', goalController.getGoals);
router.get('/:id', goalController.getGoalDetails);

// Routes below require Admin/Manager access
router.use(verifyAdminPanelAccess);
router.post('/', goalController.createGoal);
router.put('/:id', goalController.updateGoal);
router.get('/:id/report', goalReportRateLimiter, goalController.getGoalReport);
router.put('/:id/archive', goalController.archiveGoal);
router.put('/:id/republish', goalController.republishGoal);
router.delete('/:id', goalController.deleteGoal);


module.exports = router;
