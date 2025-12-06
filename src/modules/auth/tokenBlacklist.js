// Manages blacklisted JWT tokens (persistent via Prisma)
const prisma = require('../../utils/prisma');

/**
 * Add a token to the blacklist with expiration
 * @param {string} token - JWT token to blacklist
 * @param {number} expiresIn - Token expiration time in seconds (from JWT)
 */
const addToBlacklist = async (token, expiresIn) => {
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    await prisma.revokedToken.create({
        data: {
            token,
            expiresAt,
        },
    });

    // Clean up expired tokens opportunistically
    await cleanupExpiredTokens();
};

/**
 * Check if a token is blacklisted
 * @param {string} token - JWT token to check
 * @returns {Promise<boolean>}
 */
const isBlacklisted = async (token) => {
    const entry = await prisma.revokedToken.findUnique({
        where: { token },
    });
    if (!entry) return false;

    if (entry.expiresAt < new Date()) {
        // expire eagerly
        await prisma.revokedToken.delete({ where: { token } });
        return false;
    }
    return true;
};

// Remove expired tokens from blacklist
const cleanupExpiredTokens = async () => {
    const now = new Date();
    await prisma.revokedToken.deleteMany({
        where: {
            expiresAt: { lt: now },
        },
    });
};

// Clear all tokens from blacklist (useful for testing)
const clearBlacklist = async () => {
    await prisma.revokedToken.deleteMany();
};

// Get blacklist size (for monitoring)
const getBlacklistSize = async () => {
    await cleanupExpiredTokens();
    const count = await prisma.revokedToken.count();
    return count;
};

module.exports = {
    addToBlacklist,
    isBlacklisted,
    cleanupExpiredTokens,
    clearBlacklist,
    getBlacklistSize,
};

