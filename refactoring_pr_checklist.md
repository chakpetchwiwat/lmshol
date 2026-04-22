# Refactoring PR Checklist

This checklist turns the reviewed refactoring plan into small, actionable pull requests with clear scope, verification, and exit criteria.

## Working Rules for Every PR

- Keep backward compatibility unless the PR explicitly includes controller updates.
- Prefer moving pure helpers first and side-effecting flows later.
- Do not mix large API refactors and large UI refactors in the same PR.
- Each PR should include verification notes in the description.
- Avoid introducing new shared god files such as broad `utils/mappers.js`.

---

## PR 1: Add Refactor Guardrails

### Goal

Create a safety net before moving logic out of large files.

### Scope

- API smoke coverage for critical user/admin flows
- frontend verification checklist and, if practical, small interaction coverage

### Tasks

- [ ] Identify the highest-risk API flows touched by upcoming refactors
- [ ] Add smoke tests or executable checks for:
  - [ ] course listing visibility
  - [ ] course details response shape
  - [ ] lesson progress completion behavior
  - [ ] quiz submission side effects
  - [ ] reward redemption constraints
  - [ ] dashboard stats response shape
  - [ ] category archive/republish/reorder behavior
- [ ] Capture example payload fixtures for fragile API responses
- [ ] Add a manual verification checklist for:
  - [ ] category CRUD/reorder/archive
  - [ ] dashboard filters
  - [ ] goal report modal

### Verification

- [ ] `elearning-api`: `npm test`
- [ ] `elearning-webapp`: `npm run lint`
- [ ] Confirm fixtures/examples reflect current production behavior

### Exit Criteria

- We have enough coverage to detect payload-shape and workflow regressions during extraction.

### Risk Notes

- If adding automated tests is too heavy in one PR, land payload fixtures plus manual checklists first, but document the gap clearly.

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

### Tasks

- [ ] Create `src/services/user/` directory
- [ ] Extract visibility-related pure helpers:
  - [ ] user context lookup wrapper if appropriate
  - [ ] category visibility query builder
  - [ ] course visibility query builder
  - [ ] announcement visibility query builder
  - [ ] access predicate helpers
- [ ] Extract document-related pure helpers:
  - [ ] content URL parsing
  - [ ] file name resolution
  - [ ] preview metadata generation
  - [ ] access token payload helpers
- [ ] Extract reward summary helper for course points/quiz points
- [ ] Update `user.service.js` imports to use extracted modules
- [ ] Keep public exports unchanged

### Verification

- [ ] `elearning-api`: `npm test`
- [ ] Manually compare key response fields before/after for:
  - [ ] `getCourses`
  - [ ] `getCourseDetails`
  - [ ] `getAnnouncements`
  - [ ] `getAnnouncementDetails`

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

### Tasks

- [ ] Extract course summary serializer
- [ ] Extract course detail serializer
- [ ] Extract announcement summary/detail serializer
- [ ] Remove inline response shaping blocks from `user.service.js`
- [ ] Ensure serializer naming reflects API contract intent
- [ ] Keep serializer logic domain-local, not under global `utils`

### Verification

- [ ] `elearning-api`: `npm test`
- [ ] Snapshot or manually diff serialized responses for:
  - [ ] course list
  - [ ] course details
  - [ ] announcements list
  - [ ] announcement details

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

### Tasks

- [ ] Extract `updateProfile`
- [ ] Extract `enrollCourse`
- [ ] Extract `updateLessonProgress`
- [ ] Extract `submitQuiz`
- [ ] Extract `requestRedeem`
- [ ] Keep points-ledger behavior identical
- [ ] Keep course-completion rules identical
- [ ] Keep exported interface from facade unchanged

### Verification

- [ ] `elearning-api`: `npm test`
- [ ] Manual flow test:
  - [ ] enroll in a course
  - [ ] complete a normal lesson
  - [ ] pass a quiz
  - [ ] complete a course and verify awarded points
  - [ ] redeem a reward and verify stock/balance

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

### Tasks

