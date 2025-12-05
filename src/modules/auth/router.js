const express = require('express');
const rateLimit = require('express-rate-limit');
const config = require('../../config');
const { register, login, getCurrentUser, logout } = require('./controller');

const router = express.Router();

// Rate Limiting - Disabled in test environment
const createLimiter = (options) => {
  if (config.isTest) {
    // In test mode, use very high limits to avoid test failures
    // Use a no-op middleware that just calls next()
    return (req, res, next) => next();
  }
  return rateLimit(options);
};

// Rate Limiting - Login endpoint (stricter)
const loginLimiter = createLimiter({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxLogin,
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Rate Limiting - Register endpoint (stricter)
const registerLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: config.rateLimitMaxRegister,
  message: 'Too many registration attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate Limiting - Logout endpoint
const logoutLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: config.rateLimitMaxLogout,
  message: 'Too many logout requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

//HTTP Routes
router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.get('/me', getCurrentUser);
router.post('/logout', logoutLimiter, logout);

module.exports = router;