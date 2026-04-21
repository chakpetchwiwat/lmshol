# Debug Session: Goal Report Infinite Loop

## Symptoms
- **Expected**: View Report opens a modal with stable data.
- **Actual**: React Error #310 (Infinite Loop) on click.
- **Trigger**: `handleViewReport` in `GoalManagement.jsx`.

## Hypotheses
1. `handleViewReport` is correctly updating state, but a child component (GoalList or GoalReportModal) is triggering a re-fetch or state update in `GoalManagement`.
2. `fetchData` stabilization in `GoalManagement.jsx` is incomplete or being bypassed.
3. `GoalReportModal` has a `useMemo` or `useEffect` that creates a circular dependency with its props or parent state.

## Investigation Log
- [ ] Inspect `GoalManagement.jsx` for any state updates triggered by `reportGoal` or `reportData` changes.
- [ ] Inspect `GoalReportModal.jsx` for effects that call parent handlers (e.g. `onClose`).
- [ ] Check `AdminActionMenu` usage in `GoalList` to ensure `onClick` isn't firing during render.
