# Fixture Capture Plan

This plan turns the contract skeletons into concrete capture work for PR 1.

## Prerequisites

- API server running locally or stable target environment available
- valid bearer tokens for:
  - `USER_TOKEN`
  - `ADMIN_TOKEN`
  - `SUPERADMIN_TOKEN`
- `CONTRACT_BASE_URL` set to the API origin, for example:
  - `http://localhost:5000`
- a filled-in copy of `capture-config.example.json` saved as `.planning/refactor/capture-config.json`

## Suggested Command Flow

### 1. Validate fixture readiness

Run from `elearning-api/`:

```powershell
node scripts/compare_refactor_contracts.js
```

Use this first to see which fixtures still contain placeholders.

### 2. Fill capture config

Copy:

```text
.planning/refactor/capture-config.example.json
```

to:

```text
.planning/refactor/capture-config.json
```

Then replace placeholder route params and query values with real IDs/filter values.

### 3. Capture live projected contract fields

Run from `elearning-api/`:

```powershell
$env:CONTRACT_BASE_URL='http://localhost:5000'
$env:USER_TOKEN='replace-me'
$env:ADMIN_TOKEN='replace-me'
$env:SUPERADMIN_TOKEN='replace-me'
node scripts/compare_refactor_contracts.js --mode capture
```

This prints the projected frozen fields for each capture-ready fixture.

### 4. Copy stable output back into fixtures

- update `capture` metadata
- replace the placeholder `sample` with a curated stable sample if desired
- keep only intentionally frozen fields

## Fixture-by-Fixture Plan

### User

#### `course-list.json`

- endpoint: `GET /api/user/courses`
- token: `USER_TOKEN`
- target user:
  - sees multiple visible categories
  - has at least one enrolled and one not-enrolled course

#### `course-detail.json`

- endpoint: `GET /api/user/courses/:id`
- token: `USER_TOKEN`
- target course:
  - user is enrolled
  - contains at least one quiz lesson
  - contains at least one protected document lesson

#### `announcement-list.json`

- endpoint: `GET /api/user/announcements`
- token: `USER_TOKEN`
- target user:
  - can see both global and scoped announcements if possible

#### `announcement-detail.json`

- endpoint: `GET /api/user/announcements/:id`
- token: `USER_TOKEN`
- target announcement:
  - ideally has either quiz or protected document behavior
  - safe to re-open because it records attendance/view

#### `notifications.json`

- endpoint: `GET /api/user/notifications`
- token: `USER_TOKEN`
- target user:
  - has at least one unread notification
  - has at least one previously read notification if possible

### Admin

#### `dashboard-stats.json`

- endpoint: `GET /api/admin/dashboard`
- token: `ADMIN_TOKEN` or `SUPERADMIN_TOKEN`
- capture at least:
  - one unscoped admin example
  - one manager/department-scoped example later if available

#### `advanced-analytics.json`

- endpoint: `GET /api/admin/analytics`
- token: `ADMIN_TOKEN` or `SUPERADMIN_TOKEN`
- use the same period filters as dashboard stats when possible

#### `admin-user-detail.json`

- endpoint: `GET /api/admin/users/:id/details`
- token: `ADMIN_TOKEN` or `SUPERADMIN_TOKEN`
- target user:
  - has enrollments
  - has points history
  - ideally has both completed and in-progress courses

#### `category-list.json`

- endpoint: `GET /api/admin/categories`
- token: `SUPERADMIN_TOKEN`
- target dataset:
  - active categories
  - temporary/expired categories if possible
  - mixed visibility rules

#### `course-history.json`

- endpoint: `GET /api/admin/courses/:id/history`
- token: `SUPERADMIN_TOKEN`
- capture at least:
  - `dateField=startedAt`
  - a second variant with `dateField=completedAt` later if needed
- target course:
  - has enrollments in mixed states

#### `announcement-history.json`

- endpoint: `GET /api/admin/announcements/:id/history`
- token: `ADMIN_TOKEN` or `SUPERADMIN_TOKEN`
- target announcement:
  - has at least one attendance record
  - ideally includes quiz score/pass data

## Output Review Rules

- freeze field presence and structure first
- only freeze exact values when they are stable across environments
- if order matters to UI behavior, note it explicitly in the fixture notes
- if a field is intentionally volatile, exclude it and explain why

## Recommended Next Implementation Step

After the first real captures land:

1. add a normalizer for volatile values if needed
2. compare projected live output against stored projected fixture values
3. hook the script into a dedicated lightweight CI step for refactor PRs
