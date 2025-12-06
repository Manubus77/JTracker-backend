const model = require('./model');
const {
    createApplicationSchema,
    updateApplicationSchema,
    listApplicationsSchema,
    idSchema,
    parseWithErrorHandling,
} = require('./validations');

const buildOrderBy = (sortBy, sortOrder) => {
    if (sortBy === 'status') {
        return [
            { status: sortOrder },
            { appliedAt: 'desc' }, // tie-breaker for consistent ordering
        ];
    }

    // Default: date (appliedAt)
    return [
        { appliedAt: sortOrder },
        { id: 'desc' },
    ];
};

const createApplication = async (userId, payload) => {
    if (!userId) throw new Error('User context is required');
    const validated = parseWithErrorHandling(createApplicationSchema, payload || {});

    const application = await model.createApplication({
        ...validated,
        status: validated.status || 'APPLIED',
        userId,
    });

    return application;
};

const listApplications = async (userId, query) => {
    if (!userId) throw new Error('User context is required');
    const filters = parseWithErrorHandling(listApplicationsSchema, query || {});

    const orderBy = buildOrderBy(filters.sortBy, filters.sortOrder);
    const skip = (filters.page - 1) * filters.pageSize;
    const take = filters.pageSize;

    const items = await model.listApplications({
        userId,
        status: filters.status,
        orderBy,
        skip,
        take,
    });
    const total = await model.countApplications({
        userId,
        status: filters.status,
    });
    const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

    return {
        items,
        page: filters.page,
        pageSize: filters.pageSize,
        total,
        totalPages,
    };
};

const updateApplication = async (userId, id, payload) => {
    if (!userId) throw new Error('User context is required');

    const applicationId = parseWithErrorHandling(idSchema, id);
    const validated = parseWithErrorHandling(updateApplicationSchema, payload || {});

    const existing = await model.findApplicationByIdForUser(applicationId, userId);
    if (!existing) {
        const error = new Error('Application not found');
        error.status = 404;
        throw error;
    }

    // URL is immutable by contract (not part of validated data)
    const updated = await model.updateApplication(applicationId, validated);
    return updated;
};

const deleteApplication = async (userId, id) => {
    if (!userId) throw new Error('User context is required');

    const applicationId = parseWithErrorHandling(idSchema, id);
    const existing = await model.findApplicationByIdForUser(applicationId, userId);
    if (!existing) {
        const error = new Error('Application not found');
        error.status = 404;
        throw error;
    }

    await model.deleteApplication(applicationId);
    return { message: 'Application deleted' };
};

module.exports = {
    createApplication,
    listApplications,
    updateApplication,
    deleteApplication,
};

