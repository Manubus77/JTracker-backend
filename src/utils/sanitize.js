//Sanitizes user inputs to prevent XSS and injection attacks

const validator = require('validator');

/**
 * Sanitize string input
 * Removes HTML tags and escapes special characters
 * @param {string} input - Input string to sanitize
 * @param {object} options - Sanitization options
 * @returns {string} - Sanitized string
 */
const sanitizeString = (input, options = {}) => {
    if (typeof input !== 'string') {
        return input;
    }

    const {
        allowEmpty = false,
        maxLength = null,
        trim = true,
        escape = false, // Don't escape by default (data stored in DB, not displayed)
    } = options;

    let sanitized = input;

    // Trim whitespace
    if (trim) {
        sanitized = sanitized.trim();
    }

    // Check empty
    if (!allowEmpty && sanitized.length === 0) {
        return sanitized;
    }

    // Remove HTML tags and escape special characters (only if explicitly requested)
    if (escape) {
        sanitized = validator.escape(sanitized);
    } else {
        // Remove potential script tags and dangerous patterns
        sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }

    // Apply length limit
    if (maxLength && sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
};

/**
 * Sanitize email
 * Validates and sanitizes email address
 * @param {string} email - Email to sanitize
 * @returns {string} - Sanitized email or original if invalid
 */
const sanitizeEmail = (email) => {
    if (typeof email !== 'string') {
        return email;
    }

    // Trim and normalize email
    const trimmed = email.trim().toLowerCase();
    
    // Validate email format
    if (!validator.isEmail(trimmed)) {
        return email; // Return original if invalid
    }

    return trimmed;
};

/**
 * Sanitize object recursively
 * @param {object} obj - Object to sanitize
 * @param {object} options - Sanitization options per field
 * @returns {object} - Sanitized object
 */
const sanitizeObject = (obj, options = {}) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
        return obj;
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizeString(value, options[key] || {});
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            sanitized[key] = sanitizeObject(value, options[key] || {});
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
};

module.exports = {
    sanitizeString,
    sanitizeEmail,
    sanitizeObject,
};

