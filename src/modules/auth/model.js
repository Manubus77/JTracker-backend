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

const findUserByEmail = async () => {
    
};

const findUserById = async () => {
    
};

module.exports = {
    createUser,
    findUserByEmail,
    findUserById,
};