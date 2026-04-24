# Phase 2.3: Backend Service Modularization - PLAN

## Goal
To decompose monolithic backend services into smaller, domain-specific modules using the Facade pattern. This improves maintainability and ensures that no single service exceeds 500-600 lines of code.

## Proposed Changes

### Wave 1: Admin Analytics Decomposition
**Objective:** Split `admin.analytics.js` (~1100 lines) into functional sub-modules.

#### [NEW] [admin.analytics.engine.js](file:///d:/งาน/AI Project/elearning-api/src/services/admin/analytics/admin.analytics.engine.js)
- Caching logic (`dashboardQueryCache`, `pruneDashboardCache`).
- Filter and Period builders (`parseDashboardFilters`, `buildDashboardPeriod`, `buildTimeBuckets`).
- Time bucket key generators.

#### [NEW] [admin.analytics.dashboard.js](file:///d:/งาน/AI Project/elearning-api/src/services/admin/analytics/admin.analytics.dashboard.js)
- Core dashboard stats (Business, Core, Functional, etc.).
- Department-specific dashboard analytics.

#### [NEW] [admin.analytics.at-risk.js](file:///d:/งาน/AI Project/elearning-api/src/services/admin/analytics/admin.analytics.at-risk.js)
- At-risk learner identification and course analysis.

#### [NEW] [admin.analytics.participation.js](file:///d:/งาน/AI Project/elearning-api/src/services/admin/analytics/admin.analytics.participation.js)
- User participation rates and leaderboards.

#### [MODIFY] [admin.analytics.js](file:///d:/งาน/AI Project/elearning-api/src/services/admin/admin.analytics.js)
- Refactor into a facade that re-exports all functions from the new sub-modules.

### Wave 2: User Service Modularization
**Objective:** Split `user.service.js` (~620 lines) into domain files.

#### [NEW] [user.profile.js](file:///d:/งาน/AI Project/elearning-api/src/services/user/user.profile.js)
- Profile updates, settings, and employment metadata.

#### [NEW] [user.points.js](file:///d:/งาน/AI Project/elearning-api/src/services/user/user.points.js)
- Ledger management and balance calculations.

#### [NEW] [user.enrollments.js](file:///d:/งาน/AI Project/elearning-api/src/services/user/user.enrollments.js)
- User-facing participation and progress history.

#### [MODIFY] [user.service.js](file:///d:/งาน/AI Project/elearning-api/src/services/user.service.js)
- Refactor into a facade.

## Verification Plan

### Automated Tests
- Run `npm run test` to ensure all existing endpoints still function through the facades.

### Manual Verification
1. **Admin Dashboard**: Verify all charts (Business, Core, etc.) and At-risk lists load data without errors.
2. **User Profile**: Verify point balances and progress history display correctly in the web app.
3. **Performance**: Ensure caching still works as expected (no redundant DB hits for the same filter set).
