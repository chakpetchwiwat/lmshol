# Phase 4: Detailed Learning Goal Reporting - PLAN

## Goal
Improve the Learning Goal Report to distinguish between "Completed", "In Progress", and "Not Started" employees, providing a detailed breakdown of which specific courses have been completed or started. This ensures administrators can identify "at-risk" learners who haven't started or are lagging behind.

## Exit Criteria
- **Summary Cards**: Displays 3 distinct statuses: "เรียนครบทั้งหมด" (Success), "กำลังเรียน" (In Progress), and "ยังไม่เริ่ม" (Not Started).
- **User List**: Includes a "สรุปรายคอร์ส" column listing all target courses with their specific status (e.g., Progress bar or status icons).
- **Status Logic**:
  - **Completed**: Met the target count or completed all mandatory courses.
  - **In Progress**: Started at least one course but hasn't met the target.
  - **Not Started**: No activity on any target courses.
- **PDF Report**: Fully aligned with the 3-state UI, including detailed course progress tables.

## Work Breakdown

### Task Group 1: Backend Data Enrichment
- [ ] Update `goal.service.js` -> `getGoalReport`:
  - Fetch detailed interaction/progress for **every** target course in the goal.
  - Apply the 3-category tagging logic to each user record.
  - Ensure the response includes a structured `courseDetails` array.

### Task Group 2: Frontend Dashboard & Modal
- [ ] Update `GoalReportModal.jsx` -> Summary View:
  - Add the 3rd card for "ยังไม่เริ่ม".
  - Ensure color coding (Success: Emerald, In Progress: Indigo/Amber, Not Started: Slate/Rose).
- [ ] Update `GoalReportModal.jsx` -> Table:
  - Implement a dense list or progress chips for individual course statuses.

### Task Group 3: Export & PDF
- [ ] Update `handlePrint` logic:
  - Map the new 3-category data to the print layout.
  - Update PDF template to show the detailed course progress column.

## Verification Plan
1. **Mock Data Test**: Verify status logic with a user who has 0 progress, one with 50%, and one with 100%.
2. **UI Check**: Ensure the new "Not Started" card matches the styling of other cards.
3. **PDF Audit**: Export a report and verify it matches the on-screen data accurately.
