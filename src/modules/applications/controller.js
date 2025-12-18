const config = require('../../config');
const service = require('./service');

const isValidationError = (message = '') =>
    message.toLowerCase().includes('required') ||
    message.toLowerCase().includes('must be') ||
    message.toLowerCase().includes('invalid') ||
    message.toLowerCase().includes('non-empty') ||
    message.toLowerCase().includes('at least') ||
    message.toLowerCase().includes('url') ||
    message.toLowerCase().includes('page');

const errorResponse = (res, error) => {
    const message = error.message || 'Internal server error';
    let status = error.status || 500;

    if (status !== 404 && isValidationError(message)) {
        status = 400;
    }

    const responseMessage =
        config.isProduction && status >= 500 ? 'Internal server error' : message;

    return res.status(status).json({ error: responseMessage });
};

const createApplication = async (req, res) => {
    try {
        const application = await service.createApplication(req.user.id, req.body);
        return res.status(201).json(application);
    } catch (error) {
        return errorResponse(res, error);
    }
};

const listApplications = async (req, res) => {
    try {
        const result = await service.listApplications(req.user.id, req.query);
        return res.status(200).json(result);
    } catch (error) {
        return errorResponse(res, error);
    }
};

const getApplication = async (req, res) => {
    try {
        const application = await service.getApplication(req.user.id, req.params.id);
        return res.status(200).json(application);
    } catch (error) {
        return errorResponse(res, error);
    }
};

const updateApplication = async (req, res) => {
    try {
        const updated = await service.updateApplication(
            req.user.id,
            req.params.id,
            req.body
        );
        return res.status(200).json(updated);
    } catch (error) {
        return errorResponse(res, error);
    }
};

const deleteApplication = async (req, res) => {
    try {
        await service.deleteApplication(req.user.id, req.params.id);
        return res.status(204).send();
    } catch (error) {
        return errorResponse(res, error);
    }
};

module.exports = {
    createApplication,
    listApplications,
    getApplication,
    updateApplication,
    deleteApplication,
};

