const model = require('./model');
const utils = require('./utils');
const { registerSchema, parseWithErrorHandling } = require('./validations');

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
    const existingUser = await model.findUserByEmail(validated.email);
    if (existingUser) {
        throw new Error('Email already exists');
    }

    // Hash password (this will also validate password length)
    const passwordHash = await utils.hashPassword(validated.password);

    // Create user
    const user = await model.createUser({
        email: validated.email, // Already trimmed by schema
        passwordHash,
        name: validated.name ? validated.name.trim() : null,
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

const login = async ({ email, password }) => {
    // Input validation: Email
    if (!email || email === null || email === undefined) {
        throw new Error('Invalid credentials');
    }
    if (typeof email !== 'string' || email.trim() === '') {
        throw new Error('Invalid credentials');
    }

    // Input validation: Password
    if (!password || password === null || password === undefined) {
        throw new Error('Invalid credentials');
    }
    if (typeof password !== 'string' || password.trim() === '') {
        throw new Error('Invalid credentials');
    }

    // Find user with password hash (for authentication)
    const user = await model.findUserByEmailWithPassword(email.trim());
    if (!user) {
        throw new Error('Invalid credentials');
    }

    // Compare password
    const isPasswordValid = await utils.comparePassword(password, user.password);
    if (!isPasswordValid) {
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
    // Input validation: Token
    if (!token || token === null || token === undefined) {
        throw new Error('Token is required');
    }
    if (typeof token !== 'string' || token.trim() === '') {
        throw new Error('Token must be a non-empty string');
    }

    // Verify token
    const decoded = utils.verifyToken(token.trim());
    if (!decoded) {
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

module.exports = {
    register,
    login,
    getCurrentUser,
};

