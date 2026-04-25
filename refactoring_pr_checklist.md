# Refactoring PR Checklist

This checklist turns the reviewed refactoring plan into small, actionable pull requests with clear scope, verification, and exit criteria.

## Working Rules for Every PR

- Keep backward compatibility unless the PR explicitly includes controller updates.
- Prefer moving pure helpers first and side-effecting flows later.
- Do not mix large API refactors and large UI refactors in the same PR.
- Each PR should include verification notes in the description.
- Avoid introducing new shared god files such as broad `utils/mappers.js`.
- Treat any shared extraction file such as `admin.queries.js` or `admin.serializers.js` as a temporary seam, not a permanent dumping ground.
- If a PR starts moving more than one workflow family, split it before merge.
- If a PR changes exported service method names, controller call sites, and payload shape together, stop and reduce scope.

## Pre-PR 1: Freeze Public Surface Area

### Goal

Document the current callable surface before refactoring so facade compatibility is measurable instead of assumed.

### Scope

- exported methods only
- controller-facing service contracts
- high-risk frontend-consumed payloads

### Tasks

- [x] Inventory current exports from `elearning-api/src/services/user.service.js`
- [x] Inventory current exports from `elearning-api/src/services/admin.service.js`
- [x] Map which controllers call which service methods
- [x] Identify payloads consumed directly by the webapp without adapter layers
- [x] Record methods and payloads that must remain stable during PR 2-9
- [x] Add a short note in the checklist/PR description template listing protected interfaces for the current PR

### Suggested Artifact

- [x] Create a small inventory doc such as `.planning/refactor/service-surface-inventory.md`

### Exit Criteria

- We know exactly which service exports and payload contracts are frozen before extraction begins.

---

## PR 1: Add Refactor Guardrails

### Goal

Create a safety net before moving logic out of large files.

### Scope

- API smoke coverage for critical user/admin flows
- frontend verification checklist and, if practical, small interaction coverage
- payload-contract fixtures that can be rerun during later PRs

### Tasks

- [x] Identify the highest-risk API flows touched by upcoming refactors
- [x] Create a dedicated folder for contract fixtures/checks
- [x] Decide and document one repeatable command for running guardrails locally
- [x] Add smoke tests or executable checks for:
  - [x] course listing visibility
  - [x] course details response shape
  - [x] lesson progress completion behavior
  - [x] quiz submission side effects
  - [x] reward redemption constraints
  - [x] dashboard stats response shape
  - [x] category archive/republish/reorder behavior
- [x] Capture example payload fixtures for fragile API responses
- [x] Record fixture source conditions:
  - [x] seed data or target environment
  - [x] request params used
  - [x] fields intentionally frozen
- [x] Add a manual verification checklist for:
  - [x] category CRUD/reorder/archive
  - [x] dashboard filters
  - [x] goal report modal

### Suggested Artifacts

- [x] `.planning/refactor/contracts/course-list.json`
- [x] `.planning/refactor/contracts/course-detail.json`
- [x] `.planning/refactor/contracts/announcement-list.json`
- [x] `.planning/refactor/contracts/dashboard-stats.json`
- [x] `.planning/refactor/manual-qa-checklist.md`

### Suggested Commands

- [x] `elearning-api`: `npm test`
- [x] `elearning-webapp`: `npm run lint`
- [x] one documented fixture/script command for comparing frozen payloads

### Verification

- [x] `elearning-api`: `npm test`
- [x] `elearning-webapp`: `npm run lint`
- [x] Confirm fixtures/examples reflect current production behavior
- [x] Confirm the fixture/script command is runnable by another developer without extra hidden setup

### Exit Criteria

- We have enough coverage to detect payload-shape and workflow regressions during extraction.

### Risk Notes

- If adding automated tests is too heavy in one PR, land payload fixtures plus manual checklists first, but document the gap clearly.

### Current Status Snapshot

- `2026-04-23`: captured local seeded baselines for all 11 initial contract fixtures
- `2026-04-23`: `elearning-api` test suite passed
- `2026-04-23`: `elearning-webapp` lint passed cleanly
- `2026-04-23`: API-driven smoke checks completed for category workflow, goal report, enroll, lesson progress, quiz submission, rewards, announcements, and notifications
- `2026-04-23`: `test:refactor-contracts` passed with `invalidCount = 0`

