const getClientIp = (req) => {
    const forwardedFor = req?.headers?.['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
        return forwardedFor.split(',')[0].trim();
    }

    return req?.ip || req?.socket?.remoteAddress || 'unknown';
};

const logSecurityEvent = (event, req, details = {}) => {
    const entry = {
        category: 'security',
        event,
        timestamp: new Date().toISOString(),
        path: req?.originalUrl || req?.path || null,
        method: req?.method || null,
        ip: getClientIp(req),
        userId: req?.user?.userId || null,
        ...details
    };

    console.warn(`[security] ${JSON.stringify(entry)}`);
    return entry;
};

module.exports = {
    getClientIp,
    logSecurityEvent
};
