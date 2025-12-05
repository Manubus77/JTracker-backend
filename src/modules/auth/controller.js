const service = require('./service');
const config = require('../../config');
const { logRegistrationAttempt, logRateLimitExceeded, getClientIp } = require('../../utils/securityLogger');

const register = async (req, res, next) => {
    const ip = getClientIp(req);
    try {
        // Extract request body (Zod validation handles normalization)
        const { email, password, name } = req.body;
        
        // Note: Email and name normalization is handled by Zod schemas (trim)
        // We only sanitize for XSS prevention if needed, but Zod already trims
        // Password is not sanitized (would break hashing), validated by Zod
        
        // Call service layer (Zod will normalize/trim email and name)
        const result = await service.register({ 
            email, 
            password,
            name 
        });
        
        // Log successful registration
        logRegistrationAttempt(result.user.email, ip, true);
        
        // Success response
        return res.status(201).json({
            user: result.user,
            token: result.token,
        });
    } catch (error) {
        // Log failed registration attempt
        const email = req.body?.email;
        logRegistrationAttempt(email, ip, false, error.message);
        
        // Map service errors to HTTP status codes
        const message = error.message || 'Internal server error';
        
        // Genericize error messages in production only
        let errorMessage = message;
        let statusCode = 500;
        
        // Determine status code based on error message
        if (message.includes('required') || 
            message.includes('must be') || 
            message.includes('must contain') ||
            message.includes('valid') ||
            message.includes('Email must be') ||
            message.includes('password') ||
            message.includes('email') ||
            message.includes('name')) {
            statusCode = 400;
        } else if (message.includes('Registration failed')) {
            // In dev/test, we know this means duplicate email (409)
            // In production, genericize to 400
            statusCode = config.isProduction ? 400 : 409;
        } else {
            statusCode = 500;
        }
        
        // Genericize error messages only in production
        if (config.isProduction) {
            if (statusCode === 400 && (message.includes('required') || 
                message.includes('must be') || 
                message.includes('must contain') ||
                message.includes('valid') ||
                message.includes('Email must be'))) {
                errorMessage = 'Invalid input provided';
            } else if (message.includes('Registration failed')) {
                errorMessage = 'Registration failed';
            } else {
                errorMessage = 'Registration failed';
            }
        }
        // In test/dev mode, keep original error message for debugging
        
        return res.status(statusCode).json({ error: errorMessage });
    }
};

const login = async (req, res, next) => {
    const ip = getClientIp(req);
    try {
        // Extract request body (Zod validation handles normalization)
        const { email, password } = req.body;
        
        // Note: Email normalization is handled by Zod schema (trim)
        // Password is not sanitized (would break hashing), validated by Zod
        
        // Call service layer (Zod will normalize/trim email)
        const result = await service.login({ email, password });
        
        // Log successful login
        const { logSuccessfulLogin } = require('../../utils/securityLogger');
        logSuccessfulLogin(result.user.id, result.user.email, ip);
        
        // Success response
        return res.status(200).json({
            user: result.user,
            token: result.token,
        });
    } catch (error) {
        // Log failed login attempt
        const { logFailedLogin } = require('../../utils/securityLogger');
        const email = req.body?.email;
        logFailedLogin(email, ip, 'invalid_credentials');
        
        // All login errors return 401 with generic message
        // Service already returns "Invalid credentials" for security
        return res.status(401).json({ 
            error: 'Invalid credentials' // Always generic for security
        });
    }
};

const getCurrentUser = async (req, res, next) => {
    const ip = getClientIp(req);
    try {
        // Extract token from header (validate Bearer format - HTTP concern)
        const authHeader = req.headers.authorization || req.headers.Authorization;
        
        // Check if header exists and has Bearer format
        if (!authHeader) {
            const { logTokenValidationFailure } = require('../../utils/securityLogger');
            logTokenValidationFailure(ip, 'missing_header');
            return res.status(401).json({ error: 'Token is required' });
        }
        
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
            const { logTokenValidationFailure } = require('../../utils/securityLogger');
            logTokenValidationFailure(ip, 'invalid_format');
            return res.status(401).json({ error: 'Token is required' });
        }
        
        const token = parts[1] || null;
        if (!token || token.trim() === '') {
            const { logTokenValidationFailure } = require('../../utils/securityLogger');
            logTokenValidationFailure(ip, 'empty_token');
            return res.status(401).json({ error: 'Token is required' });
        }
        
        // Call service layer (service validates token format, presence, etc.)
        const user = await service.getCurrentUser(token);
        
        // Success response
        return res.status(200).json(user);
    } catch (error) {
        // Log token validation failure
        const { logTokenValidationFailure } = require('../../utils/securityLogger');
        logTokenValidationFailure(ip, 'invalid_token');
        
        // All getCurrentUser errors are authentication errors - return 401
        const message = error.message || 'Internal server error';
        
        // Genericize error messages in production
        let errorMessage = message;
        if (config.isProduction) {
            errorMessage = 'Invalid or expired token';
        } else {
            // In dev/test, provide more specific error for debugging
            if (message.includes('Token') || 
                message.includes('Invalid') || 
                message.includes('expired') ||
                message.includes('User not found')) {
                errorMessage = message;
            } else {
                errorMessage = 'Authentication failed';
            }
        }
        
        return res.status(401).json({ error: errorMessage });
    }
};

const logout = async (req, res, next) => {
    const ip = getClientIp(req);
    try {
        // Extract token from header (validate Bearer format - HTTP concern)
        const authHeader = req.headers.authorization || req.headers.Authorization;
        
        // Check if header exists and has Bearer format
        if (!authHeader) {
            const { logTokenValidationFailure } = require('../../utils/securityLogger');
            logTokenValidationFailure(ip, 'missing_header');
            return res.status(401).json({ error: 'Token is required' });
        }
        
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
            const { logTokenValidationFailure } = require('../../utils/securityLogger');
            logTokenValidationFailure(ip, 'invalid_format');
            return res.status(401).json({ error: 'Token is required' });
        }
        
        const token = parts[1] || null;
        if (!token || token.trim() === '') {
            const { logTokenValidationFailure } = require('../../utils/securityLogger');
            logTokenValidationFailure(ip, 'empty_token');
            return res.status(401).json({ error: 'Token is required' });
        }
        
        // Call service layer (service validates token)
        const result = await service.logout(token);
        
        // Success response
        return res.status(200).json(result);
    } catch (error) {
        // Log token validation failure
        const { logTokenValidationFailure } = require('../../utils/securityLogger');
        logTokenValidationFailure(ip, 'invalid_token');
        
        // Map service errors to HTTP status codes
        const message = error.message || 'Internal server error';
        
        // Genericize error messages in production
        let errorMessage = message;
        if (config.isProduction) {
            if (message.includes('Token') || 
                message.includes('Invalid') || 
                message.includes('expired')) {
                errorMessage = 'Invalid or expired token';
            } else {
                errorMessage = 'Logout failed';
            }
        }
        
        // All authentication errors return 401
        if (message.includes('Token') || 
            message.includes('Invalid') || 
            message.includes('expired')) {
            return res.status(401).json({ error: errorMessage });
        }
        
        // Default to 500
        return res.status(500).json({ error: config.isProduction ? 'Internal server error' : errorMessage });
    }
};

module.exports = {
    register,
    login,
    getCurrentUser,
    logout,
};