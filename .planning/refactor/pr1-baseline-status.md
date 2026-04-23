# PR 1 Baseline Status

Last updated: 2026-04-23

This note records what has actually been captured for the refactor guardrails so PR 1 can be evaluated against real baseline evidence instead of checklist intent alone.

## What Is Ready

- public surface inventory exists in `.planning/refactor/service-surface-inventory.md`
- contract fixtures scaffold exists in `.planning/refactor/contracts/`
- capture helper exists in `elearning-api/scripts/compare_refactor_contracts.js`
- local capture config exists in `.planning/refactor/capture-config.json`
- manual QA checklist exists in `.planning/refactor/manual-qa-checklist.md`

## Captured Baselines

All initial contract fixtures were successfully projected against the local seeded API at `http://localhost:5000` on 2026-04-23:

- `admin-user-detail.json`
- `announcement-list.json`
- `announcement-detail.json`
- `announcement-history.json`
- `category-list.json`
- `course-list.json`
- `course-detail.json`
- `course-history.json`
- `dashboard-stats.json`
- `advanced-analytics.json`
- `notifications.json`

## Baseline Notes

### `course-list.json`

- auth role: `user`
- outcome: HTTP `200`
- capture intent proved:
  - enrolled and non-enrolled courses are both present
  - enrollment state and progress fields are stable enough to freeze
  - category payload shape is present on every returned course in the baseline set

### `course-detail.json`

- auth role: `user`
- route param:
  - `id=demo-course-1776772867292-24`
- outcome: HTTP `200`
- capture intent proved:
  - enrolled course detail is reachable with seeded data
  - lesson ordering is stable in the captured projection
  - quiz metadata fields such as `bestScore` and `questionCount` are present

### `dashboard-stats.json`

- auth role: `admin-or-manager`
- query:
  - `month=4`
  - `year=2026`
  - `departmentId=b46b89e3-87cb-4965-a3de-646dcc528f2d`
- outcome: HTTP `200`
- capture intent proved:
  - manager-scoped dashboard payload is reachable
  - top-level KPI fields are present
  - nested activity arrays and drill-down details are populated in the baseline environment

### `advanced-analytics.json`

- auth role: `admin-or-manager`
- query:
  - `month=4`
  - `year=2026`
  - `departmentId=b46b89e3-87cb-4965-a3de-646dcc528f2d`
- outcome: HTTP `200`
- capture intent proved:
  - analytics sections are reachable with manager scope
  - section families such as `skillGap`, `benchmarking`, `atRisk`, `categoryDistribution`, and `roiTrend` are present

## Fixture Strategy Decision

- projected live payloads are being kept as capture evidence rather than copied wholesale back into fixture `sample` blocks
- fixture files remain intentionally curated and lightweight
- execution evidence now lives in `.planning/refactor/pr1-smoke-log.md`

## Verification Run Notes

- `2026-04-23`: `npm.cmd test` passed in `elearning-api`
- `2026-04-23`: `npm.cmd run lint` completed in `elearning-webapp`
- `2026-04-23`: `npm.cmd run test:refactor-contracts` passed with `invalidCount = 0`
- `2026-04-23`: API-driven smoke checks completed and recorded in `.planning/refactor/pr1-smoke-log.md`

## PR 1 Closure

PR 1 is now closed. The guardrail package includes:

- frozen service surface inventory
- capture-ready contract fixtures with no placeholder validation failures
- a repeatable validation/capture script
- clean frontend lint and passing API tests
- live baseline capture across all initial fixture targets
- smoke evidence for category workflow, goal reporting, enroll, lesson progress, quiz submission, rewards, announcements, and notifications

This is a strong enough baseline to start PR 2 with measurable regression protection.
