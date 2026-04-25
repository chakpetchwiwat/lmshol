# Project Changelog - Scaleup KM

All notable changes to this project will be documented in this file.

## [2026-04-26] - Dashboard Optimization & CI Setup

### Added
- **E2E Testing & CI**: Integrated Playwright for automated UI testing and established a GitHub Actions workflow (`playwright.yml`) to run tests on push and pull requests.
- **Goal Tracking Summary API**: Created a new aggregated endpoint (`/api/goals/tracking-summary`) and service (`goal.tracking.js`) to drastically reduce API payload size and network requests on the Admin Dashboard.

### Fixed
- **Dashboard Goal Tracking 429 Errors**: Refactored `useDashboardData` to fetch goal summaries from a single endpoint instead of looping through all individual goal reports.
- **Express Route Ordering (404 Error)**: Fixed a routing conflict where `/:id` was intercepting `/tracking-summary` in `goal.routes.js`.
- **Insight Widget Missing Data**: 
    - Fixed missing Goal titles in the "Risk Identification Widget" (`goalTitle` vs `courseTitle` mismatch).
    - Fixed missing Tier/Position data in the "Department Insight Widget" by updating the Prisma query in `admin.analytics.advanced.js` to correctly fetch `tier` and `tierRef` relationships.

## [2026-04-24] - Phase 2.3: Backend Service Modularization

### Added
- **Goal Notifications**: Added support for "Immediately" (0 days) reminders for goal assignments.
- **Frontend UI**: Updated `CreateGoalModal.jsx` to include the "แจ้งทันที (Immediately)" option for reminders.
- **Phase 2.1: Project Standardization**: Completed final audit of frontend components and backend standardization. `CategoryManagementModal` was confirmed to be properly decomposed, and the API layer is fully standardized through the new Facade pattern.
- **New Modular Services**:
    - `elearning-api/src/services/goal/`: `goal.crud.js`, `goal.reports.js`, `goal.notifications.js`.
    - `elearning-api/src/services/user/`: `user.courses.js`, `user.announcements.js`, `user.notifications.js`, `user.points.js`.
    - `elearning-api/src/services/admin/courses/`: `admin.courses.crud.js`, `admin.lessons.js`, `admin.courses.history.js`.
    - `elearning-api/src/services/admin/users/`: `admin.users.crud.js`, `admin.users.details.js`.

### Fixed
- **Thai Language Encoding**: Resolved Mojibake issues in `user.rewards.js` and other refactored services, ensuring correct UTF-8 encoding for Thai error messages.
- **Modal Clipping**: Fixed UI issues where action menus were clipped inside scrollable containers in `UserDetailModal` and `CourseAttendanceModal`.

### Refactored
- **Service Facade Transformation**: Converted monolithic "God Files" into lean Facades to improve maintainability and domain separation:
    - `admin.analytics.js`: Decomposed into Dashboard, Advanced, At-Risk, and Engine modules.
    - `user.service.js`: Decomposed into 7 domain-specific modules.
    - `goal.service.js`: Decomposed into CRUD, Reports, and Notifications modules.
    - `admin.courses.js`: Decomposed into Course CRUD, Lessons, and History modules.
    - `admin.users.js`: Decomposed into User CRUD and Details modules.
- **Admin Analytics Engine**: Centralized caching and time-calculation logic to reduce redundancy across analytics modules.

## [2026-04-24] - Hotfix: Service Stabilization & UI Refactoring

### Fixed
- **Critical Path Resolution Error**: Resolved 500 Internal Server Errors in Admin Dashboard by correcting relative paths in `goal` and `user` service modules.
- **Service Loading Integrity**: Verified all refactored services load correctly through automated runtime testing.

### Refactored (Frontend)
- **Centralized Skeleton Loading**: 
    - Created a unified `Skeleton` compound component architecture with semantic variants: `Dashboard`, `LessonPlayer`, `CourseCard`, `Home`, `CourseDetail`, `List`, and `Page`.
    - Replaced legacy loading spinners across 15+ pages including: `Home`, `Dashboard`, `LessonPlayer`, `AnnouncementPlayer`, `CourseList`, `CourseDetail`, `Rewards`, `Profile`, `PointsHistory`, `GoalManagement`, `RewardsManagement`, and `SystemSettings`.
    - Integrated `Skeleton.Page` into the global `App.jsx` Suspense fallback for smooth route transitions.
- **Course Management Decomposition**: 
    - Extracted course publishing and draft saving logic into a dedicated `useCoursePublishing` hook.
    - Modularized Course Builder actions into `CourseBuilderFooter` for better code reuse and clarity.
    - Standardized `ENTITY_STATUS` usage across the course management workflow.
- **Goal Management**: Integrated "แจ้งทันที (Immediately)" reminder logic into the notification pipeline.

---
*End of Phase 2.3 & Stabilization updates.*
