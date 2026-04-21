# Engineering Rules for Performance & Stability

To ensure the LMS platform remains scalable and crash-free, all code changes must adhere to these strict engineering rules.

## [RULE-001] Backend: No N+1 Queries
**Problem**: Calling database queries inside a loop (N users = N+1 queries) causes geometric performance degradation.
**Rule**:
- **NEVER** call `prisma.xxx.findMany/findUnique` inside a `.map()`, `.forEach()`, or `for` loop.
- **ALWAYS** use Batch Querying: Collect all IDs first, then use `userId: { in: userIds }`.
- **STABILIZE**: Join and map the data in-memory using a Map or an object lookup.

## [RULE-002] Frontend: Strict Hook Order
**Problem**: Calling hooks after a conditional return or inside nested functions causes React Error #310.
**Rule**:
- **TOP LEVEL ONLY**: Declare all hooks (`useState`, `useMemo`, `useCallback`, `useId`, etc.) at the very top of the component.
- **ABOVE RETURNS**: Hooks must **ALWAYS** come before any `if (loading) return` or `if (!data) return null`.
- **NO INLINE HOOKS**: Never use `tabs={useMemo(...)}` directly inside a prop. Assign it to a variable at the top level first.

## [RULE-003] Frontend: Render Stability for Lists
**Problem**: Unstable references (objects/arrays created on the fly) cause heavy child components to re-render 100+ times unnecessarily.
**Rule**:
- **COLUMNS & CONFIG**: Static or derived configuration objects (like Table Columns or Tabs) must be wrapped in `useMemo`.
- **EVENT HANDLERS**: Functions passed to list items should be wrapped in `useCallback`.
- **COMPLEX PROPS**: Avoid passing inline objects like `style={{ color: 'red' }}` to components inside a loop.

## [RULE-004] Data Seeding: Nyquist Scale Testing
**Problem**: UI components often look "balanced" with 2-3 items but break at 100+ items.
**Rule**:
- **SCALE TEST**: When developing reporting features, always test with at least 50-100 realistic records.
- **THAI LANGUAGE**: Ensure mock data uses UTF-8 and realistic Thai names/departments to verify layout and encoding stability.
