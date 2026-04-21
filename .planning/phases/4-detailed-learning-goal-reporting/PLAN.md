# Phase 4: Detailed Learning Goal Reporting - PLAN

## Goal
Improve the Learning Goal Report to distinguish between "In Progress" and "Not Started" employees, and provide a detailed breakdown of which specific courses have been completed or started.

## Exit Criteria
- Summary cards show 3 statuses: "เรียนครบทั้งหมด", "กำลังเรียน", and "ยังไม่เริ่ม"
- User list includes a "Course Details" column listing all target courses with their status/progress
- "Status" calculation logic:
  - **Completed**: Met the target count.
  - **In Progress**: Not met target, but started at least one course.
  - **Not Started**: Started zero courses.
- PDF Report matches the new UI and displays detailed course progress.

## Work Breakdown

### Task Group 1: Backend Data Enrichment
- [ ] Update `goal.service.js` -> `getGoalReport`:
  - Fetch status/progress for **every** target course for each user.
  - Structure `courseDetails` array in the response.
  - Implement 3-category status logic.

### Task Group 2: Frontend UI Refinement
- [ ] Update `GoalReportModal.jsx` -> Summary Cards:
  - Change from 2 cards (Success/Pending) to 3 cards.
- [ ] Update `GoalReportModal.jsx` -> User Table:
  - Add "รายละเอียดรายคอร์ส" column.
  - Implement rendering for course progress list.

### Task Group 3: Reporting & Polish
- [ ] Update `GoalReportModal.jsx` -> `handlePrint`:
  - Map new data fields to the PDF report.
  - Update PDF columns and layout.

## Verification Plan
1. **API**: Verify `getGoalReport` via scratch script.
2. **UI**: Check that status cards and course list render correctly for various user progress states.
3. **PDF**: Verify exported report contains detailed course info.
