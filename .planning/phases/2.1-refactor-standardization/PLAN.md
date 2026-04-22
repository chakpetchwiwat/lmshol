# Phase 2.1: Project Standardization & Debt Reduction - PLAN

## Goal
To reduce technical debt by refactoring the "Fat" Dashboard component, centralizing hardcoded Thai labels, and standardizing shared UI patterns (like User History links). This will make the codebase easier to maintain for Phase 3 and Phase 4.

## Proposed Changes

### [Utils] Constants & API

#### [NEW] [dashboard.js](file:///d:/งาน/AI Project/elearning-webapp/src/utils/constants/dashboard.js)
- Move `MONTH_OPTIONS`, `SKILL_LABELS`, and `STATUS_LABELS` from `Dashboard.jsx` to this centralized file.
- Add shared labels for dashboard UI (e.g., labels for charts and printable reports).

#### [MODIFY] [api.js](file:///d:/งาน/AI Project/elearning-webapp/src/utils/api.js)
- Remove redundant `uploadFile` declaration.
- (Optional/Next Phase) Investigate replacing `window.location.href` with a more integrated redirect method.

### [Component] Shared & Atomic UI

#### [NEW] [UserLink.jsx](file:///d:/งาน/AI Project/elearning-webapp/src/components/admin/UserLink.jsx)
- An atomic component that renders a clickable user name.
- Props: `userId`, `userName`, `onViewUser`.
- Feature: Automatically renders as a `<span>` if `userId` is missing, protecting against UI errors.

### [Refactor] Dashboard Decomposition

#### [NEW] [InsightConfigs.js](file:///d:/งาน/AI Project/elearning-webapp/src/pages/admin/Dashboard/InsightConfigs.js)
- Factory functions that return the configuration object (title, subtitle, columns, rows) for each of the 8+ dashboard insights.
- This will remove ~300 lines of configuration from `Dashboard.jsx`.

#### [MODIFY] [Dashboard.jsx](file:///d:/งาน/AI Project/elearning-webapp/src/pages/admin/Dashboard.jsx)
- **Import Changes**: Use centralized constants and config factories.
- **Complexity Reduction**: Use the new `UserLink` in all column renderers.
- **Table Integration**: Update `DashboardPerformanceTable` to use the same logic.

## Verification Plan

### Automated Tests
- N/A for this refactor phase (primarily structural).

### Manual Verification
1. **Regression Check**: Open every Dashboard Insight (Weekly, Skill Gap, Risk, etc.) and verify data still displays correctly.
2. **Standardization Check**: Verify User History modals still open correctly from ALL name links on the dashboard.
3. **Labels Check**: Change a label in `dashboard.js` (e.g., change "ผู้เรียน" to "พนักงาน") and verify it updates across all insights simultaneously.
