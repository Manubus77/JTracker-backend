//Manages blacklisted JWT tokens for logout functionality.


// In-memory token blacklist
// Format: { token: expirationTimestamp }
const blacklist = new Map();

/**
 * Add a token to the blacklist
 * @param {string} token - JWT token to blacklist
 * @param {number} expiresIn - Token expiration time in seconds (from JWT)
 */
const addToBlacklist = (token, expiresIn) => {
    // Calculate expiration timestamp (current time + token expiration)
    const expirationTimestamp = Date.now() + (expiresIn * 1000);
    blacklist.set(token, expirationTimestamp);
    
    // Clean up expired tokens periodically (every 5 minutes)
    if (blacklist.size > 0 && blacklist.size % 100 === 0) {
        cleanupExpiredTokens();
    }
};

/**
 * Check if a token is blacklisted
 * @param {string} token - JWT token to check
 * @returns {boolean} - True if token is blacklisted
 */
const isBlacklisted = (token) => {
    const expiration = blacklist.get(token);
    if (!expiration) {
        return false;
    }
    
    // If token has expired, remove it and return false
    if (Date.now() > expiration) {
        blacklist.delete(token);
        return false;
    }
    
    return true;
};

//Remove expired tokens from blacklist
const cleanupExpiredTokens = () => {
    const now = Date.now();
    for (const [token, expiration] of blacklist.entries()) {
        if (now > expiration) {
            blacklist.delete(token);
        }
    }
};

//Clear all tokens from blacklist (useful for testing)
const clearBlacklist = () => {
    blacklist.clear();
};

//Get blacklist size (for monitoring)
const getBlacklistSize = () => {
    cleanupExpiredTokens();
    return blacklist.size;
};

module.exports = {
    addToBlacklist,
    isBlacklisted,
    cleanupExpiredTokens,
    clearBlacklist,
    getBlacklistSize,
};

