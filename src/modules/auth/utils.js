const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../../config');

//Hash a password with bcrypt
const hashPassword = async (password) => {
    if(!password) throw new Error('Password is required');
    if(typeof password !== 'string') throw new Error('Password must be a string');
    if(password.length < 8) throw new Error('Password must be at least 8 characters long');
    if(password.length > 15) throw new Error('Password must be at most 15 characters long');
    if(!/[A-Z]/.test(password)) throw new Error('Password must contain at least one capital letter');
    if(!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) throw new Error('Password must contain at least one symbol');
    // Use salt rounds from config (validated on startup)
    return await bcrypt.hash(password, config.bcryptSaltRounds);
};

//Compare a password with a hash
const comparePassword = async (password, hash) => {
    if(typeof password !== 'string' || password.trim().length === 0) return false;
    return await bcrypt.compare(password, hash);
};

//Generate JWT
const maxAge = parseInt(process.env.JWT_EXPIRES_IN, 10) || 3600; //1hour
const generateToken = (payload, options = {}) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured');
    }
    if(!payload || Object.keys(payload).length === 0) {
        throw new Error('Payload cannot be empty, null or undefined');
    }
    if (typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error('Payload must be a non-array object');
    }
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: options.expiresIn || maxAge,
    });
};

//Verify generated Token
const verifyToken = (token) => {
    if (!token || typeof token !== 'string') {
        throw new Error('Token must be a non-empty string');
    }
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return null; // token expired
        }
        if (err.name === 'JsonWebTokenError') {
            return null; // invalid/malformed token
        }
        throw err; // unexpected errors are re-thrown
    }
};

module.exports = {
    hashPassword,
    comparePassword,
    generateToken,
    verifyToken
};
