const { z } = require('zod');

/**
 * Auth Module Validation Schemas
 * 
 * These schemas define validation rules for authentication operations.
 * All schemas use Zod for declarative, type-safe validation.
 */

/**
 * Register Schema
 * Validates user registration data
 */
const registerSchema = z.object({
    email: z.preprocess(
        (val) => typeof val === 'string' ? val.trim() : val,
        z.string({
            required_error: 'Email is required',
            invalid_type_error: 'Email must be a string'
        })
            .min(1, 'Email must be a non-empty string')
            .max(254, 'Email must be at most 254 characters long') // RFC 5321 limit
            .email('Email must be a valid email address')
    ),
    
    password: z.string({
        required_error: 'Password is required',
        invalid_type_error: 'Password must be a string'
    })
        .min(8, 'Password must be at least 8 characters long')
        .max(15, 'Password must be at most 15 characters long')
        .regex(/[A-Z]/, 'Password must contain at least one capital letter')
        .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one symbol'),
    
    name: z.preprocess(
        (val) => typeof val === 'string' ? val.trim() : val,
        z.string({
            required_error: 'Name is required',
            invalid_type_error: 'Name must be a string'
        })
            .min(1, 'Name must be a non-empty string')
            .max(200, 'Name must be at most 200 characters long')
    )
});

/**
 * Login Schema
 * Validates user login credentials
 * Note: Uses generic error message for security (doesn't reveal which field is invalid)
 */
const loginSchema = z.object({
    email: z.string()
        .trim()
        .min(1, 'Invalid credentials')
        .max(254, 'Invalid credentials'), // RFC 5321 limit
    
    password: z.string()
        .min(1, 'Invalid credentials')
        .max(1000, 'Invalid credentials') // Reasonable limit to prevent DoS
});

/**
 * Token Schema
 * Validates JWT token string
 */
const tokenSchema = z.string()
    .trim()
    .min(1, 'Token must be a non-empty string');

/**
 * Helper function to parse and validate data with custom error handling
 * Converts Zod errors to simple Error objects for consistency
 */
const parseWithErrorHandling = (schema, data) => {
    try {
        // Ensure data is an object (handle undefined/null)
        const dataToValidate = data || {};
        return schema.parse(dataToValidate);
    } catch (error) {
        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
            // Try to get errors from issues array (Zod v3+) or errors array (older versions)
            const errors = error.issues || error.errors || [];
            
            if (errors.length > 0) {
                const firstError = errors[0];
                let errorMessage = firstError.message || String(firstError);
                const fieldName = firstError.path && firstError.path.length > 0 
                    ? firstError.path[0] 
                    : '';
                
                // Convert "received undefined" or "expected string, received undefined" to "is required"
                if (errorMessage.toLowerCase().includes('received undefined') || 
                    errorMessage.toLowerCase().includes('required') ||
                    (errorMessage.toLowerCase().includes('expected string') && errorMessage.toLowerCase().includes('received undefined'))) {
                    // Capitalize first letter of field name
                    const capitalizedField = fieldName ? 
                        fieldName.charAt(0).toUpperCase() + fieldName.slice(1) 
                        : 'Field';
                    errorMessage = `${capitalizedField} is required`;
                } else if (fieldName && !errorMessage.toLowerCase().includes(fieldName.toLowerCase())) {
                    // If error message doesn't include field name, prepend it for context
                    // But only if it's a generic error
                    if (errorMessage.toLowerCase().includes('invalid input') || 
                        errorMessage.toLowerCase().includes('expected')) {
                        const capitalizedField = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
                        errorMessage = `${capitalizedField}: ${errorMessage}`;
                    }
                }
                
                throw new Error(errorMessage);
            }
            
            // Fallback: use error message directly
            throw new Error(error.message || 'Validation failed');
        }
        
        // Handle TypeError (happens when Zod tries to access properties on undefined)
        if (error instanceof TypeError && error.message.includes('cannot read properties')) {
            // Try safeParse to get proper Zod error
            const result = schema.safeParse(data || {});
            if (!result.success) {
                const errors = result.error.issues || result.error.errors || [];
                if (errors.length > 0) {
                    const firstError = errors[0];
                    let errorMessage = firstError.message || String(firstError);
                    
                    if (errorMessage.includes('received undefined') || errorMessage.includes('Required')) {
                        const fieldName = firstError.path && firstError.path.length > 0 
                            ? firstError.path[0] 
                            : 'Field';
                        const capitalizedField = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
                        errorMessage = `${capitalizedField} is required`;
                    }
                    
                    throw new Error(errorMessage);
                }
            }
        }
        
        throw error;
    }
};

module.exports = {
    registerSchema,
    loginSchema,
    tokenSchema,
    parseWithErrorHandling,
};