- [ ] Create `src/components/admin/category/` folder
- [ ] Move form defaults and small UI helpers into `categoryForm.utils.js`
- [ ] Extract icon picker UI into `CategoryIconPicker.jsx`
- [ ] Extract visibility chooser into `CategoryVisibilityEditor.jsx`
- [ ] Extract list container into `CategoryList.jsx`
- [ ] Extract row rendering into `CategoryListItem.jsx`
- [ ] Keep submit/archive/delete/reorder handlers in the container on first pass
- [ ] Update imports for parent callers if file location changes

### Verification

- [ ] `elearning-webapp`: `npm run lint`
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

### Tasks

- [ ] Identify repeated Prisma include/select/order shapes in `admin.service.js`
- [ ] Extract query builder helpers where repetition is real
- [ ] Extract response shaping helpers/serializers by domain
- [ ] Keep serializers admin-local
- [ ] Remove repeated inline shaping blocks from `admin.service.js`

### Verification

- [ ] `elearning-api`: `npm test`
- [ ] Manually verify unchanged payload shape for:
  - [ ] dashboard stats
  - [ ] category data
  - [ ] user admin lists/details
  - [ ] course admin payloads touched in this PR

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

### Tasks

- [ ] Extract category CRUD/reorder/archive/republish flows
- [ ] Extract reward catalog and redemption admin flows
- [ ] Extract low-risk course metadata/admin operations if clearly isolated
- [ ] Keep `admin.service.js` as a compatibility facade

### Verification

- [ ] `elearning-api`: `npm test`
- [ ] Manual admin verification:
  - [ ] category management still works
  - [ ] reward admin flow still works
  - [ ] any moved course admin operation still works

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

### Tasks

- [ ] Extract user listing and detail flows
- [ ] Extract status update flows
- [ ] Extract department/tier-related admin user workflows
- [ ] Preserve role/authorization assumptions currently enforced

### Verification

- [ ] `elearning-api`: `npm test`
- [ ] Manual admin verification:
  - [ ] user list loads
  - [ ] user details load
  - [ ] status updates work
  - [ ] sorting/filtering expectations still hold

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

### Tasks

- [ ] Extract dashboard stats generation
- [ ] Extract advanced analytics generation
- [ ] Extract at-risk learner logic
- [ ] Extract analytics-specific cache helpers if needed
- [ ] Keep response contracts unchanged
- [ ] Preserve filter semantics for month/year/department

### Verification

- [ ] `elearning-api`: `npm test`
- [ ] Manual checks:
  - [ ] dashboard loads for full admin
  - [ ] dashboard loads for manager view
  - [ ] department filter works
  - [ ] period filter works
  - [ ] drill-down insights still work
- [ ] Compare response time before/after extraction if possible

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

- [ ] Extract data-fetching hook if repetition/pain is still high
- [ ] Extract filter bar if it still feels too dense
- [ ] Extract print/report helpers if they are cluttering the page component
- [ ] Review `handleViewGoalReport` for reuse/caching opportunities

### Tasks for `GoalManagement.jsx`

- [ ] Extract goal report fetching hook if useful
- [ ] Consolidate modal/form reset helpers
- [ ] Review filter logic readability
- [ ] Keep current good decomposition with `GoalList`, `CreateGoalModal`, `GoalReportModal`

### Verification

- [ ] `elearning-webapp`: `npm run lint`
- [ ] Manual checks:
  - [ ] dashboard filters and print still work
  - [ ] goal create/edit/delete/archive still work
  - [ ] goal report still opens and closes correctly

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

## Suggested Definition of Done for the Refactor Track

- [ ] `user.service.js` is reduced to a thin facade/orchestrator
- [ ] `admin.service.js` is reduced to a thin facade/orchestrator
- [ ] `CategoryManagementModal.jsx` is decomposed into focused subcomponents
- [ ] No shared god utility file was introduced
- [ ] Critical user/admin flows were manually verified
- [ ] Existing scripts still pass:
  - [ ] `elearning-api`: `npm test`
  - [ ] `elearning-webapp`: `npm run lint`
