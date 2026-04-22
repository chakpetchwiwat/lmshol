# Project Roadmap: Scaleup KM Learning Platform

Overall goal: Transition the platform to a production-ready, secure, and maintainable system focused on performance and reliability.

## Active Milestones

### Milestone 1: Stability & Security (v1.1)
Current focus: Hardening infrastructure, reducing technical debt, and ensuring production readiness.

- [x] Phase 1: Instructor Management & Presets
- [x] Phase 2: Action Menu Positioning & UI Refinement
- [x] Phase 2.2: Notification System UX & Data Isolation
- [/] Phase 2.1: Project Standardization & Debt Reduction (Refactor)
- [ ] Phase 3: Security Hardening & Edge Protection (Production Grade)

## Execution Tracks

### 🛠️ Refactoring Track (Phase 2.1)
**Goal:** Standardize component architecture, remove redundant code, and improve type safety/documentation.
- [ ] Centralize Shared UI Components (Standardize Buttons, Inputs, Modals).
- [ ] Refactor API Service Layer for consistent error handling and caching.
- [ ] Clean up redundant styles and unused assets.
- [ ] Implement strict coding standards across the monorepo.

### 🛡️ Security Track (Phase 3)
**Goal:** Establish production-ready protection and observability before full deployment.
- [ ] Implement Redis-backed rate limiting for `/api/auth/login` (Brute-force protection).
- [ ] Add structured security event logging (Audit trails).
- [ ] Finalize deployment runbook for edge-layer DDoS controls.
- [ ] Implement Row Level Security (RLS) policies for critical tables.

## Archived / Future Backlog
*The following items are deferred to focus on stability:*
- *Enhanced Course Discovery (UI)*
- *Advanced Analytics & Skill Gap Radar (Dashboard Features)*
- *Async report/export pipeline*

Reference:
- [TECHNICAL_DEBT.md](/D:/งาน%20AI%20Project/TECHNICAL_DEBT.md)
- [SCALING_PLAN.md](/D:/งาน%20AI%20Project/SCALING_PLAN.md)
