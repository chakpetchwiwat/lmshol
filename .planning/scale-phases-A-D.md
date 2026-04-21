# Scaling Execution Plan (A-D)

Purpose: keep the scalability roadmap explicit so work does not drift between sessions.

Last updated: `2026-04-21`

## Current Status

### Phase A: Goal-centric reporting redesign
Status: `pending`

Goal:
- Move tracking/reporting to a goal-progress model instead of raw enrollments.

Done so far:
- Goal report stability improvements
- Goal report cache/dedupe
- Goal report timing/logging

Still needed:
- Define goal-progress snapshot shape
- Refactor tracking/report UIs to consume goal-centric summaries
- Align drill-down flows with goal progress instead of course-only status

### Phase B: Analytics summary tables
Status: `pending`

Goal:
- Precompute dashboard/compliance metrics instead of aggregating raw tables on every request.

Still needed:
- Design summary tables/materialized snapshots
- Define refresh strategy (event-driven vs scheduled)
- Migrate dashboard widgets to summary-backed reads

### Phase C: Async report/export pipeline
Status: `pending`

Goal:
- Move heavy reports/exports off the request-response path.

Still needed:
- Job model/status table
- Report generation worker flow
- Download/retry UX

### Phase D: DB index + query optimization
Status: `completed`

Done:
- Added reporting indexes and migration
- Added dashboard cache + in-flight dedupe
- Added goal report cache + in-flight dedupe
- Added dashboard/goal timing logs
- Added goal report request cancellation and frontend cache
- Added goal report rate limiting
- Reduced some dashboard stats query scope
- Reduced heavy joins in advanced analytics by reusing scoped user maps
- Trimmed course history queries to follow actual filters and fetch less related data
- Added announcement history cache/dedupe on the backend plus cache invalidation on write paths
- Added announcement history frontend cache and request cancellation
- Added route-level observability for course history, announcement history, and course quiz attempts

Completion note:
- Phase D is considered complete because the current heavy admin/report flows now have baseline indexing, cache/dedupe, query trimming, and route timing coverage needed for safe iteration.
- Future scalability work should continue in Phases A, B, and C rather than reopening Phase D unless a new hotspot is discovered.

## Execution Order

1. Implement Phase A so reporting follows the real product model.
2. Implement Phase B once goal-centric metrics are defined.
3. Implement Phase C after summary shapes and heavy report boundaries are clear.

## Immediate Next Task

Current target:
- Start Phase A by defining the goal-progress snapshot and the goal-centric tracking/report contract.

Immediate deliverables for Phase A:
- Define the canonical goal-progress statuses: `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `OVERDUE`
- Define the goal-tracking row shape for admin reporting:
  - `userId`, `name`, `department`, `tier`
  - `goalId`, `goalTitle`, `goalType`
  - `status`, `progressPercent`, `completedAt`, `dueAt`
  - `latestCourseTitle`, `latestLearningAt`
- Decide which pages should become goal-centric first:
  - goal report
  - learning target report/tracking
  - employee drill-down history
- Define the drill-down contract:
  - dashboard/report summary
  - team/member list
  - individual learning history

Exit criteria for starting Phase B:
- Goal-centric snapshot shape is documented
- Backend response contract is agreed
- Frontend screens that consume the new contract are identified
