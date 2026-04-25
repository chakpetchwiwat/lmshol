# Project Roadmap: Scaleup KM Learning Platform

Overall goal: Transition the platform to a production-ready, secure, and maintainable system focused on performance and reliability.

## Active Milestones

### Milestone 1: Stability & Security (v1.1)
Current focus: Hardening infrastructure, reducing technical debt, and ensuring production readiness.

- [x] Phase 1: Instructor Management & Presets
- [x] Phase 2: Action Menu Positioning & UI Refinement
- [x] Phase 2.2: Notification System UX & Data Isolation
- [x] Phase 2.3: Backend Service Modularization (Refactor)
- [x] Phase 2.1: Project Standardization & Debt Reduction (Refactor)
- [x] Phase 3: Security Hardening & Edge Protection (Production Grade) [PLAN](file:///d:/งาน/AI Project/.planning/phases/3-security-hardening/PLAN.md)
- [x] Phase 5: Analytics Service De-composition & Optimization (Refactor)

## Execution Tracks

### 🛠️ Refactoring Track (Phase 2.1)
**Goal:** Standardize component architecture, remove redundant code, and improve type safety/documentation.
- [x] Centralize Shared UI Components (Standardize Buttons, Inputs, Modals).
- [x] Refactor API Service Layer for consistent error handling and caching.
- [x] Clean up redundant styles and unused assets.
- [x] Implement strict coding standards across the monorepo.

### 🛡️ Security Track (Phase 3)
**Goal:** Establish production-ready protection and observability before full deployment.
- [x] Implement Redis-backed rate limiting for `/api/auth/login` (Brute-force protection).
- [x] Add structured security event logging (Audit trails).
- [x] Finalize deployment runbook for edge-layer DDoS controls.
- [x] Implement Row Level Security (RLS) policies for critical tables.

## Archived / Future Backlog
*The following items are deferred to focus on stability:*
- *Advanced Analytics & Skill Gap Radar (Dashboard Features)*
- *Async report/export pipeline*

Reference:
- [TECHNICAL_DEBT.md](/D:/งาน%20AI%20Project/TECHNICAL_DEBT.md)
- [SCALING_PLAN.md](/D:/งาน%20AI%20Project/SCALING_PLAN.md)


### Phase 4: AWS Infrastructure Migration

**Goal:** Establish a production-ready AWS infrastructure for the e-learning platform, including database, backend, and frontend hosting.
**Requirements**: 
- AWS RDS (PostgreSQL) setup
- AWS EC2 (Node.js/PM2) setup
- AWS S3 + CloudFront (Static Hosting)
- AWS S3 (User Assets Storage)
**Depends on:** Phase 3
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 4 to break down)

### Phase 5: Analytics Service De-composition & Optimization (Refactor)

**Goal:** Decompose massive analytics services into modular, testable components and remove code duplication.
**Requirements**: 
- Extract Goal Compliance Logic to shared service.
- Extract Data Aggregators for Distribution and ROI trends.
- Refactor Dashboard and Advanced Analytics to use shared modules.
**Depends on:** Phase 3
**Plans:** 1 plan
- [x] [PLAN](file:///d:/งาน/AI Project/.planning/phases/05-analytics-service-de-composition-optimization/05-PLAN.md)
