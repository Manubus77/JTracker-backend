const config = require('../config');

const parseCookies = (req) => {
    const header = req.headers.cookie;
    if (!header) return {};
    return header.split(';').reduce((acc, pair) => {
        const [k, ...rest] = pair.split('=');
        if (!k) return acc;
        const key = k.trim();
        const value = rest.join('=').trim();
        acc[key] = decodeURIComponent(value || '');
        return acc;
    }, {});
};

const setRefreshCookie = (res, token) => {
    res.cookie(config.refreshTokenCookieName, token, {
        httpOnly: true,
        secure: config.isProduction,
        sameSite: 'lax',
        maxAge: config.refreshTokenDays * 24 * 60 * 60 * 1000,
        path: '/auth',
    });
};

const clearRefreshCookie = (res) => {
    res.clearCookie(config.refreshTokenCookieName, {
        httpOnly: true,
        secure: config.isProduction,
        sameSite: 'lax',
        path: '/auth',
    });
};

module.exports = {
    parseCookies,
    setRefreshCookie,
    clearRefreshCookie,
};

