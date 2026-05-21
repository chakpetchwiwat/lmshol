const prisma = require('../utils/prisma');
const { getClientIp } = require('../utils/securityEvents');

const SENSITIVE_KEYS = new Set([
    'password',
    'currentPassword',
    'newPassword',
    'token',
    'authorization'
]);

const redactValue = (value) => {
    if (Array.isArray(value)) {
        return value.map(redactValue);
    }

    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, nestedValue]) => [
                key,
                SENSITIVE_KEYS.has(key) ? '[REDACTED]' : redactValue(nestedValue)
            ])
        );
    }

    return value;
};

const compactMetadata = (metadata = {}) => {
    const redacted = redactValue(metadata);
    const serialized = JSON.stringify(redacted);

    if (serialized.length <= 8000) {
        return redacted;
    }

    return {
        truncated: true,
        preview: serialized.slice(0, 8000)
    };
};

const writeAuditLog = async ({
    req,
    action,
    entityType = null,
    entityId = null,
    statusCode = null,
    metadata = {}
}) => {
    const entry = {
        actorUserId: req?.user?.userId || null,
        action,
        entityType,
        entityId: entityId ? String(entityId) : null,
        method: req?.method || null,
        path: req?.originalUrl || req?.path || null,
        statusCode,
        ipAddress: getClientIp(req),
        userAgent: req?.headers?.['user-agent'] || null,
        metadata: compactMetadata(metadata)
    };

    console.info('[audit]', JSON.stringify({
        ...entry,
        createdAt: new Date().toISOString()
    }));

    if (!prisma.auditLog?.create) {
        return entry;
    }

    try {
        await prisma.auditLog.create({ data: entry });
    } catch (error) {
        console.error('Audit log write failed:', error);
    }

    return entry;
};

const inferEntityFromRequest = (req) => {
    const params = req?.params || {};

    if (params.id) return { entityType: 'generic', entityId: params.id };
    if (params.courseId) return { entityType: 'course', entityId: params.courseId };
    if (params.certificateId) return { entityType: 'certificate', entityId: params.certificateId };

    return { entityType: null, entityId: null };
};

const auditRequest = (action, options = {}) => (req, res, next) => {
    const startedAt = Date.now();

    res.on('finish', () => {
        const inferred = inferEntityFromRequest(req);
        writeAuditLog({
            req,
            action,
            entityType: options.entityType || inferred.entityType,
            entityId: options.entityId?.(req) || inferred.entityId,
            statusCode: res.statusCode,
            metadata: {
                durationMs: Date.now() - startedAt,
                params: req.params,
                query: req.query,
                body: options.includeBody === false ? undefined : req.body
            }
        });
    });

    next();
};

module.exports = {
    auditRequest,
    writeAuditLog
};
