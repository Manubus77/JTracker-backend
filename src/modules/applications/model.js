const prisma = require('../../utils/prisma');

const baseSelect = {
    id: true,
    position: true,
    company: true,
    url: true,
    status: true,
    appliedAt: true,
};

const createApplication = async ({ position, company, url, status, userId }) => {
    return prisma.jobApplication.create({
        data: {
            position,
            company,
            url,
            status,
            userId,
        },
        select: baseSelect,
    });
};

const listApplications = async ({ userId, status, orderBy, skip, take }) => {
    return prisma.jobApplication.findMany({
        where: {
            userId,
            ...(status ? { status } : {}),
        },
        orderBy,
        skip,
        take,
        select: baseSelect,
    });
};

const countApplications = async ({ userId, status }) => {
    return prisma.jobApplication.count({
        where: {
            userId,
            ...(status ? { status } : {}),
        },
    });
};

const findApplicationByIdForUser = async (id, userId) => {
    return prisma.jobApplication.findFirst({
        where: {
            id,
            userId,
        },
        select: baseSelect,
    });
};

const updateApplication = async (id, data) => {
    return prisma.jobApplication.update({
        where: { id },
        data,
        select: baseSelect,
    });
};

const deleteApplication = async (id) => {
    return prisma.jobApplication.delete({
        where: { id },
        select: { id: true },
    });
};

module.exports = {
    createApplication,
    listApplications,
    countApplications,
    findApplicationByIdForUser,
    updateApplication,
    deleteApplication,
};

