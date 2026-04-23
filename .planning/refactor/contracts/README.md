# Refactor Contract Fixtures

This folder contains contract fixture skeletons for the refactor track.

## Goal

- freeze high-risk API response shapes before service extraction
- give each refactor PR a repeatable place to compare outputs
- reduce arguments about what is "behavior-preserving"

## How To Use

1. Pick one protected payload from `service-surface-inventory.md`
2. Capture a real response from a stable environment or seeded local database
3. Store only the fields that are intentionally frozen for refactor safety
4. Update the `capture` metadata in the fixture file
5. Link the fixture name in the PR description when a refactor touches that payload

## Fixture Rules

- Prefer stable IDs from seed data where possible
- Record request path, query params, auth role, and data source assumptions
- If a field is intentionally excluded because it is volatile, note that in `notes`
- Do not use these files as golden copies for new features without review

## Initial Fixture Targets

- `course-list.json`
- `course-detail.json`
- `announcement-list.json`
- `announcement-detail.json`
- `notifications.json`
- `dashboard-stats.json`
- `advanced-analytics.json`
- `admin-user-detail.json`
- `category-list.json`
- `course-history.json`
- `announcement-history.json`
