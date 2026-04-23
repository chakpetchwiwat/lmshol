# Service Surface Inventory

This document freezes the current controller-facing service surface before the refactor track begins.

## Purpose

- define which exported service methods are part of the protected facade
- map controller handlers to service calls
- identify high-risk payloads consumed directly by the webapp
- make scope reduction easier when a refactor PR starts drifting

## Rules

- Unless a PR explicitly says otherwise, exported method names below are protected
- Controller import paths for `user.service.js` and `admin.service.js` are protected
- Payload shapes listed under "High-Risk Contracts" should be treated as frozen until dedicated contract updates exist

---

## User Service Facade

Source: `elearning-api/src/services/user.service.js`

### Exported Methods

- `getCourses(userId)`
- `getAnnouncements(userId)`
- `updateProfile(userId, data)`
- `getCourseDetails(courseId, userId)`
- `getAnnouncementDetails(announcementId, userId)`
- `enrollCourse(userId, courseId)`
- `updateLessonProgress(userId, lessonId, progress)`
- `submitQuiz(userId, lessonId, answers)`
- `submitAnnouncementQuiz(userId, announcementId, answers)`
- `getPointsHistory(userId)`
- `getRewardsData(userId)`
- `requestRedeem(userId, rewardId)`
- `getCategories(userId)`
- `getLessonQuestions(lessonId)`
- `getAnnouncementQuestions(announcementId, userId)`
- `getLessonDocumentAccess(userId, lessonId)`
- `getLessonDocumentStream(lessonId, token)`
- `getAnnouncementDocumentAccess(userId, announcementId)`
- `getAnnouncementDocumentStream(announcementId, token)`
- `getNotifications(userId)`
- `markNotificationAsRead(userId, notificationId)`
- `markAllNotificationsAsRead(userId)`
- `clearAllNotifications(userId)`

### Controller-to-Service Map

Source: `elearning-api/src/controllers/user.controller.js`

| Controller Handler | Service Method | Notes |
| --- | --- | --- |
| `getCourses` | `getCourses` | course list visibility + enrollment summary |
| `getAnnouncements` | `getAnnouncements` | announcement visibility |
| `updateProfile` | `updateProfile` | password update path included |
| `getCourseDetails` | `getCourseDetails` | course detail shaping |
| `getAnnouncementDetails` | `getAnnouncementDetails` | also records attendance/view |
| `enrollCourse` | `enrollCourse` | creates enrollment + started timestamp |
| `updateLessonProgress` | `updateLessonProgress` | high-risk transactional flow |
| `submitQuiz` | `submitQuiz` | high-risk transactional flow |
| `submitAnnouncementQuiz` | `submitAnnouncementQuiz` | announcement quiz scoring |
| `getPointsHistory` | `getPointsHistory` | balance + ledger history |
| `getRewards` | `getRewardsData` | controller name differs from service |
| `requestRedeem` | `requestRedeem` | high-risk transaction |
| `getCategories` | `getCategories` | visibility-filtered category list |
| `getLessonQuestions` | `getLessonQuestions` | quiz metadata/questions |
| `getAnnouncementQuestions` | `getAnnouncementQuestions` | announcement quiz questions |
| `getLessonDocumentAccess` | `getLessonDocumentAccess` | secure doc token/access URL |
| `getLessonDocumentStream` | `getLessonDocumentStream` | streaming response, not plain JSON |
| `getAnnouncementDocumentAccess` | `getAnnouncementDocumentAccess` | secure doc token/access URL |
| `getAnnouncementDocumentStream` | `getAnnouncementDocumentStream` | streaming response, not plain JSON |
| `getNotifications` | `getNotifications` | notification list + unread count |
| `markNotificationAsRead` | `markNotificationAsRead` | notification mutation |
| `markAllNotificationsAsRead` | `markAllNotificationsAsRead` | notification mutation |
| `clearAllNotifications` | `clearAllNotifications` | destructive notification mutation |

### Natural Internal Domains

- visibility/access helpers
- document security and streaming
- course list/detail shaping
- announcement list/detail shaping
- enrollment/progress/quiz flows
- rewards and points ledger
- notifications
- profile/account

### High-Risk Contracts

- `getCourses`
  - visibility filtering
  - enrollment summary fields like `isEnrolled`, `enrollmentStatus`, `progressPercent`, `completedAt`
  - reward summary fields like `completionPoints`, `quizPoints`, `totalPoints`
- `getCourseDetails`
  - lesson shaping
  - secure document flags like `hasDocument`
  - enrollment fields and reward summary
