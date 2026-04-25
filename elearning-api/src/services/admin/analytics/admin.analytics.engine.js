const { parseInteger, normalizeNullableId } = require('../admin.helpers');

const DASHBOARD_CACHE_TTL_MS = (() => {
    const parsed = parseInt(process.env.DASHBOARD_CACHE_TTL_MS || '30000', 10);
    return Number.isNaN(parsed) ? 30000 : Math.max(parsed, 0);
})();

const dashboardQueryCache = new Map();

const pruneDashboardCache = () => {
    const now = Date.now();
    let prunedCount = 0;

    for (const [key, entry] of dashboardQueryCache.entries()) {
        const isExpired = !entry?.promise && entry?.expiresAt && entry.expiresAt <= now;
        const isStale = !entry?.promise && !entry?.expiresAt;

        if (isExpired || isStale) {
            dashboardQueryCache.delete(key);
            prunedCount++;
        }
    }

    if (prunedCount > 0) {
        console.debug(`[admin-cache] Pruned ${prunedCount} stale entries. Current size: ${dashboardQueryCache.size}`);
    }

    if (dashboardQueryCache.size > 200) {
        const keys = Array.from(dashboardQueryCache.keys());
        const toRemove = keys.slice(0, Math.floor(keys.length / 2));
        toRemove.forEach(k => dashboardQueryCache.delete(k));
        console.warn(`[admin-cache] Emergency purge: size exceeded 200. Reduced to ${dashboardQueryCache.size}`);
    }
};

const getDashboardCacheKey = (namespace, actor, scopeFilters) => JSON.stringify({
    namespace,
    role: actor.effectiveRole || actor.role || null,
    actorDepartmentId: actor.departmentId || null,
    scope: scopeFilters.scope || null,
    departmentId: scopeFilters.departmentId || null,
    month: scopeFilters.month || null,
    year: scopeFilters.year || null
});

const resolveDashboardCache = async (cacheKey, producer) => {
    if (DASHBOARD_CACHE_TTL_MS <= 0) {
        return producer();
    }

    pruneDashboardCache();

    const now = Date.now();
    const existingEntry = dashboardQueryCache.get(cacheKey);

    if (existingEntry?.value !== undefined && existingEntry.expiresAt > now) {
        return existingEntry.value;
    }

    if (existingEntry?.promise) {
        return existingEntry.promise;
    }

    const pendingPromise = producer()
        .then((value) => {
            dashboardQueryCache.set(cacheKey, {
                value,
                expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS
            });
            return value;
        })
        .catch((error) => {
            dashboardQueryCache.delete(cacheKey);
            throw error;
        });

    dashboardQueryCache.set(cacheKey, { promise: pendingPromise });
    return pendingPromise;
};

const DASHBOARD_TYPE_LABELS = {
    STRAT_BUSINESS: 'Business Acumen / Corporate Knowledge',
    STRAT_CORE: 'Core / Soft Skills',
    STRAT_FUNCTIONAL: 'Functional Skills',
    STRAT_LEADERSHIP: 'Leadership Skills',
    STRAT_COMPLIANCE: 'Compliance',
    STRAT_DIGITAL: 'Digital / Future Skills'
};

const DASHBOARD_TYPES = Object.keys(DASHBOARD_TYPE_LABELS);

const parseDashboardFilters = (filters = {}) => {
    const now = new Date();
    const rawYear = parseInteger(filters.year, now.getFullYear());
    const rawMonth = filters.month === undefined || filters.month === null || filters.month === ''
        ? null
        : parseInteger(filters.month, now.getMonth() + 1);

    const year = rawYear >= 2000 ? rawYear : now.getFullYear();
    const month = rawMonth && rawMonth >= 1 && rawMonth <= 12 ? rawMonth : null;

    return {
        month,
        year,
        departmentId: normalizeNullableId(filters.departmentId)
    };
};

const buildDashboardPeriod = ({ month, year }) => {
    const start = month
        ? new Date(year, month - 1, 1, 0, 0, 0, 0)
        : new Date(year, 0, 1, 0, 0, 0, 0);
    const end = month
        ? new Date(year, month, 0, 23, 59, 59, 999)
        : new Date(year, 11, 31, 23, 59, 59, 999);

    return {
        start,
        end,
        month,
        year,
        mode: month ? 'month' : 'year'
    };
};

const buildDashboardScope = (actor, filters = {}) => {
    const parsed = parseDashboardFilters(filters);
    const departmentId = actor.isAdmin
        ? (parsed.departmentId || null)
        : (actor.departmentId || null);

    return {
        ...parsed,
        departmentId,
        scope: departmentId ? 'department' : 'global'
    };
};

const getTimeBucketKey = (value, mode) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    if (mode === 'month') {
        return date.toISOString().slice(0, 10);
    }

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const buildTimeBuckets = ({ start, end, mode }) => {
    const buckets = [];
    const cursor = new Date(start);

    if (mode === 'month') {
        while (cursor <= end) {
            buckets.push({
                key: cursor.toISOString().slice(0, 10),
                label: cursor.toLocaleDateString('th-TH', { day: 'numeric' }),
                fullLabel: cursor.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
            });
            cursor.setDate(cursor.getDate() + 1);
        }

        return buckets;
    }

    while (cursor <= end) {
        buckets.push({
            key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`,
            label: cursor.toLocaleDateString('th-TH', { month: 'short' }),
            fullLabel: cursor.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
        });
        cursor.setMonth(cursor.getMonth() + 1);
    }

    return buckets;
};

const roundToOneDecimal = (value) => Number((value || 0).toFixed(1));

const getEnrollmentActivityTimestamp = (enrollment) => {
    const activityDate = enrollment?.completedAt || enrollment?.startedAt;
    return activityDate ? new Date(activityDate).getTime() : 0;
};

const buildUserTrackingSummary = (enrollments = []) => {
    const { ENROLLMENT_STATUS } = require('../../../utils/constants/statuses');
    const latestEnrollment = [...enrollments].sort(
        (left, right) => getEnrollmentActivityTimestamp(right) - getEnrollmentActivityTimestamp(left)
    )[0];

    return {
        status: latestEnrollment?.status || ENROLLMENT_STATUS.NOT_STARTED,
        latestCourseId: latestEnrollment?.courseId || null,
        latestCourseTitle: latestEnrollment?.course?.title || null,
        latestLearningAt: latestEnrollment?.completedAt || latestEnrollment?.startedAt || null,
        latestStartedAt: latestEnrollment?.startedAt || null,
        latestCompletedAt: latestEnrollment?.completedAt || null,
        progressPercent: latestEnrollment ? Math.round(Number(latestEnrollment.progressPercent || 0)) : 0,
        enrolledCourses: enrollments.length,
        completedCourses: enrollments.filter((enrollment) => enrollment.status === ENROLLMENT_STATUS.COMPLETED).length
    };
};

module.exports = {
    DASHBOARD_CACHE_TTL_MS,
    dashboardQueryCache,
    pruneDashboardCache,
    getDashboardCacheKey,
    resolveDashboardCache,
    DASHBOARD_TYPE_LABELS,
    DASHBOARD_TYPES,
    parseDashboardFilters,
    buildDashboardPeriod,
    buildDashboardScope,
    getTimeBucketKey,
    buildTimeBuckets,
    roundToOneDecimal,
    getEnrollmentActivityTimestamp,
    buildUserTrackingSummary
};