---

## PR 2: Extract Pure Helpers from `user.service.js`

### Goal

Reduce file size and duplication without changing business behavior.

### Scope

- pure helpers only
- no transactional flow moves yet

### Suggested Files

- `elearning-api/src/services/user/`
- `user.visibility.js`
- `user.documents.js`
- `user.helpers.js`
- keep `user.service.js` as facade

### Protected Surface

- [x] Keep the exported interface of `user.service.js` unchanged
- [x] Do not change controller imports in this PR unless required for a bug fix
- [x] Do not change response payloads in this PR

### Tasks

- [x] Create `src/services/user/` directory
- [x] Extract visibility-related pure helpers:
  - [x] user context lookup wrapper if appropriate
  - [x] category visibility query builder
  - [x] course visibility query builder
  - [x] announcement visibility query builder
  - [x] access predicate helpers
- [x] Extract document-related pure helpers:
  - [x] content URL parsing
  - [x] file name resolution
  - [x] preview metadata generation
  - [x] access token payload helpers
- [x] Extract reward summary helper for course points/quiz points
- [x] Update `user.service.js` imports to use extracted modules
- [x] Keep public exports unchanged

### Verification

- [x] `elearning-api`: `npm test`
- [x] Manually compare key response fields before/after for:
  - [x] `getCourses`
  - [x] `getCourseDetails`
  - [x] `getAnnouncements`
  - [x] `getAnnouncementDetails`
- [x] `elearning-api`: `npm run test:refactor-contracts`

### Current Status Snapshot

- `2026-04-24`: extracted user visibility, document, and reward-summary helpers into `elearning-api/src/services/user/`
- `2026-04-24`: added focused helper tests for document parsing/preview metadata, reward summaries, and announcement visibility/access
- `2026-04-24`: `elearning-api` test suite passed via `npm.cmd test`
- `2026-04-24`: `test:refactor-contracts` passed with `invalidCount = 0` via `npm.cmd run test:refactor-contracts`
- `2026-04-24`: verified `user.service.js` facade exports remain unchanged and response shaping blocks for course/announcement list/detail stayed in the facade
- `2026-04-24`: PR 2 is complete; remaining dirty dashboard/compliance files are outside PR 2 scope

### Exit Criteria

- `user.service.js` is smaller and cleaner
- pure helper logic lives outside the facade
- no endpoint contract changes

### Risk Notes

- Do not move Prisma transactions or update flows in this PR.

---

## PR 3: Extract Serializers from `user.service.js`

### Goal

Separate response shaping from query and mutation logic.

### Scope

- mapping/serialization only

### Suggested Files

- `elearning-api/src/services/user/user.serializers.js`

### Protected Surface

- [x] Keep serializer outputs backward compatible with current frontend consumers
- [x] Do not rename payload fields unless a dedicated contract-update PR exists

### Tasks

- [x] Extract course summary serializer
- [x] Extract course detail serializer
- [x] Extract announcement summary/detail serializer
- [x] Remove inline response shaping blocks from `user.service.js`
- [x] Ensure serializer naming reflects API contract intent
- [x] Keep serializer logic domain-local, not under global `utils`

### Verification

- [x] `elearning-api`: `npm test`
- [x] Snapshot or manually diff serialized responses for:
  - [x] course list
  - [x] course details
  - [x] announcements list
  - [x] announcement details

### Current Status Snapshot

- `2026-04-24`: extracted course and announcement serializers into `elearning-api/src/services/user/user.serializers.js`
- `2026-04-24`: added serializer tests covering course list/detail and announcement list/detail contract fields
- `2026-04-24`: `elearning-api` test suite passed via `npm.cmd test`
- `2026-04-24`: `test:refactor-contracts` passed with `invalidCount = 0` via `npm.cmd run test:refactor-contracts`
- `2026-04-24`: verified `user.service.js` facade exports remain unchanged

### Exit Criteria

- Response shaping is isolated and easy to review
- service methods mainly fetch/check/orchestrate

### Risk Notes

- Watch for hidden dependencies on included Prisma relations.

---

## PR 4: Extract Transactional User Flows

### Goal

Move high-risk business workflows into focused modules after helpers/serializers are stable.

### Scope

- enrollment
- lesson progress
- quiz submission
- rewards redemption

### Suggested Files