- `getAnnouncementDetails`
  - attendance side effect on read
  - document visibility flags
- `updateLessonProgress`
  - lesson completion
  - enrollment completion
  - course points award side effects
- `submitQuiz`
  - score calculation
  - pass/fail semantics
  - quiz points + course completion points
- `requestRedeem`
  - user balance validation
  - stock decrement
  - points ledger debit
- `getNotifications`
  - payload shape for `unreadCount` and `items`

### Suggested First Refactor Boundaries

- pure helpers first:
  - document URL parsing and preview metadata
  - visibility builders
  - reward summary helper
- serializers second:
  - course summary/detail
  - announcement summary/detail
- transactions last:
  - `updateLessonProgress`
  - `submitQuiz`
  - `requestRedeem`

---

## Admin Service Facade

Source: `elearning-api/src/services/admin.service.js`

### Exported Methods

- `getDashboardStats(authUser, filters)`
- `getAdvancedAnalytics(authUser, filters)`
- `getUsers(authUser)`
- `getUserDetails(id, authUser)`
- `createUser(inputData)`
- `updateUser(id, inputData)`
- `deleteUser(id)`
- `getDepartments(authUser)`
- `createDepartment(data)`
- `updateDepartment(id, data)`
- `deleteDepartment(id)`
- `getTiers(authUser)`
- `createTier(data)`
- `updateTier(id, data)`
- `deleteTier(id)`
- `reorderTiers(tierIds)`
- `getInstructorPresets()`
- `createInstructorPreset(input)`
- `updateInstructorPreset(id, input)`
- `deleteInstructorPreset(id)`
- `getAdminCourses()`
- `createCourse(input)`
- `updateCourse(id, input)`
- `republishCourse(id)`
- `archiveCourse(id)`
- `getCourseHistory(courseId, filters)`
- `deleteCourse(id)`
- `getAdminAnnouncements(authUser)`
- `createAnnouncement(authUser, input)`
- `updateAnnouncement(id, authUser, input)`
- `deleteAnnouncement(id, authUser)`
- `archiveAnnouncement(id, authUser)`
- `republishAnnouncement(id, authUser)`
- `getAnnouncementHistory(id, authUser)`
- `getCategories()`
- `createCategory(input)`
- `updateCategory(id, input)`
- `republishCategory(id)`
- `archiveCategory(id)`
- `deleteCategory(id)`
- `reorderCategories(categoryIds)`
- `getAdminRewards()`
- `createReward(data)`
- `updateReward(id, data)`
- `deleteReward(id)`
- `getRedeemRequests()`
- `updateRedeemStatus(id, status, adminNote)`
- `getCourseLessons(courseId)`
- `createLesson(data)`
- `updateLesson(id, data)`
- `deleteLesson(id)`
- `reorderLessons(lessonIds)`
- `getCourseQuizAttempts(courseId)`

### Controller-to-Service Map

Source: `elearning-api/src/controllers/admin.controller.js`

