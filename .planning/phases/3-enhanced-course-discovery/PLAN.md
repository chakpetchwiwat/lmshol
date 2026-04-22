# Phase 3: Enhanced Course Discovery - PLAN

## Goal
Improve the user's ability to find relevant courses through advanced filtering, better sorting, and a more intuitive search experience.

## Exit Criteria
- **Search**: Supports searching by Course Title, Instructor Name, and Categories (Global Search).
- **Filtering**:
  - Filter by **Points** range (e.g., 0-50, 51-200, 200+).
  - Filter by **Duration** (Short < 1h, Medium 1-3h, Long > 3h).
  - Filter by **Status** (Not Started, In Progress, Completed).
- **Sorting**:
  - Sort by **Popularity** (most enrolled).
  - Sort by **Points** (high to low).
  - Sort by **Recently Updated**.
- **UX**: Search results are updated in real-time or via a clear action button, with no layout shifts.

## Work Breakdown

### Task Group 1: Filter Utilities & Logic
- [ ] Update `courseFilters.js`:
  - Enhance `filterCourses` to handle point ranges and duration buckets.
  - Implement dynamic sorting logic for popularity and points.
- [ ] Update `userAPI`:
  - Ensure course fetching includes enrollment counts if needed for sorting by popularity.

### Task Group 2: Frontend Filter Components
- [ ] Update `FilterSidebar.jsx`:
  - Add UI controls for Points Range (Slider or Checkboxes).
  - Add UI controls for Duration.
  - Fix any layout clipping on mobile devices.
- [ ] Update `CourseList.jsx`:
  - Integrate new filter params into the state and `useMemo` filtered list.

### Task Group 3: Sorting & UI Refinement
- [ ] Update `SortDropdown`/`FilterSidebar`:
  - Add new sorting options.
- [ ] Add "Clear Filters" button in more prominent locations when results are empty.

## Verification Plan
1. **Search**: Search for various terms (title/instructor) and verify accuracy.
2. **Filter**: Apply multiple filters simultaneously (e.g., "Indigo points > 100" AND "Status: In Progress") and check results.
3. **Responsive**: Verify the sidebar and results grid look good on tablet and mobile.
