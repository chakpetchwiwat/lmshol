const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');
const { enforceLoginLockout } = require('../middleware/loginProtection');
const { authLoginRateLimiter } = require('../middleware/rateLimiters');

router.post('/login', authLoginRateLimiter, enforceLoginLockout, authController.login);
router.get('/me', verifyToken, authController.getCurrentUser);

module.exports = router;