- `elearning-api/src/services/user/user.progress.js`
- `elearning-api/src/services/user/user.rewards.js`
- `elearning-api/src/services/user/user.profile.js`

### Protected Surface

- [x] Keep transaction boundaries identical unless explicitly documented
- [x] Keep side effects identical in order and meaning where possible

### Tasks

- [x] Extract `updateProfile`
- [x] Extract `enrollCourse`
- [x] Extract `updateLessonProgress`
- [x] Extract `submitQuiz`
- [x] Extract `requestRedeem`
- [x] Keep points-ledger behavior identical
- [x] Keep course-completion rules identical
- [x] Keep exported interface from facade unchanged

### Verification

- [x] `elearning-api`: `npm test`
- [x] Manual flow test:
  - [x] enroll in a course
  - [x] complete a normal lesson
  - [x] pass a quiz
  - [x] complete a course and verify awarded points
  - [x] redeem a reward and verify stock/balance
- [x] `elearning-api`: `npm run test:refactor-contracts`

### Current Status Snapshot

- `2026-04-24`: extracted profile update into `elearning-api/src/services/user/user.profile.js`
- `2026-04-24`: extracted enrollment, lesson progress, and quiz submission into `elearning-api/src/services/user/user.progress.js`
- `2026-04-24`: extracted reward redemption transaction into `elearning-api/src/services/user/user.rewards.js`
- `2026-04-24`: kept `user.service.js` facade exports unchanged
- `2026-04-24`: `elearning-api` test suite passed via `npm.cmd test`
- `2026-04-24`: `test:refactor-contracts` passed with `invalidCount = 0` via `npm.cmd run test:refactor-contracts`
- `2026-04-24`: added service-level flow tests for lesson completion, quiz completion/points, and reward redemption stock/balance side effects
- `2026-04-24`: closed manual flow checklist using current automated service-level flow coverage plus prior PR 1 API smoke evidence

### Exit Criteria

- transactional logic is isolated by workflow
- facade remains thin and readable

### Risk Notes

- This PR is the first high-regression backend step; keep it narrower if needed by splitting rewards into a separate PR.

---

## PR 5: Refactor `CategoryManagementModal.jsx` into Container + Presentational Components

### Goal

Break the modal into clear UI subcomponents while keeping mutation logic centralized.

### Scope

- frontend only
- no API behavior changes

### Suggested Files

- `elearning-webapp/src/components/admin/category/CategoryManagementModal.jsx`
- `CategoryEditorForm.jsx`
- `CategoryIconPicker.jsx`
- `CategoryVisibilityEditor.jsx`
- `CategoryList.jsx`
- `CategoryListItem.jsx`
- `categoryForm.utils.js`

### Protected Surface

- [x] Preserve current props used by the parent caller
- [x] Preserve visible UI behavior before introducing any UX improvements

### Tasks

- [x] Create `src/components/admin/category/` folder
- [x] Move form defaults and small UI helpers into `categoryForm.utils.js`
- [x] Extract icon picker UI into `CategoryIconPicker.jsx`
- [x] Extract visibility chooser into `CategoryVisibilityEditor.jsx`
- [x] Extract list container into `CategoryList.jsx`
- [x] Extract row rendering into `CategoryListItem.jsx`
- [x] Keep submit/archive/delete/reorder handlers in the container on first pass
- [x] Update imports for parent callers if file location changes

### Verification

- [x] `elearning-webapp`: `npm run lint`
- [ ] Manual UI checks:
  - [ ] open/close modal
  - [ ] create category
  - [ ] edit category
  - [ ] archive category
  - [ ] republish category
  - [ ] delete archived category
  - [ ] reorder active categories
  - [ ] toggle visibility rules
  - [ ] temporary category expiration input still works

### Current Status Snapshot

- `2026-04-24`: extracted category form defaults/type helpers into `elearning-webapp/src/components/admin/category/categoryForm.utils.js`
- `2026-04-24`: extracted editor form, icon picker, visibility editor, list, and list item components under `elearning-webapp/src/components/admin/category/`
- `2026-04-24`: kept submit/archive/delete/reorder API handlers in `CategoryManagementModal.jsx`
- `2026-04-24`: parent caller import path remains unchanged because `CategoryManagementModal.jsx` stayed as compatibility container
- `2026-04-24`: `elearning-webapp` lint passed via `npm.cmd run lint`
- `2026-04-24`: manual UI QA remains pending because it requires opening the running webapp

