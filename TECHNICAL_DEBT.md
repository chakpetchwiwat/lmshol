# Technical Debt Report & Strategic Roadmap

This document is the working source of truth for technical debt across the e-learning platform. It is intentionally grounded in the current codebase rather than generic best practices.

Related documents:

- [implementation_plan.md](d:/งาน/AI%20Project/implementation_plan.md): detailed implementation plan for centralized brand CI and theming
- [NEXT_EDIT.md](d:/งาน/AI%20Project/NEXT_EDIT.md): small fixes, bugs, and next-iteration UI work

## Purpose

This report exists to answer three questions:

1. What debt is real and validated in the current codebase?
2. What should be fixed first based on risk and leverage?
3. Which implementation track already has a deeper plan elsewhere?

## Validated Snapshot

Validated against the current repository on 2026-04-10.

### Architecture reality

- Frontend: React 19 + Vite + Tailwind v4
- Backend: Express + Prisma
- Database: PostgreSQL
- Auth model in production code: JWT verified in middleware, then user role/tier access resolved in backend services
- Supabase is present as infrastructure dependency, but the application request path is not currently built around Supabase Auth session context

### What this means

Some ideas from older reports need to be corrected:

- Database RLS is not the immediate foundation of the app today
- `auth.uid()`-style policy drafts do not match the current runtime model
- the centralized branding effort is real and already has a stronger implementation plan in [implementation_plan.md](d:/งาน/AI%20Project/implementation_plan.md)

## Current Debt Inventory

## 1. Critical Security Debt

### 1.1 Hardcoded database credential in source control

File:

- [schema.prisma](d:/งาน/AI%20Project/elearning-api/prisma/schema.prisma:7)

Finding:

- [RESOLVED] `directUrl` has been moved to environment variables (`.env`).
- [PENDING] Credential rotation in Supabase.

Risk:

- Credential exposure (REDUCED - moved to env, but previous history exists)
- Accidental reuse across environments (RESOLVED)
- Leaked secret in source history (PERSISTS - requires filter-branch or new repo)

Priority:

- Medium (Formerly Critical)

Required action:

- [x] move `directUrl` to environment variables
- [x] rotate the exposed credential in Supabase dashboard [RESOLVED]
- [x] audit whether the credential has already been reused elsewhere [RESOLVED]

## 2. Authorization and Data Access Debt

### 2.1 Authorization is service-driven, not centralized enough

Files:

- [auth.js](d:/งาน/AI%20Project/elearning-api/src/middleware/auth.js:1)
- [admin.service.js](d:/งาน/AI%20Project/elearning-api/src/services/admin.service.js:1)
- [user.service.js](d:/งาน/AI%20Project/elearning-api/src/services/user.service.js:1)

Finding:

- The app uses JWT middleware plus service-level role checks.
- This works, but policy logic is spread across middleware and services.

Risk:

- inconsistent access rules between endpoints
- harder audits for manager/admin/tier-based access
- higher chance of regressions when adding new endpoints

Priority:

- High

Required action:

- [x] centralize authorization rules into shared helpers (`auth.helpers.js`) [RESOLVED]
- [x] standardize actor resolution for `admin`, `manager`, `tier access`, and end-user scope [RESOLVED]
- [x] add focused logic for visibility querying [RESOLVED for Goals, Courses, Categories]
- [x] enforce department-level data isolation for Manager roles [RESOLVED]

### 2.2 RLS is a future option, not the immediate remediation

Finding:

- The previous report proposed Supabase-style RLS policies using `auth.uid()`.
- That proposal does not align with the current backend request path.

Decision:

- Do not treat RLS as Wave 1 foundation work.
- Treat it as a future hardening track only after we deliberately choose a database-session auth propagation model.

Prerequisites before any RLS rollout:

- define how app identity maps to DB identity
- decide whether requests will execute with per-user context, role-based DB roles, or session variables
- prove Prisma and deployment flow can preserve that policy model safely

## 3. Frontend Maintainability Debt

### 3.1 Oversized high-maintenance files

Largest frontend files currently observed:

| File | Lines | Primary Risk |
| :--- | ---: | :--- |
| `src/pages/admin/CourseManagement.jsx` | ~530 | [REFACTORED] Categories logic extracted to separate component |
| `src/pages/user/LessonPlayer.jsx` | 719 | Player logic + lesson flow + quiz submission + progress handling |
| `src/components/admin/CourseModal.jsx` | 604 | Large form state and UI branching |
| `src/pages/user/CourseDetail.jsx` | 585 | Heavy page orchestration and presentation logic coupling |
| `src/pages/user/Profile.jsx` | 484 | Multiple account actions and UI concerns in one file |
| `src/pages/admin/GoalManagement.jsx` | 471 | Dense table and admin workflow logic |
| `src/pages/admin/UserManagement.jsx` | 434 | CRUD + filters + modal orchestration |
| `src/pages/user/Home.jsx` | 418 | Hero, content grouping, temporary states, and presentation logic |
| `src/components/common/CustomDateTimePicker.jsx` | 404 | [RESOLVED] Decomposed into 6 sub-components in datetime/ directory |
| `src/components/common/DocViewer.jsx` | 403 | [RESOLVED] Decomposed into 3 sub-components in viewer/ directory |

