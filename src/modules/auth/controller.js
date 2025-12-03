const service = require('./service');

const register = async (req, res, next) => {
    try {
        // Extract request body (no validation - service handles it)
        const { email, password, name } = req.body;
        
        // Call service layer
        const result = await service.register({ email, password, name });
        
        // Success response
        return res.status(201).json({
            user: result.user,
            token: result.token,
        });
    } catch (error) {
        // Map service errors to HTTP status codes
        const message = error.message || 'Internal server error';
        
        // Determine status code based on error message
        if (message.includes('required') || 
            message.includes('must be') || 
            message.includes('must contain') ||
            message.includes('valid') ||
            message.includes('Email must be')) {
            return res.status(400).json({ error: message });
        }
        
        if (message.includes('already exists')) {
            return res.status(409).json({ error: message });
        }
        
        // Default to 500 for unexpected errors
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const login = async (req, res, next) => {
    try {
        // Extract request body (no validation - service handles it)
        const { email, password } = req.body;
        
        // Call service layer
        const result = await service.login({ email, password });
        
        // Success response
        return res.status(200).json({
            user: result.user,
            token: result.token,
        });
    } catch (error) {
        // All login errors return 401 with generic message
        // Service already returns "Invalid credentials" for security
        return res.status(401).json({ 
            error: error.message || 'Invalid credentials' 
        });
    }
};

const getCurrentUser = async (req, res, next) => {
    try {
        // Extract token from header (validate Bearer format - HTTP concern)
        const authHeader = req.headers.authorization || req.headers.Authorization;
        
        // Check if header exists and has Bearer format
        if (!authHeader) {
            return res.status(401).json({ error: 'Token is required' });
        }
        
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
            return res.status(401).json({ error: 'Token is required' });
        }
        
        const token = parts[1] || null;
        if (!token || token.trim() === '') {
            return res.status(401).json({ error: 'Token is required' });
        }
        
        // Call service layer (service validates token format, presence, etc.)
        const user = await service.getCurrentUser(token);
        
        // Success response
        return res.status(200).json(user);
    } catch (error) {
        // Map service errors to HTTP status codes
        const message = error.message || 'Internal server error';
        
        // All authentication errors return 401
        if (message.includes('Token') || 
            message.includes('Invalid') || 
            message.includes('expired') ||
            message.includes('User not found')) {
            return res.status(401).json({ error: message });
        }
        
        // Default to 500
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const logout = async (req, res, next) => {
    try {
        // Extract token from header (validate Bearer format - HTTP concern)
        const authHeader = req.headers.authorization || req.headers.Authorization;
        
        // Check if header exists and has Bearer format
        if (!authHeader) {
            return res.status(401).json({ error: 'Token is required' });
        }
        
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
            return res.status(401).json({ error: 'Token is required' });
        }
        
        const token = parts[1] || null;
        if (!token || token.trim() === '') {
            return res.status(401).json({ error: 'Token is required' });
        }
        
        // Call service layer (service validates token)
        const result = await service.logout(token);
        
        // Success response
        return res.status(200).json(result);
    } catch (error) {
        // Map service errors to HTTP status codes
        const message = error.message || 'Internal server error';
        
        // All authentication errors return 401
        if (message.includes('Token') || 
            message.includes('Invalid') || 
            message.includes('expired')) {
            return res.status(401).json({ error: message });
        }
        
        // Default to 500
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    register,
    login,
    getCurrentUser,
    logout,
};