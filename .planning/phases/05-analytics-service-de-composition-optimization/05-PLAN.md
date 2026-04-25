# Phase 5: Analytics Service De-composition & Optimization - PLAN

## Objective
Break down massive analytics functions into modular components to improve maintainability and remove code duplication.

## Proposed Changes

### [Component] Analytics Shared Logic
#### [NEW] [admin.analytics.goals.js](file:///d:/งาน/AI Project/elearning-api/src/services/admin/analytics/admin.analytics.goals.js)
- Extract goal compliance calculation logic.
- Extract goal-related Prisma queries.

#### [NEW] [admin.analytics.aggregators.js](file:///d:/งาน/AI Project/elearning-api/src/services/admin/analytics/admin.analytics.aggregators.js)
- Extract distribution mapping (Category/Type).
- Extract activity bucketing logic.

### [Component] Analytics Refactoring
#### [MODIFY] [admin.analytics.dashboard.js](file:///d:/งาน/AI Project/elearning-api/src/services/admin/analytics/admin.analytics.dashboard.js)
- Replace inline compliance logic with `admin.analytics.goals`.
- Replace inline aggregation with `admin.analytics.aggregators`.

#### [MODIFY] [admin.analytics.at-risk.js](file:///d:/งาน/AI Project/elearning-api/src/services/admin/analytics/admin.analytics.at-risk.js)
- Use `admin.analytics.goals` for consistency.

#### [MODIFY] [admin.analytics.advanced.js](file:///d:/งาน/AI Project/elearning-api/src/services/admin/analytics/admin.analytics.advanced.js)
- Clean up benchmarking logic using shared aggregators.

## Tasks

### Wave 1: Core Service Extraction
- [x] Create `admin.analytics.goals.js` and move compliance logic.
  - `<read_first>`: `admin.analytics.dashboard.js`, `admin.analytics.at-risk.js`
  - `<action>`: Extract `calculateGoalCompliance` function.
  - `<acceptance_criteria>`: `admin.analytics.goals.js` exports `calculateGoalCompliance`.
- [x] Create `admin.analytics.aggregators.js` and move bucketing logic.
  - `<read_first>`: `admin.analytics.dashboard.js`
  - `<action>`: Extract `aggregateTypeDistribution`, `aggregateCategoryDistribution`, `aggregateWeeklyActivity`.
  - `<acceptance_criteria>`: `admin.analytics.aggregators.js` exists.

### Wave 2: Dashboard & At-Risk Integration
- [x] Refactor `admin.analytics.dashboard.js` to use extracted services.
  - `<read_first>`: `admin.analytics.dashboard.js`, `admin.analytics.goals.js`, `admin.analytics.aggregators.js`
  - `<action>`: Replace inline logic with function calls.
  - `<acceptance_criteria>`: `admin.analytics.dashboard.js` lines reduced significantly.
- [x] Refactor `admin.analytics.at-risk.js` to use `admin.analytics.goals`.
  - `<read_first>`: `admin.analytics.at-risk.js`
  - `<action>`: Use shared goal logic.
  - `<acceptance_criteria>`: Code duplication removed.

### Wave 3: Advanced Analytics & Optimization
- [x] Refactor `admin.analytics.advanced.js`.
  - `<read_first>`: `admin.analytics.advanced.js`
  - `<action>`: Use shared aggregators.
- [x] Optimize Prisma queries where applicable (e.g., using `select` instead of `include` for heavy relations).

## Verification Plan
### Automated Tests
- Compare API responses for `/api/admin/dashboard` before and after refactoring using a temporary script.
- Ensure `dashboardQueryCache` hit rates remain stable.

### Manual Verification
- Check Admin Dashboard UI for correct stats and graphs.
- Verify "At Risk" alerts are still accurate.
