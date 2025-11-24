const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../../config');

//Hash a password with bcrypt
const hashPassword = async (password) => {
    if(!password) throw new Error('Password is required');
    if(typeof password !== 'string') throw new Error('Password must be a string');
    if(password.length < 8) throw new Error('Password must be at least 8 characters long');
    return await bcrypt.hash(password, 10);
};

//Compare a password with a hash
const comparePassword = async (password, hash) => {
    if(typeof password !== 'string' || password.trim().length === 0) return false;
    return await bcrypt.compare(password, hash);
};

//Generate JWT
const maxAge = 1 * 60 * 60; // 1 hour in seconds
const generateToken = (payload) => {
    if (!config.jwtSecret) {
        throw new Error('JWT_SECRET is not configured');
    }
    return jwt.sign(payload, config.jwtSecret, {
        expiresIn: maxAge,
    });
};

module.exports = {
    hashPassword,
    comparePassword,
    generateToken,
};
