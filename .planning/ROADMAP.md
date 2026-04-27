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
- [x] Phase 3: Security Hardening & Edge Protection (Production Grade)
- [x] Phase 5: Analytics Service De-composition & Optimization (Refactor)
- [x] Phase 10: Automated Certification System (E2E)

### Milestone 2: Experience & Scalability (v1.2)
Current focus: White-label readiness, advanced UX, and long-term maintainability.

- [ ] Phase 6: Centralized Branding CI (White-label Readiness)
- [ ] Phase 7: URL-Based Filter Persistence & State Sync
- [ ] Phase 8: Reliability Track (Regression Defense & Unit Testing)

## Execution Tracks

### 🎓 Certification Track (Phase 10)
**Goal:** Automate learner recognition with high-fidelity, secure documents.
- [x] Implement Puppeteer-based PDF generation engine.
- [x] Automated issuance upon course completion.
- [x] Secure storage with private buckets and temporary signed URLs.
- [x] Public verification portal with token-based validation.
- [x] Admin management dashboard with retry/reissue capabilities.

### 🛠️ Refactoring Track (Phase 2.1 / Phase 5)
**Goal:** Standardize component architecture and modularize analytics services.
- [x] Centralize Shared UI Components (Standardize Buttons, Inputs, Modals).
- [x] Refactor API Service Layer (Facade Pattern).
- [x] Decompose Analytics into Advanced, At-Risk, and Summary modules.
- [x] Implement centralized data aggregators.

### 🛡️ Security Track (Phase 3)
**Goal:** Establish production-ready protection and observability.
- [x] Implement Redis-backed rate limiting.
- [x] Add structured security event logging.
- [x] Implement Row Level Security (RLS) policies.
- [x] Finalize security runbook.

### ☁️ Customer-Specific Tracks
**Goal:** Deployment and infrastructure for specific client requirements.
- [ ] **Phase 4: AWS Infrastructure Migration (Client A)**
  - AWS RDS, EC2, S3 + CloudFront setup.
  - Migration of local assets to S3.

## Archived / Future Backlog
*The following items are deferred to focus on stability:*
- *Advanced Analytics & Skill Gap Radar (Dashboard Features)*
- *Async report/export pipeline*

Reference:
- [TECHNICAL_DEBT.md](/D:/งาน%20AI%20Project/TECHNICAL_DEBT.md)
- [SCALING_PLAN.md](/D:/งาน%20AI%20Project/SCALING_PLAN.md)

---
*Updated on 2026-04-27*