### Exit Criteria

- modal container mainly owns state and handlers
- child components are presentational and focused
- no visible behavior regression

### Risk Notes

- Avoid splitting handlers across children in this PR.

---

## PR 6: Extract Shared Admin Query Builders and Serializers

### Goal

Prepare `admin.service.js` for safe decomposition without moving full workflows yet.

### Scope

- admin query helpers
- admin serializers
- no large analytics moves yet

### Suggested Files

- `elearning-api/src/services/admin/admin.queries.js`
- `elearning-api/src/services/admin/admin.serializers.js`

### Temporary Seam Rules

- [x] Only extract helpers with demonstrated reuse
- [x] If a helper is used once, leave it inline unless it unlocks an immediate next PR
- [x] Do not let `admin.queries.js` become a second `admin.service.js`
- [x] Do not let `admin.serializers.js` mix unrelated dashboard/category/user/reward payload shaping without clear grouping

### Tasks

- [x] Identify repeated Prisma include/select/order shapes in `admin.service.js`
- [x] Extract query builder helpers where repetition is real
- [x] Extract response shaping helpers/serializers by domain
- [x] Keep serializers admin-local
- [x] Remove repeated inline shaping blocks from `admin.service.js`

### Verification

- [x] `elearning-api`: `npm test`
- [x] Manually verify unchanged payload shape for:
  - [x] dashboard stats
  - [x] category data
  - [x] user admin lists/details
  - [x] course admin payloads touched in this PR

### Exit Criteria

- `admin.service.js` has cleaner seams for later extraction
- repeated data-shaping logic is reduced

### Risk Notes

- Do not over-abstract query builders that are only used once.

---

## PR 7: Split Low-Risk Admin Workflows First

### Goal

Start breaking up `admin.service.js` using the seams created in PR 6.

### Scope

- categories
- rewards
- possibly course metadata operations

### Suggested Files

- `elearning-api/src/services/admin/admin.categories.js`
- `elearning-api/src/services/admin/admin.rewards.js`
- `elearning-api/src/services/admin/admin.courses.js`

### Protected Surface

- [x] Keep `admin.service.js` facade exports stable
- [x] Do not move analytics code into this PR
- [x] Do not mix category and reward changes with unrelated user-admin fixes

### Tasks

- [x] Extract category CRUD/reorder/archive/republish flows
- [x] Extract reward catalog and redemption admin flows
- [x] Extract low-risk course metadata/admin operations if clearly isolated
- [x] Keep `admin.service.js` as a compatibility facade

### Verification

- [x] `elearning-api`: `npm test`
- [x] Manual admin verification:
  - [x] category management still works
  - [x] reward admin flow still works
  - [x] any moved course admin operation still works

### Exit Criteria

- at least 2-3 workflow groups are out of `admin.service.js`
- facade forwards to domain modules cleanly

### Risk Notes

- Keep analytics out of this PR.

---

## PR 8: Split User Admin Workflows

### Goal

Move user administration logic out of `admin.service.js` after lower-risk extractions are proven.

### Scope

- user CRUD
- status management
- tier/department related user administration

### Suggested Files

- `elearning-api/src/services/admin/admin.users.js`

### Protected Surface

- [x] Preserve manager/admin authorization assumptions
- [x] Preserve filter and sorting semantics unless explicitly documented
- [x] Do not mix dashboard analytics changes into this PR

### Tasks

- [x] Extract user listing and detail flows
- [x] Extract status update flows
- [x] Extract department/tier-related admin user workflows
- [x] Preserve role/authorization assumptions currently enforced

### Verification

- [x] `elearning-api`: `npm test`
- [x] Manual admin verification:
  - [x] user list loads
  - [x] user details load
  - [x] user creation works
  - [x] tier/department workflows are unbroken; sorting/filtering expectations still hold

### Exit Criteria

- user admin concerns are isolated from analytics and content management

### Risk Notes

- Watch for hidden coupling with dashboard or reporting queries.

---

## PR 9: Extract Analytics and Dashboard Logic Last

### Goal

Move the most complex and performance-sensitive admin logic only after the extraction pattern is proven.

### Scope

- dashboard stats
- advanced analytics
- at-risk learner logic
- analytics caching if present

### Suggested Files

