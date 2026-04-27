# Phase 6: Centralized Branding CI (White-label Readiness) - PLAN

## Objective
Establish a centralized theme system using CSS variables (tokens) to allow rebranding the entire application from a single file. Remove ~300+ hardcoded Tailwind color instances and literal CSS color values.

## Proposed Changes

### [Component] CSS Design System
#### [MODIFY] [index.css](file:///d:/งาน/AI Project/elearning-webapp/src/index.css)
- Define Foundation Tokens (`--brand-primary`, `--brand-accent`, etc.)
- Define Semantic Tokens (`--color-action-primary`, `--color-surface-base`, etc.)
- Add RGB pairs for opacity control (`--brand-primary-rgb`).
- Refactor global classes (`.btn-primary`, `.card`, `.glass-card`, `.form-input`) to use tokens.
- Refactor Rich Text Editor styling to use tokens.

### [Component] Layouts & Shells
#### [MODIFY] [UserLayout.css](file:///d:/งาน/AI Project/elearning-webapp/src/components/layout/UserLayout.css)
#### [MODIFY] [AdminLayout.css](file:///d:/งาน/AI Project/elearning-webapp/src/components/layout/AdminLayout.css)
- Replace literal `rgba` colors with token references.
- Standardize glassmorphism and nav highlights.

### [Component] High-Impact JSX Components
- Replace hardcoded Tailwind classes (`indigo`, `amber`, `emerald`, `blue-700`, etc.) with semantic classes or CSS variable calls.
- **Targets:**
    - `CourseCard.jsx`
    - `CategoryPills.jsx`
    - `SectionHeader.jsx`
    - `HomeHero.jsx`
    - `RewardCard.jsx`
    - `VideoPlayer.jsx`

---

## Tasks

### Wave 1: Token Foundation & Global Primitives
- [ ] Refactor `index.css` `@theme` and `@layer base`.
    - `<action>`: Add `--brand-primary`, `--brand-accent`, and their RGB counterparts.
    - `<action>`: Update `:focus-visible` to use brand tokens.
- [ ] Update Global CSS Classes in `index.css`.
    - `<action>`: Refactor `.btn-primary`, `.glass-card`, `.text-gradient-primary`.
    - `<action>`: Refactor `.rich-text-editor` styles (lines 200-500).

### Wave 2: Layout Shell Migration
- [ ] Refactor `UserLayout.css` and `AdminLayout.css`.
    - `<action>`: Replace hardcoded colors in sidebar, header, and bottom nav.
- [ ] Update `UserLayout.jsx` and `AdminLayout.jsx`.
    - `<action>`: Standardize active navigation states using semantic classes.

### Wave 3: Component & Page Migration (Bulk Cleanup)
- [ ] Migrate User-facing components.
    - `<action>`: Scan and replace colors in `CourseCard`, `CategoryPills`, `SectionHeader`.
- [ ] Migrate Admin-facing components.
    - `<action>`: Scan and replace colors in `AdminTable`, `CourseTable`, `UserModal`.
- [ ] Handle special components.
    - `<action>`: `VideoPlayer.jsx` (Custom CSS variables).
    - `<action>`: `Skeleton.jsx` (Shimmer colors).

### Wave 4: Documentation & Verification
- [ ] Create `BRAND_STYLE_GUIDE.md`.
    - `<action>`: Document how to rebrand by changing `index.css`.
- [ ] Final Verification.
    - `<action>`: Change `--brand-primary` to a different color and verify the entire app updates.

---

## Verification Plan

### Manual Verification
- **Visual Audit:** Change the primary brand color to `#E11D48` (Rose-600) and verify:
    - All primary buttons update.
    - All active navigation states update.
    - Focus rings and glass effects use the new tint.
    - Dashboard charts and accents align with the new theme.
- **Accessibility:** Ensure contrast ratios remain acceptable with the new tokens.
