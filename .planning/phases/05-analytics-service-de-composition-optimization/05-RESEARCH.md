# Phase 5: Analytics Service De-composition & Optimization - Research

## Objective
Decompose the "God-like" analytics services (`admin.analytics.dashboard.js` and `admin.analytics.advanced.js`) into modular, testable, and reusable sub-services.

## Current State Analysis
### God Functions
- `getDashboardStats`: 483 lines. Handles stats, compliance, activity, and distribution.
- `getAdvancedAnalytics`: 364 lines. Handles skill gaps, benchmarking, and ROI.

### Logic Redundancy
- **Goal Compliance**: Logic to determine if a user has met a `LearningGoal` is duplicated in `admin.analytics.dashboard.js` and `admin.analytics.at-risk.js`.
- **Aggregation**: Similar loops for building distribution maps exist across services.

## Proposed Architecture
### 1. New Sub-Services
- `admin.analytics.goals.js`: 
  - `calculateGoalCompliance(users, goals, completions)`
  - `queryActiveGoals(scopeFilters)`
- `admin.analytics.aggregators.js`:
  - `aggregateDistribution(performance, type)`
  - `aggregateWeeklyActivity(performance, period)`

### 2. Refactored Services
- `admin.analytics.dashboard.js`: Focus on orchestrating high-level metrics.
- `admin.analytics.advanced.js`: Focus on complex multi-entity analysis.

## Verification Strategy
- Compare output of `getDashboardStats` before and after refactoring to ensure zero regression.
- Unit tests for `GoalComplianceService`.

## Performance Considerations
- Use Prisma `groupBy` where possible to reduce memory overhead from `findMany`.
- Ensure `dashboardQueryCache` is still effective after de-composition.
