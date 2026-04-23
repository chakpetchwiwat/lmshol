# Refactor Manual QA Checklist

Use this checklist when a refactor PR touches protected flows before full automated guardrails exist.

## User Flows

- [ ] `/api/user/courses`
  - visible course list still loads
  - enrollment summary fields still appear correctly
- [ ] `/api/user/courses/:id`
  - enrolled course detail still loads
  - lesson ordering and completion state still look correct
  - protected document lessons still expose `hasDocument` behavior correctly
- [ ] enroll flow
  - enrolling in a published visible course still succeeds
- [ ] lesson progress flow
  - marking a lesson complete still updates course progress
  - course completion still sets enrollment status and completion timestamp
- [ ] quiz submission flow
  - score and pass/fail still match expected answers
  - quiz points and course completion points are not double-awarded
- [ ] announcement detail flow
  - opening an announcement still works
  - attendance/view side effect still records
- [ ] reward redeem flow
  - insufficient balance is rejected
  - successful redeem decrements stock and debits points
- [ ] notifications flow
  - unread count still matches items
  - mark-one, mark-all, and clear-all still behave correctly

## Admin Flows

- [ ] `/api/admin/dashboard`
  - loads for full admin
  - loads for manager-scoped view if applicable
  - department/month/year filters still behave correctly
- [ ] `/api/admin/analytics`
  - major sections still render
  - manager/admin scoping still holds
- [ ] `/api/admin/users/:id/details`
  - admin user detail modal payload still includes enrollments, points history, and tracking summary
- [ ] category management
  - list loads
  - create/edit works
  - archive/republish works
  - reorder works
  - visibility rules and temporary expiration fields still persist
- [ ] course history
  - started/completed date filtering still behaves correctly
  - not-started rows still appear when expected
- [ ] announcement history
  - attendance rows still load with score/pass information
- [ ] reward admin + redeem requests
  - reward CRUD still works
  - redeem status update still refunds and restocks correctly on rejection

## Notes Template

- PR:
- Environment:
- Seed or dataset used:
- Checked by:
- Known gaps:
