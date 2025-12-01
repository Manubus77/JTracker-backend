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

module.exports = {
    createUser,
    findUserByEmail,
    findUserById,
    findUserByEmailWithPassword,
};