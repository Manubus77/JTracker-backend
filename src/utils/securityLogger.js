//Logs security-related events for monitoring and audit purposes.

const config = require('../config');

/**
 * Log security event
 * @param {string} event - Event type (e.g., 'failed_login', 'registration_attempt')
 * @param {object} details - Event details
 * @param {string} ip - Client IP address
 */
const logSecurityEvent = (event, details = {}, ip = null) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        event,
        ip: ip || 'unknown',
        environment: config.env,
        ...details,
    };

    // In production, this should be sent to a proper logging service
    if (config.isProduction) {
        // In production, use structured logging (JSON format)
        console.log(JSON.stringify(logEntry));
    } else {
        // In development, use readable format
        console.warn(`[SECURITY] ${event}`, logEntry);
    }

    // TODO: Integrate with logging service (e.g., Winston, Pino, CloudWatch, etc.)
    // TODO: Send critical events to alerting system
};

//Log failed login attempt
const logFailedLogin = (email, ip, reason = 'invalid_credentials') => {
    logSecurityEvent('failed_login', {
        email: email ? email.substring(0, 3) + '***' : 'unknown', // Partial email for privacy
        reason,
    }, ip);
};

//Log successful login
const logSuccessfulLogin = (userId, email, ip) => {
    logSecurityEvent('successful_login', {
        userId,
        email: email ? email.substring(0, 3) + '***' : 'unknown',
    }, ip);
};

//Log registration attempt
const logRegistrationAttempt = (email, ip, success = false, reason = null) => {
    logSecurityEvent('registration_attempt', {
        email: email ? email.substring(0, 3) + '***' : 'unknown',
        success,
        reason,
    }, ip);
};

//Log token validation failure
const logTokenValidationFailure = (ip, reason = 'invalid_token') => {
    logSecurityEvent('token_validation_failure', {
        reason,
    }, ip);
};

//Log rate limit exceeded
const logRateLimitExceeded = (endpoint, ip) => {
    logSecurityEvent('rate_limit_exceeded', {
        endpoint,
    }, ip);
};

//Get client IP from request
const getClientIp = (req) => {
    return req.ip || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
           'unknown';
};

module.exports = {
    logSecurityEvent,
    logFailedLogin,
    logSuccessfulLogin,
    logRegistrationAttempt,
    logTokenValidationFailure,
    logRateLimitExceeded,
    getClientIp,
};

