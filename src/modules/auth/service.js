const model = require('./model');
const utils = require('./utils');
const { z } = require('zod');
const { registerSchema, loginSchema, tokenSchema, parseWithErrorHandling } = require('./validations');
const tokenBlacklist = require('./tokenBlacklist');

const register = async (data) => {
    // Ensure data is an object and has all required fields (even if undefined)
    const dataToValidate = {
        email: data?.email,
        password: data?.password,
        name: data?.name,
    };
    
    // Validate input using Zod schema (email is already trimmed by schema)
    const validated = parseWithErrorHandling(registerSchema, dataToValidate);
    
    // Check if user already exists (using validated email - already trimmed)
    // Always perform password hash operation to normalize timing (prevent enumeration)
    const existingUser = await model.findUserByEmail(validated.email);
    
    // Hash password regardless of user existence (timing attack prevention)
    const passwordHash = await utils.hashPassword(validated.password);
    
    // If user exists, throw generic error to prevent email enumeration
    if (existingUser) {
        // Use generic error message to prevent email enumeration
        throw new Error('Registration failed');
    }

    // Create user
    const user = await model.createUser({
        email: validated.email, // Already trimmed by schema
        passwordHash,
        name: validated.name, // Already trimmed by schema
    });

    // Generate token
    const token = utils.generateToken({
        userId: user.id,
        email: user.email,
    });

    return {
        user,
        token,
    };
};

const login = async (data) => {
    // Ensure data is an object and has all required fields (even if undefined)
    const dataToValidate = {
        email: data?.email,
        password: data?.password,
    };
    
    // Validate input using Zod schema
    let validated;
    try {
        validated = loginSchema.parse(dataToValidate);
    } catch (error) {
        throw new Error('Invalid credentials');
    }

    // Find user with password hash
    const user = await model.findUserByEmailWithPassword(validated.email);
    
    // Always perform password comparison to prevent timing attacks
    // Use a dummy hash if user doesn't exist to normalize timing
    const dummyHash = '$2b$10$dummyhashfordummycomparisontimingattackprevention';
    const hashToCompare = user ? user.password : dummyHash;
    
    // Compare password (always executed, even if user doesn't exist)
    const isPasswordValid = await utils.comparePassword(validated.password, hashToCompare);
    
    // Check both user existence and password validity
    if (!user || !isPasswordValid) {
        throw new Error('Invalid credentials');
    }

    // Generate token
    const token = utils.generateToken({
        userId: user.id,
        email: user.email,
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return {
        user: userWithoutPassword,
        token,
    };
};

const getCurrentUser = async (token) => {
    // Validate token using Zod schema (tokenSchema is a string schema)
    let validatedToken;
    try {
        validatedToken = tokenSchema.parse(token);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errors = error.issues || error.errors || [];
            if (errors.length > 0) {
                const firstError = errors[0];
                let errorMessage = firstError.message || String(firstError);
                
                // Ensure error message includes "token" for test compatibility
                if (!errorMessage.toLowerCase().includes('token')) {
                    if (errorMessage.toLowerCase().includes('received undefined') || 
                        errorMessage.toLowerCase().includes('required') ||
                        errorMessage.toLowerCase().includes('expected string')) {
                        errorMessage = 'Token is required';
                    } else {
                        errorMessage = `Token: ${errorMessage}`;
                    }
                }
                throw new Error(errorMessage);
            }
        }
        throw error;
    }

    // Verify token first
    const decoded = utils.verifyToken(validatedToken);
    if (!decoded) {
        throw new Error('Invalid or expired token');
    }

    // Check if token is blacklisted (after verification to ensure token is valid)
    if (tokenBlacklist.isBlacklisted(validatedToken)) {
        throw new Error('Invalid or expired token');
    }

    // Extract userId from token
    if (!decoded.userId) {
        throw new Error('Invalid token: missing userId');
    }

    // Find user by ID
    const user = await model.findUserById(decoded.userId);
    if (!user) {
        throw new Error('User not found');
    }

    return user;
};

const logout = async (token) => {
    // Validate token using Zod schema
    let validatedToken;
    try {
        validatedToken = tokenSchema.parse(token);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errors = error.issues || error.errors || [];
            if (errors.length > 0) {
                const firstError = errors[0];
                let errorMessage = firstError.message || String(firstError);
                
                // Ensure error message includes "token" for consistency
                if (!errorMessage.toLowerCase().includes('token')) {
                    if (errorMessage.toLowerCase().includes('received undefined') || 
                        errorMessage.toLowerCase().includes('required') ||
                        errorMessage.toLowerCase().includes('expected string')) {
                        errorMessage = 'Token is required';
                    } else {
                        errorMessage = `Token: ${errorMessage}`;
                    }
                }
                throw new Error(errorMessage);
            }
        }
        throw error;
    }

    // Verify token
    const decoded = utils.verifyToken(validatedToken);
    if (!decoded) {
        throw new Error('Invalid or expired token');
    }

    // Extract userId from token (validate token structure)
    if (!decoded.userId) {
        throw new Error('Invalid token: missing userId');
    }

    // Calculate token expiration time
    // JWT exp is in seconds, convert to seconds remaining
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = decoded.exp ? Math.max(0, decoded.exp - now) : 3600; // Default 1 hour if no exp

    // Add token to blacklist
    tokenBlacklist.addToBlacklist(validatedToken, expiresIn);

    return { message: 'Logout successful' };
};

module.exports = {
    register,
    login,
    getCurrentUser,
    logout,
};

