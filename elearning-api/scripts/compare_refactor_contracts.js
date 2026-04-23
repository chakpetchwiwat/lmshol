const fs = require('fs');
const path = require('path');

const DEFAULT_FIXTURES_DIR = path.resolve(__dirname, '../../.planning/refactor/contracts');
const DEFAULT_CAPTURE_CONFIG = path.resolve(__dirname, '../../.planning/refactor/capture-config.json');

const REQUIRED_KEYS = ['name', 'route', 'auth', 'capture', 'freeze_fields', 'notes', 'sample'];

const parseArgs = (argv) => {
    const parsed = {
        fixturesDir: DEFAULT_FIXTURES_DIR,
        captureConfig: DEFAULT_CAPTURE_CONFIG,
        mode: 'validate'
    };

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        const nextValue = argv[index + 1];

        if (arg === '--fixtures-dir' && nextValue) {
            parsed.fixturesDir = path.resolve(process.cwd(), nextValue);
            index += 1;
            continue;
        }

        if (arg === '--capture-config' && nextValue) {
            parsed.captureConfig = path.resolve(process.cwd(), nextValue);
            index += 1;
            continue;
        }

        if (arg === '--mode' && nextValue) {
            parsed.mode = nextValue;
            index += 1;
        }
    }

    return parsed;
};

const listFixtureFiles = (fixturesDir) => {
    if (!fs.existsSync(fixturesDir)) {
        throw new Error(`Fixtures directory not found: ${fixturesDir}`);
    }

    return fs.readdirSync(fixturesDir)
        .filter((fileName) => fileName.endsWith('.json'))
        .sort();
};

const readJsonFile = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const isPlaceholder = (value) => {
    if (value === undefined || value === null) {
        return true;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed === '' || trimmed.includes('TBD');
    }

    if (Array.isArray(value)) {
        return value.some(isPlaceholder);
    }

    if (typeof value === 'object') {
        return Object.values(value).some(isPlaceholder);
    }

    return false;
};

const validateFixture = (fixture, fileName) => {
    const issues = [];

    REQUIRED_KEYS.forEach((key) => {
        if (!(key in fixture)) {
            issues.push(`missing required key: ${key}`);
        }
    });

    if (!fixture?.route?.method || !fixture?.route?.path) {
        issues.push('route.method and route.path are required');
    }

    if (!Array.isArray(fixture?.freeze_fields) || fixture.freeze_fields.length === 0) {
        issues.push('freeze_fields must be a non-empty array');
    }

    if (!Array.isArray(fixture?.notes)) {
        issues.push('notes must be an array');
    }

    if (isPlaceholder(fixture?.capture)) {
        issues.push('capture metadata still contains placeholders');
    }

    if (fixture?.route?.path?.includes(':id') && isPlaceholder(fixture?.capture?.route_params?.id)) {
        issues.push('route requires :id but capture.route_params.id is still a placeholder');
    }

    return {
        fileName,
        name: fixture?.name || fileName,
        issues
    };
};

const getByPathSegments = (value, segments) => {
    if (segments.length === 0) {
        return value;
    }

    if (value === undefined || value === null) {
        return undefined;
    }

    const [segment, ...rest] = segments;

    if (segment.endsWith('[]')) {
        const key = segment.slice(0, -2);
        const nextValue = value?.[key];

        if (!Array.isArray(nextValue)) {
            return undefined;
        }

        return nextValue.map((entry) => getByPathSegments(entry, rest));
    }

    return getByPathSegments(value?.[segment], rest);
};

const projectFrozenFields = (payload, freezeFields = []) => (
    freezeFields.reduce((accumulator, fieldPath) => {
        accumulator[fieldPath] = getByPathSegments(payload, fieldPath.split('.'));
        return accumulator;
    }, {})
);

