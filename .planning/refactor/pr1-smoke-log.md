# PR 1 Smoke Log

Last updated: 2026-04-23

This log records the manual and API-driven smoke checks executed to close PR 1.

## Environment

- API base URL: `http://localhost:5000`
- dataset: local server against seeded demo data
- checked by: Codex

## Admin and Reporting Flows

- `GET /api/admin/dashboard`
  - status: `200`
  - verified manager-scoped filters with `month=4`, `year=2026`, `departmentId=b46b89e3-87cb-4965-a3de-646dcc528f2d`
- `GET /api/admin/analytics`
  - status: `200`
  - verified manager-scoped analytics sections load
- `GET /api/admin/users/:id/details`
  - status: `200`
  - verified with admin token for `user37@scaleup-demo.co.th`
- `GET /api/admin/courses/:id/history`
  - status: `200`
  - verified `dateField=startedAt`
- `GET /api/admin/announcements/:id/history`
  - status: `200`
  - verified attendance rows load
- `GET /api/goals`
  - status: `200`
- `GET /api/goals/:id/report`
  - status: `200`
  - verified goal report payload loads with non-empty rows

## Category Workflow Smoke

Executed with a temporary category that was created and deleted during the same check.

- `GET /api/admin/categories`
  - status: `200`
- `POST /api/admin/categories`
  - status: `201`
- `PUT /api/admin/categories/:id`
  - status: `200`
- `PUT /api/admin/categories/:id/archive`
  - status: `200`
- `PUT /api/admin/categories/:id/republish`
  - status: `200`
- `PUT /api/admin/categories/reorder`
  - status: `200`
- `DELETE /api/admin/categories/:id`
  - status: `200`

## User Flow Smoke

- `GET /api/user/courses`
  - status: `200`
  - verified visible course list loads for fixture users
- `GET /api/user/courses/:id`
  - status: `200`
  - verified enrolled course detail loads
- `POST /api/user/courses/:id/enroll`
  - status: `200`
  - verified user `user13@scaleup-demo.co.th` can enroll in a visible course
- `PUT /api/user/lessons/:id/progress`
  - status: `200`
  - verified lesson progress update to `100`
- `GET /api/user/lessons/:id/questions`
  - status: `200`
- `POST /api/user/lessons/:id/quiz`
  - status: `200`
  - verified passing quiz attempt
  - verified course completion flips enrollment to `COMPLETED`
  - verified completion timestamp is set
- `GET /api/user/points`
  - status: `200`
  - verified completed course produced a points balance increase
- `GET /api/user/announcements`
  - status: `200`
  - verified with IT user fixture
- `GET /api/user/announcements/:id`
  - status: `200`
- `GET /api/user/notifications`
  - status: `200`

## Reward Flow Smoke

- `GET /api/user/rewards`
  - status: `200`
- `POST /api/user/redeem/:id`
  - insufficient balance case:
    - status: rejected as expected
    - message contained `Insufficient points`
- `POST /api/user/redeem/:id`
  - success case after course completion:
    - status: `200`
    - redeem request created with `PENDING`
- `PUT /api/admin/redeems/:id/status`
  - status: `200`
  - request updated for cleanup
- cleanup verification:
  - user balance returned to `300`
  - reward stock returned to `47`

## Contract Guardrails

- `npm.cmd run test:refactor-contracts`
  - status: pass
  - result: `invalidCount = 0`
- capture mode
  - all 11 fixture files returned `200` during live projection

## Notes

- For announcement fixtures, `user13@scaleup-demo.co.th` was used because the original user fixture had no visible announcements.
- For admin-user-detail and superadmin-style fixtures, the admin seed account was used to avoid manager-scope false negatives.
