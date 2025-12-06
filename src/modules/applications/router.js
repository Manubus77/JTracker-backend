const express = require('express');
const rateLimit = require('express-rate-limit');
const config = require('../../config');
const authMiddleware = require('../../utils/authMiddleware');
const {
    createApplication,
    listApplications,
    updateApplication,
    deleteApplication,
} = require('./controller');

const router = express.Router();

const createLimiter = (options) => {
    if (config.isTest) {
        return (req, res, next) => next();
    }
    return rateLimit(options);
};

const writeLimiter = createLimiter({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMaxApplicationsWrite,
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const readLimiter = createLimiter({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMaxApplicationsRead,
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// All routes require authentication
router.use(authMiddleware);

router.post('/', writeLimiter, createApplication);
router.get('/', readLimiter, listApplications);
router.patch('/:id', writeLimiter, updateApplication);
router.delete('/:id', writeLimiter, deleteApplication);

module.exports = router;

