# Project Changelog - Scaleup KM

All notable changes to this project will be documented in this file.


## [2026-05-07] - Certificate Rendering & Signature Pad

### Added
- **Web Signature Pad (Organization Preset)**: 
    - Integrated an interactive drawing canvas in the `OrganizationPresetModal`.
    - Supports pressure-sensitive signing with automatic normalization to standard size (1000 x 300 px).
    - Automatic transparent background enforcement for professional-grade PDF integration.
- **Advanced Storage Path Resolution**:
    - Developed a robust `getFullUrl` helper in `certificatePdf.service.js` to handle complex storage path formats (relative, `/uploads/`, and Supabase internal object paths).
    - Improved image fetching with custom `User-Agent` and `Accept` headers to bypass CDN blocks.

### Fixed
- **Certificate Metadata Stale-Sync**: 
    - Resolved a critical issue where "Reissue" would use old organization data.
    - Updated `generateCertificatePdfAsync` to dynamically resolve latest presets during the generation process.
- **Organization Stamp Visibility**: 
    - Fixed a bug where stamps failed to render on PDF certificates due to malformed URLs.
    - Adjusted stamp positioning and layering logic to ensure proper visibility across all templates (Classic, Modern, Minimal).
- **Signer Metadata Robustness**: 
    - Improved the backend resolver to correctly merge organization preset names and titles even when course-specific slots are empty.
    - Added defensive trimming and fallback defaults for organizational signature blocks.

### Improved
- **PDF Visual Aesthetics**: 
    - Adjusted stamp size (42px -> 55px) and alignment for a more balanced "Official" look.
    - Increased signature area width to prevent text/image overlap in multi-signer scenarios.


### Added
- **Centralized Assessment Grading Dashboard**: 
    - Created a new "ตรวจงาน" (Assessment Grading) menu for instructors and admins to manage all submissions across the platform in a single view.
    - Implemented advanced filtering by status (Waiting, Passed, All) and real-time learner search.
- **Individual User Certification History**:
    - Integrated a "เกียรติบัตรของพนักงาน" (Staff Certificates) section in the User Detail Modal.
    - Unified display of system-generated certificates and manually added external records.
    - Added quick-view functionality to open certificate files directly from the modal.
- **Multi-Section PDF Reporting**:
    - Upgraded `printUtils.js` to support "Sections", allowing multiple data tables to be rendered in a single PDF report.
    - Integrated certificate history into the "User Detail" PDF report alongside learning history and points.
- **UI/UX Enhancements**:
    - **Grading Modal**: Expanded to `max-w-4xl` for a more spacious and professional reviewing environment.
    - **Manual Issuance Modal**: Increased size and added a live search feature to easily find eligible learners.

### Fixed
- **API Reference Errors**: Resolved a critical bug where `AssessmentService` was not imported in the admin controller.
- **Role Permission Logic**: Fixed missing exports of `isAdmin` and `isManager` helpers in the permission utility.
- **Prisma Enum Case Sensitivity**: Corrected `StaffRole` query values to uppercase to match the database schema and prevent 500 errors.
- **Assessment Max Score Sync**: Updated the grading logic to always prioritize the current lesson's max score over stale submission data.

## [2026-04-27] - Certificate System (E2E) & Operational Hardening

### Added
- **Automated Certificate Issuance**: Implemented automatic certificate generation when a learner completes a course (`ENROLLMENT_STATUS.COMPLETED`).
- **PDF Generation Engine**: Integrated Puppeteer for high-fidelity HTML-to-PDF conversion with custom layout support (Landscape/A4).
- **Public Verification Portal**: Created a professional public verification page (`/certificates/verify/:token`) with secure validation logic and status badges.
- **Admin Certificate Management Tab**: Added a "หนังสือรับรอง" (Certificates) tab to the Admin Course Modal with summary statistics, search, and action controls.
- **Manual Issue & Recovery**: 
    - Added a manual certificate issuance tool for administrators.
    - Implemented a **Retry Mechanism** for `FAILED` certificate generations with error tracking and retry counters.
- **Operational Hardening & Security**:
    - **Private Storage**: Certificates are now stored in private Supabase buckets; permanent public URLs have been removed.
    - **Temporary Signed URLs**: Implemented secure, short-lived (5 min) signed URLs for certificate downloads, with strict ownership and permission checks.
    - **Structured Logging**: Added a centralized `[Certificate]` logging system for monitoring lifecycle events (issue, pdf_start, pdf_success, retry, revoked).

### Fixed
- **Case Sensitivity in Auto-Issue**: Fixed a bug where `COMPLETED` status in lowercase was ignored by the issuance hook.
- **Legacy URL Compatibility**: Added a path extraction helper to handle certificates issued before the storage hardening update.
- **Revocation Workflow**: Updated the revocation process to allow default reasons, preventing API errors when no manual input is provided.

### Refactored
- **Learner Certificate UI**: Refactored `ProfileCertificates.jsx` into a tabbed interface separating system-issued LMS certificates from external manual records.
- **Thai Language Localization**: Standardized all Thai labels across the certificate system (e.g., "ชื่ออบรม", "หน่วยงาน", "วันที่ออกเกียรติบัตร").


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
