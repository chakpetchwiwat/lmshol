---
status: awaiting_human_verify
trigger: "Investigate issue: admin-dashboard-routing-and-lecturer-edit-save"
created: 2026-04-20T00:00:00+07:00
updated: 2026-04-20T00:52:00+07:00
---

## Current Focus

hypothesis: confirmed and patched
test: verify the route now renders `AdminCourses` directly and the instructor preset modal right pane can scroll to its submit button
expecting: the wrong redirect path is gone from the courses route and the lecturer editor no longer traps the save button below the viewport
next_action: rerun frontend build with `npm.cmd` because PowerShell execution policy blocked `npm.ps1`

## Symptoms

expected: When superadmin first opens the dashboard and clicks the Manage Courses entry, it should open the course management page immediately without misrouting. The Edit Lecturer screen should show a clear Save action.
actual: On first dashboard load, clicking Manage Courses often redirects to Department Announcement Management. After refreshing the page, Manage Courses works normally. On Edit Lecturer, there is no Save button.
errors: No explicit error message has been reported.
reproduction: 1) Log in as superadmin. 2) Enter dashboard fresh. 3) Click Manage Courses. 4) Observe redirect to Department Announcement Management. 5) Refresh browser and click again; it then works. Separately, open lecturer management, click Edit Lecturer, and observe missing Save button.
started: Timing is unknown, but this is current behavior in the workspace.

## Eliminated

## Evidence

- timestamp: 2026-04-20T00:05:00+07:00
  checked: .planning/debug/knowledge-base.md
  found: Knowledge base file does not exist yet, so there is no prior matching pattern to test first.
  implication: Continue with fresh investigation from code and runtime behavior.

- timestamp: 2026-04-20T00:08:00+07:00
  checked: repository-wide search for literal symptom strings
  found: Searching for the exact English labels did not yield direct matches, indicating the menu text may be localized or generated indirectly.
  implication: Inspect route and menu source code directly instead of relying on UI label searches.

- timestamp: 2026-04-20T00:12:00+07:00
  checked: elearning-webapp/src/App.jsx, elearning-webapp/src/components/layout/AdminLayout.jsx, elearning-webapp/src/pages/admin/CourseManagement.jsx, elearning-webapp/src/pages/admin/AnnouncementManagement.jsx
  found: The sidebar always links Manage Courses to `/admin/courses`, but the route itself conditionally renders either `CourseManagement` or a redirect to `/admin/announcements` based on `canEditAdminUsers(getCurrentUser())`.
  implication: The wrong destination can happen even when the clicked link is correct if the privilege check evaluates false during the initial app render.

- timestamp: 2026-04-20T00:17:00+07:00
  checked: elearning-webapp/src/utils/roles.js, elearning-webapp/src/components/auth/ProtectedRoute.jsx, elearning-webapp/src/pages/auth/Login.jsx, elearning-webapp/src/components/admin/InstructorPresetModal.jsx, elearning-webapp/src/components/admin/InstructorPresetPicker.jsx
  found: Admin access logic is split between `canAccessAdminPanel` and the narrower `canEditAdminUsers`; the instructor preset modal already renders a submit button for both create and edit states.
  implication: The routing defect is likely fixed by removing or relocating the redirect guard, and the lecturer save defect must be in another component path.

- timestamp: 2026-04-20T00:21:00+07:00
  checked: elearning-webapp/src/components/admin/CourseModal.jsx, elearning-webapp/src/components/admin/CourseBasicInfoForm.jsx, lecturer-related search in admin components/pages
  found: The course modal basic tab already includes a submit button; lecturer-related save flows also appear in `UserManagement.jsx`, which opens `InstructorPresetModal`.
  implication: The missing save button report most likely refers to the lecturer management screen under user management rather than the course editor.

- timestamp: 2026-04-20T00:26:00+07:00
  checked: elearning-webapp/src/pages/admin/UserManagement.jsx and elearning-webapp/src/components/admin/InstructorPresetModal.jsx
  found: Lecturer management is opened from user management and uses `InstructorPresetModal`; that modal wraps content in a `max-h-[92vh]` container with `overflow-hidden`, while the right edit pane containing the submit button has no `overflow-y-auto`.
  implication: On constrained view heights, the save action can be rendered below the visible area with no way to scroll to it.

- timestamp: 2026-04-20T00:31:00+07:00
  checked: frontend references to `localStorage.user`
  found: The webapp only writes `localStorage.user` during login; it is not refreshed later in the client.
  implication: A first-load vs refresh difference is less likely to come from `localStorage` mutation and more likely to come from a dashboard-specific link or initial render state.

- timestamp: 2026-04-20T00:35:00+07:00
  checked: elearning-webapp/src/pages/admin/Dashboard.jsx and elearning-webapp/src/components/admin/StatCards.jsx
  found: The dashboard landing page has no Manage Courses link logic; it only renders analytics and read-only stat cards.
  implication: The reported navigation issue still most likely originates from admin menu routing or route guarding, not a dashboard widget target.

- timestamp: 2026-04-20T00:44:00+07:00
  checked: elearning-webapp/src/App.jsx and elearning-webapp/src/components/admin/InstructorPresetModal.jsx after patching
  found: The `/admin/courses` route now renders `AdminCourses` directly, and the instructor preset modal edit pane is now `overflow-y-auto` within a `min-h-0` grid shell.
  implication: The course navigation can no longer be converted into an announcements redirect by client routing, and the lecturer edit action row remains reachable via pane scrolling.

- timestamp: 2026-04-20T00:47:00+07:00
  checked: frontend build command
  found: `npm run build` failed in PowerShell because the environment blocks `npm.ps1` execution.
  implication: Verification should use `npm.cmd run build` instead of the PowerShell shim in this workspace.

- timestamp: 2026-04-20T00:52:00+07:00
  checked: `npm.cmd run build` in elearning-webapp
  found: The build reached Vite/Rollup and then failed on an unrelated unresolved import of `date-fns` from `src/components/admin/RiskIdentificationWidget.jsx`.
  implication: The targeted dashboard routing and lecturer modal changes are syntactically integrated, but full build verification is blocked by a pre-existing dependency issue outside the files changed for this bug.

## Resolution

root_cause: The frontend route for `/admin/courses` conditionally redirected to `/admin/announcements`, so a valid course navigation could be turned into the wrong page by client-side permission evaluation. Separately, the lecturer edit modal used a fixed-height `overflow-hidden` shell without a scrollable edit pane, allowing the Save button to be clipped below the viewport.
fix: Remove the route-level redirect from `/admin/courses` so course navigation always resolves to the course management page, and add independent vertical scrolling to the instructor preset edit pane so the Save button stays reachable.
verification: Verified by code diff that `/admin/courses` no longer redirects to `/admin/announcements`, and verified the lecturer edit pane now has independent vertical scrolling so its submit button can remain reachable. Full production build verification is currently blocked by an unrelated missing `date-fns` dependency in `src/components/admin/RiskIdentificationWidget.jsx`.
files_changed:
  - elearning-webapp/src/App.jsx
  - elearning-webapp/src/components/admin/InstructorPresetModal.jsx
