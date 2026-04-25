# Phase 3: Security Hardening & Edge Protection - PLAN

## Goal
Establish production-ready security controls, auditability, and data isolation. This phase focuses on hardening the API layer and database against common attacks while ensuring we have the telemetry needed to respond to incidents.

## Exit Criteria
- [x] **Rate Limiting**: Auth endpoints (Login/Register) are protected by Redis-backed rate limiting.
- [ ] **Audit Trails**: Security-critical events (Logins, Failed Auth, Role Changes) are logged in a structured JSON format.
- [ ] **Data Isolation**: Row Level Security (RLS) is implemented on the `PointsLedger` and `User` tables to prevent cross-tenant or unauthorized data access at the DB level.
- [ ] **Edge Security**: `helmet` configuration is hardened for production (HSTS, No-Sniff, stricter CSP).
- [ ] **Documentation**: A security runbook is created for DDoS mitigation and incident response.

## Work Breakdown

### Task Group 1: Infrastructure & Rate Limiting
- [ ] **Redis Integration**:
    - Add `redis` and `rate-limit-redis` to `elearning-api`.
    - Update `src/config/security.js` to initialize `RedisStore`.
    - Implement tiered rate limiting:
        - Global: 100 requests per 15 min.
        - Login: 5 attempts per 15 min per IP.
- [ ] **Environment Hardening**:
    - Enforce `SECURE_COOKIES=true` in production.
    - Set `TRUST_PROXY=1` (or appropriate depth for AWS ALB).

### Task Group 2: Structured Audit Logging
- [ ] **Security Logger Service**:
    - Implement `src/services/security/security.logger.js` using `winston` or a structured `console.log` wrapper.
    - Events to capture: `AUTH_SUCCESS`, `AUTH_FAILURE`, `SENSITIVE_DATA_MUTATION`, `ACCESS_DENIED`.
- [ ] **Middleware Integration**:
    - Update `errorHandler` to log critical security exceptions.
    - Add logging to `auth.controller.js`.

### Task Group 3: Database Hardening (PostgreSQL RLS)
- [ ] **RLS SQL Migration**:
    - Create a Prisma migration to enable RLS on `PointsLedger`, `RedeemRequest`, and `User`.
    - Define policies: "Users can only see their own ledger entries", "Admins can see all".
- [ ] **Prisma Session Context**:
    - Implement a Prisma extension or middleware to `SET LOCAL app.current_user_id` before queries.
    - Update `src/lib/prisma.js` to handle session-based identity propagation.

### Task Group 4: Edge Layer & Runbook
- [ ] **Helmet Hardening**:
    - Enable HSTS (Strict-Transport-Security).
    - Configure `Content-Security-Policy` to only allow trusted domains for assets (e.g., S3, YouTube).
- [ ] **Runbook Creation**:
    - Create `SECURITY_RUNBOOK.md` with instructions for:
        - Rotating JWT secrets.
        - Blocking IPs at the WAF level.
        - Investigating audit logs.

## Verification Plan
1. **Rate Limit Test**: Use `k6` or `ab` to hit the login endpoint and verify 429 responses after 5 attempts.
2. **Audit Log Audit**: Trigger a failed login and verify a structured log entry appears in the console/logs.
3. **RLS Bypass Test**: Attempt to query another user's `PointsLedger` entry using a raw SQL command in a limited user session (via a test script).
4. **Header Scan**: Use `securityheaders.com` or `curl -I` to verify HSTS and CSP headers are present.