const getFixtureAuthToken = (fixture, captureConfig) => {
    const explicitName = captureConfig?.fixtures?.[fixture.name]?.authTokenEnv;
    const role = String(fixture?.auth?.role || '').toLowerCase();

    const tokenEnvName = explicitName
        || (role.includes('superadmin')
            ? 'SUPERADMIN_TOKEN'
            : role.includes('admin')
                ? 'ADMIN_TOKEN'
                : 'USER_TOKEN');

    return {
        tokenEnvName,
        token: process.env[tokenEnvName] || ''
    };
};

const applyRouteParams = (routePath, routeParams = {}) => (
    Object.entries(routeParams).reduce(
        (currentPath, [key, value]) => currentPath.replace(`:${key}`, encodeURIComponent(String(value))),
        routePath
    )
);

const buildRequestUrl = (baseUrl, fixture, captureConfig) => {
    const fixtureOverride = captureConfig?.fixtures?.[fixture.name] || {};
    const routeParams = fixtureOverride.route_params || fixture?.capture?.route_params || {};
    const query = fixtureOverride.query || fixture?.capture?.query || {};
    const appliedPath = applyRouteParams(fixture.route.path, routeParams);
    const requestUrl = new URL(appliedPath, baseUrl);

    Object.entries(query).forEach(([key, value]) => {
        if (!isPlaceholder(value)) {
            requestUrl.searchParams.set(key, String(value));
        }
    });

    return requestUrl.toString();
};

const executeCaptureMode = async (fixturesDir, captureConfigPath) => {
    if (!process.env.CONTRACT_BASE_URL) {
        throw new Error('CONTRACT_BASE_URL is required for capture mode');
    }

    if (!fs.existsSync(captureConfigPath)) {
        throw new Error(`Capture config not found: ${captureConfigPath}`);
    }

    const captureConfig = readJsonFile(captureConfigPath);
    const fixtureFiles = listFixtureFiles(fixturesDir);
    const results = [];

    for (const fileName of fixtureFiles) {
        const fixturePath = path.join(fixturesDir, fileName);
        const fixture = readJsonFile(fixturePath);
        const validation = validateFixture(fixture, fileName);

        if (validation.issues.length > 0) {
            results.push({
                fileName,
                status: 'skipped',
                reason: `fixture is not capture-ready: ${validation.issues.join('; ')}`
            });
            continue;
        }

        const { tokenEnvName, token } = getFixtureAuthToken(fixture, captureConfig);
        if (!token) {
            results.push({
                fileName,
                status: 'skipped',
                reason: `missing auth token env: ${tokenEnvName}`
            });
            continue;
        }

        const requestUrl = buildRequestUrl(process.env.CONTRACT_BASE_URL, fixture, captureConfig);
        const response = await fetch(requestUrl, {
            method: fixture.route.method,
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const body = await response.json();
        results.push({
            fileName,
            status: response.ok ? 'ok' : 'error',
            httpStatus: response.status,
            projected: projectFrozenFields(body, fixture.freeze_fields)
        });
    }

    console.log(JSON.stringify({
        mode: 'capture',
        baseUrl: process.env.CONTRACT_BASE_URL,
        fixturesDir,
        results
    }, null, 2));
};

const executeValidateMode = (fixturesDir) => {
    const fixtureFiles = listFixtureFiles(fixturesDir);
    const results = fixtureFiles.map((fileName) => {
        const fixturePath = path.join(fixturesDir, fileName);
        const fixture = readJsonFile(fixturePath);
        return validateFixture(fixture, fileName);
    });

    const invalidCount = results.filter((result) => result.issues.length > 0).length;

    console.log(JSON.stringify({
        mode: 'validate',
        fixturesDir,
        invalidCount,
        results
    }, null, 2));

    if (invalidCount > 0) {
        process.exitCode = 1;
    }
};

const main = async () => {
    const args = parseArgs(process.argv.slice(2));

    if (args.mode === 'capture') {
        await executeCaptureMode(args.fixturesDir, args.captureConfig);
        return;
    }

    executeValidateMode(args.fixturesDir);
};

main().catch((error) => {
    console.error('[compare_refactor_contracts] failed:', error.message);
    process.exitCode = 1;
});
