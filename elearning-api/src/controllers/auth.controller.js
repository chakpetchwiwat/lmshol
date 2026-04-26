const AuthService = require('../services/auth.service');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const { recordLoginFailure, resetLoginFailures } = require('../middleware/loginProtection');
const { logSecurityEvent } = require('../utils/securityEvents');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ErrorResponse('Email and password are required', 400);
  }

  let result;
  try {
    result = await AuthService.login(email, password);
    logSecurityEvent('auth.login.success', req, { email, userId: result.user.id });
  } catch (error) {
    if (error.statusCode === 401) {
      logSecurityEvent('auth.login.failure', req, { email, reason: 'Invalid credentials' });
      recordLoginFailure(req, email);
    }

    throw error;
  }

  resetLoginFailures(req, email);
  res.json({ success: true, data: result });
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await AuthService.getCurrentUser(req.user.userId);
  if (!user) {
    throw new ErrorResponse('User not found', 404);
  }
  res.json({ success: true, data: user });
});

module.exports = {
  login,
  getCurrentUser
};
