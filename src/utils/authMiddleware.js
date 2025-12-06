const { verifyToken } = require('../modules/auth/utils');
const tokenBlacklist = require('../modules/auth/tokenBlacklist');
const prisma = require('./prisma');

/**
 * Authentication middleware
 * - Validates Bearer token
 * - Checks blacklist
 * - Loads user and attaches to req.user
 */
const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Token is required' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        return res.status(401).json({ error: 'Token is required' });
    }

    const token = parts[1];
    if (!token || token.trim() === '') {
        return res.status(401).json({ error: 'Token is required' });
    }

    try {
        if (tokenBlacklist.isBlacklisted(token)) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        const decoded = verifyToken(token);
        if (!decoded || !decoded.userId) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        req.user = user;
        req.token = token;
        return next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

module.exports = authMiddleware;