| Controller Handler | Service Method | Notes |
| --- | --- | --- |
| `getDashboardStats` | `getDashboardStats` | cache + timing-sensitive |
| `getAdvancedAnalytics` | `getAdvancedAnalytics` | cache + timing-sensitive |
| `getUsers` | `getUsers` | role-scoped visibility |
| `getUserDetails` | `getUserDetails` | includes enrollments + point history shaping |
| `createUser` | `createUser` | user mutation |
| `updateUser` | `updateUser` | user mutation |
| `deleteUser` | `deleteUser` | controller has self-delete guard |
| `getDepartments` | `getDepartments` | role-aware listing |
| `createDepartment` | `createDepartment` | simple reference data |
| `updateDepartment` | `updateDepartment` | simple reference data |
| `deleteDepartment` | `deleteDepartment` | simple reference data |
| `getTiers` | `getTiers` | role-aware listing |
| `createTier` | `createTier` | simple reference data |
| `updateTier` | `updateTier` | simple reference data |
| `deleteTier` | `deleteTier` | simple reference data |
| `reorderTiers` | `reorderTiers` | ordering mutation |
| `getInstructorPresets` | `getInstructorPresets` | reference data |
| `createInstructorPreset` | `createInstructorPreset` | reference data |
| `updateInstructorPreset` | `updateInstructorPreset` | reference data |
| `deleteInstructorPreset` | `deleteInstructorPreset` | reference data |
| `getAdminCourses` | `getAdminCourses` | admin course listing |
| `createCourse` | `createCourse` | transactional mutation |
| `updateCourse` | `updateCourse` | transactional mutation |
| `republishCourse` | `republishCourse` | archive lifecycle |
| `archiveCourse` | `archiveCourse` | archive lifecycle |
| `getCourseHistory` | `getCourseHistory` | drill-down reporting |
| `deleteCourse` | `deleteCourse` | destructive mutation |
| `getAdminAnnouncements` | `getAdminAnnouncements` | actor-scoped listing |
| `createAnnouncement` | `createAnnouncement` | transactional mutation |
| `updateAnnouncement` | `updateAnnouncement` | transactional mutation |
| `deleteAnnouncement` | `deleteAnnouncement` | destructive mutation |
| `archiveAnnouncement` | `archiveAnnouncement` | archive lifecycle |
| `republishAnnouncement` | `republishAnnouncement` | archive lifecycle |
| `getAnnouncementHistory` | `getAnnouncementHistory` | cached reporting |
| `getCategories` | `getCategories` | category admin listing |
| `createCategory` | `createCategory` | transactional mutation |
| `updateCategory` | `updateCategory` | transactional mutation |
| `republishCategory` | `republishCategory` | archive lifecycle |
| `archiveCategory` | `archiveCategory` | archive lifecycle |
| `deleteCategory` | `deleteCategory` | destructive mutation |
| `reorderCategories` | `reorderCategories` | ordering mutation |
| `getAdminRewards` | `getAdminRewards` | reward catalog admin |
| `createReward` | `createReward` | reward mutation |
| `updateReward` | `updateReward` | reward mutation |
| `deleteReward` | `deleteReward` | destructive mutation |
| `getRedeemRequests` | `getRedeemRequests` | redemption admin |
| `updateRedeemStatus` | `updateRedeemStatus` | high-risk transaction |
| `getCourseLessons` | `getCourseLessons` | lesson list/detail |
| `createLesson` | `createLesson` | lesson mutation |
| `updateLesson` | `updateLesson` | lesson mutation |
| `deleteLesson` | `deleteLesson` | destructive mutation |
| `reorderLessons` | `reorderLessons` | ordering mutation |
| `getCourseQuizAttempts` | `getCourseQuizAttempts` | reporting/query-heavy |

### Natural Internal Domains

- dashboard stats and advanced analytics
- user administration and tracking details
- departments / tiers / instructor presets
- courses and course reporting
- announcements and announcement history
- categories and visibility
- rewards and redeem workflow
- lessons and quiz reporting

### High-Risk Contracts

- `getDashboardStats`
  - summary cards
  - learner progress widgets
  - goal overview / at-risk learner payloads
  - manager-scoped filtering behavior
- `getAdvancedAnalytics`
  - benchmarking payloads
  - skill gap / category reporting
  - ROI or completion trend data
- `getUserDetails`
  - enrollments
  - point history shaping
  - tracking summary fields used by admin modal
- `getCourseHistory`
  - date filtering semantics
  - support for `startedAt` vs `completedAt`
  - records for not-started users
- `getAnnouncementHistory`
  - attendance history row shape
  - cache behavior
- category lifecycle methods
  - `createCategory`
  - `updateCategory`
  - `archiveCategory`
  - `republishCategory`
  - `reorderCategories`
- `updateRedeemStatus`
  - refund ledger side effects
  - stock increment/decrement behavior

### Suggested First Refactor Boundaries

- first seam candidates:
  - local serializers/mappers already inside the file
  - repeated include/select/query helpers
  - category mutation helpers
  - announcement mutation helpers
- extract later:
  - dashboard/analytics
  - user tracking/reporting
  - cache-sensitive reporting functions

### Temporary Seam Guidance

- `admin.queries.js` should only receive repeated query builders with real reuse
- `admin.serializers.js` should only receive grouped payload shaping that clearly belongs together
- if a helper is only used once, leave it close to the workflow until another extraction justifies it

---

## First Protected Payload Candidates

These are good candidates for payload fixtures before PR 2 starts.

- user:
  - course list
  - course detail
  - announcement list
  - announcement detail
  - notifications payload
- admin:
  - dashboard stats
  - advanced analytics
  - user detail modal payload
  - category list
  - course history
  - announcement history

## Immediate Next Steps

1. Create payload fixtures for the protected payload candidates above.
2. Add one repeatable guardrail command that compares fixture outputs.
3. Start PR 2 only after exports and fixture targets are agreed stable.