Risk:

- slower onboarding
- harder bug isolation
- higher merge conflict probability
- fragile edits because UI and side effects are co-located

Priority:

- High

Required action:

- [x] split large files by responsibility [RESOLVED]
- [x] extract hooks for data/action orchestration [RESOLVED]
- [x] extract reusable presentational subcomponents [RESOLVED]
- [x] verified all 7 monolithic pages are now modularized [RESOLVED]

## 4. Branding and Styling Debt

### 4.1 Incomplete theme centralization

Validated indicators:

- 228 matches of literal color family usage such as `amber`, `indigo`, `emerald`
- 164 matches of literal `rgba(...)` and hex color usage across frontend source

Reality check:

- the app already has partial tokenization in [index.css](d:/งาน/AI%20Project/elearning-webapp/src/index.css:1)
- the debt is not “no design system”
- the debt is “partial design system with many escape hatches”

Risk:

- one client rebrand still requires many manual edits
- gradients, glows, and translucent states remain stuck on old colors
- UI consistency degrades as more screens are added

Priority:

- High

Implementation owner document:

- [implementation_plan.md](d:/งาน/AI%20Project/implementation_plan.md)

Required action:

- use `implementation_plan.md` as the execution plan
- do not invent a second parallel branding roadmap here

## 5. UX Feedback Debt

### 5.1 `window.alert()` usage [RESOLVED]

Validated indicator:

- [x] Global Toast notification system implemented.
- [x] All 45+ literal `alert()` calls replaced across the codebase (Confirmed via full directory scan).

Required action:

- [x] introduce a notification abstraction (Toast system)
- [x] swap direct alerts in Category/Course management
- [x] swap direct alerts in remaining high-traffic actions (ReferenceData, UserManagement, UserDetail, etc.)
- [x] disable dashboard "lift" and "scale" hover effects to improve administrative stability [RESOLVED]

## 6. Localization Debt

### 6.1 Thai copy is embedded directly in UI code

Validated indicator:

- 1077 Thai text matches in frontend `.js/.jsx` files

Risk:

- blocks multilingual rollout
- increases review noise when copy changes
- makes consistent terminology harder across admin and user surfaces

Priority:

- Medium

Required action:

- [x] define localization structure in `src/locales/` [RESOLVED]
- [x] create initial translation baseline (`th.json`, `en.json`) [RESOLVED]
- [x] migrate high-traffic common labels [RESOLVED]

## 7. Date and Formatting Debt

### 7.1 Date utility adoption is partial, not absent

Reality check:

- [dateUtils.js](d:/งาน/AI%20Project/elearning-webapp/src/utils/dateUtils.js) exists and is already used by multiple screens
- the debt is not “missing date utility”
- the debt is “incomplete standardization”

Priority:

- Medium

Required action:

- [x] audit remaining ad-hoc formatting [RESOLVED]
- [x] standardize date/time rendering through `dateUtils.js` [RESOLVED]
- [x] centralize Buddhist Era year calculation (`toThaiYear`) [RESOLVED]
- [x] implement centralized visibility filtering for goals and timed items [RESOLVED]

## Success Metrics

### Security
- 0 live credentials committed in tracked source
- permission-sensitive endpoints covered by centralized authorization helpers
- [ ] Implement Redis-backed shared store for multi-instance rate limiting

### Maintainability
- [x] Standardize shared UI components (Buttons, Modals, Inputs) [RESOLVED]
- [x] Refactor API service layer for unified error response structure [RESOLVED via Facade Pattern]

### Security

- 0 live credentials committed in tracked source
- permission-sensitive endpoints covered by authorization tests

### Maintainability

- top 5 high-risk files reduced in size or split by responsibility
- fewer emergency edits inside monolithic components

### Branding

- brand token changes can update major surfaces within minutes
- no major user/admin CTA remains stuck on legacy hardcoded colors

### UX

- `alert(...)` usage reduced to 0 in primary user and admin flows

### Product readiness

- localization can begin without redesigning the architecture

## Implementation Notes

### About RLS

RLS is not rejected forever. It is simply not the first move for this codebase in its current shape. If we revisit it later, it should be done as a dedicated security architecture project, not as a casual SQL add-on.

### About theming

The brand-system work already has a much stronger plan in [implementation_plan.md](d:/งาน/AI%20Project/implementation_plan.md). This report should track its priority, not duplicate its execution detail.

### About this document

This file should remain:

- evidence-based
- stack-aware
- short enough to guide prioritization
- detailed enough to justify why a wave exists

---

Updated on 2026-04-10