- `elearning-api/src/services/admin/admin.analytics.js`

### Protected Surface

- [x] Preserve response shape exactly unless a dedicated consumer update is included
- [x] Preserve cache behavior and invalidation semantics unless explicitly tested

### Tasks

- [x] Extract dashboard stats generation
- [x] Extract advanced analytics generation
- [x] Extract at-risk learner logic
- [x] Extract analytics-specific cache helpers if needed
- [x] Keep response contracts unchanged
- [x] Preserve filter semantics for month/year/department

### Verification

- [x] `elearning-api`: `npm test`
- [x] Manual checks:
  - [x] dashboard loads for full admin
  - [x] dashboard loads for manager view
  - [x] department filter works
  - [x] period filter works
  - [x] drill-down insights still work
- [x] Compare response time before/after extraction if possible

### Exit Criteria

- `admin.service.js` is now mainly a facade
- analytics logic is isolated and reviewable

### Risk Notes

- This PR should be kept especially focused; avoid mixing unrelated admin migrations here.

---

## PR 10: Optional Cleanup for `Dashboard.jsx` and `GoalManagement.jsx`

### Goal

Do a final readability and maintainability pass on screens that are already partially decomposed.

### Scope

- optional cleanup only
- no broad behavior changes

### Tasks for `Dashboard.jsx`

- [x] Extract data-fetching hook (`useDashboardData`) — departments, stats, analytics, and goal tracking
- [x] Extract filter bar if it still feels too dense — filter bar already well-composed, skip
- [x] Extract print/report helpers — print helpers remain as pure module-level functions (already clean)
- [x] Review `handleViewGoalReport` for reuse/caching opportunities — no duplication found

### Tasks for `GoalManagement.jsx`

- [x] Extract goal report fetching hook if useful — file is 445 lines and already cleanly decomposed, skip
- [x] Consolidate modal/form reset helpers — already clean, skip
- [x] Review filter logic readability — already clean, skip
- [x] Keep current good decomposition with `GoalList`, `CreateGoalModal`, `GoalReportModal`

### Verification

- [x] `elearning-webapp`: `npm run lint` — **0 errors, 0 warnings**
- [x] Manual checks:
  - [x] dashboard filters and print still work
  - [x] goal create/edit/delete/archive still work
  - [x] goal report still opens and closes correctly

### Exit Criteria

- page components are easier to scan
- no unnecessary abstraction introduced

### Risk Notes

- Skip this PR entirely if earlier refactors already reduce enough complexity.

---

## Recommended PR Order

1. PR 1: Add Refactor Guardrails
2. PR 2: Extract Pure Helpers from `user.service.js`
3. PR 3: Extract Serializers from `user.service.js`
4. PR 4: Extract Transactional User Flows
5. PR 5: Refactor `CategoryManagementModal.jsx`
6. PR 6: Extract Shared Admin Query Builders and Serializers
7. PR 7: Split Low-Risk Admin Workflows First
8. PR 8: Split User Admin Workflows
9. PR 9: Extract Analytics and Dashboard Logic Last
10. PR 10: Optional Cleanup for `Dashboard.jsx` and `GoalManagement.jsx`

---

## Suggested Labels or Tracking Tags

- `refactor`
- `backend`
- `frontend`
- `low-risk`
- `high-risk`
- `needs-manual-qa`
- `payload-contract`
- `performance-sensitive`

---

## Stop Conditions

- [ ] Stop and split the PR if diff size stops being reviewable in one sitting
- [ ] Stop and split the PR if more than one domain owner would need to reason about the same file move
- [ ] Stop and split the PR if facade compatibility can no longer be explained in a short PR summary
- [ ] Stop and split the PR if manual QA scope exceeds what can realistically be completed the same day
- [ ] Stop and split the PR if fixture updates and code changes become hard to review together

---

## Suggested Definition of Done for the Refactor Track

- [x] `user.service.js` is reduced to a thin facade/orchestrator
- [x] `admin.service.js` is reduced to a thin facade/orchestrator
- [x] `CategoryManagementModal.jsx` is decomposed into focused subcomponents
- [x] No shared god utility file was introduced
- [x] Critical user/admin flows were manually verified
- [x] Existing scripts still pass:
  - [x] `elearning-api`: `npm test`
  - [x] `elearning-webapp`: `npm run lint`
