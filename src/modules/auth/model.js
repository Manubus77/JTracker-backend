const prisma = require('../../utils/prisma');

const createUser = async ({ email, passwordHash, name }) => {
    const user = await prisma.user.create({
        data: {
            email: email,
            password: passwordHash, 
            name: name,
        },
        select: {
            id: true, 
            email: true,
            name: true,
            createdAt: true,
            updatedAt: true,
        }
    });
    return user;
};

const findUserByEmail = async (email) => {
    const user = await prisma.user.findUnique({
        where: {
            email: email,
        },
        select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            updatedAt: true,
        }
    });
    return user;
};

const findUserById = async (id) => {
    const user = await prisma.user.findUnique({
        where: {
            id: id,
        },
        select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            updatedAt: true,
        }
    });
    return user;
};

// Internal use only: Find user by email including password hash (for authentication)
const findUserByEmailWithPassword = async (email) => {
    const user = await prisma.user.findUnique({
        where: {
            email: email,
        },
        select: {
            id: true,
            email: true,
            name: true,
            password: true,
            createdAt: true,
            updatedAt: true,
        }
    });
    return user;
};

// Refresh Tokens
const createRefreshToken = async ({ tokenHash, userId, expiresAt }) => {
    return prisma.refreshToken.create({
        data: {
            tokenHash,
            userId,
            expiresAt,
        },
    });
};

const findRefreshToken = async (tokenHash) => {
    return prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: true },
    });
};

const revokeRefreshToken = async (tokenHash, replacedBy = null) => {
    return prisma.refreshToken.update({
        where: { tokenHash },
        data: {
            revoked: true,
            replacedBy,
        },
    });
};

const cleanupExpiredRefreshTokens = async () => {
    await prisma.refreshToken.deleteMany({
        where: {
            OR: [
                { expiresAt: { lt: new Date() } },
                { revoked: true },
            ],
        },
    });
};

const revokeAllRefreshTokensForUser = async (userId) => {
    await prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true },
    });
};

module.exports = {
    createUser,
    findUserByEmail,
    findUserById,
    findUserByEmailWithPassword,
    createRefreshToken,
    findRefreshToken,
    revokeRefreshToken,
    revokeAllRefreshTokensForUser,
    cleanupExpiredRefreshTokens,
};