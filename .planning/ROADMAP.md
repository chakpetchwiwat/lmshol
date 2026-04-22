# Project Roadmap: Scaleup KM Learning Platform

Overall goal: Transform the current LMS into a comprehensive KM + Performance hybrid system.

## Milestones

### Milestone 1: Initial Launch (v1.0)
Current focus: Stabilizing core education and admin features.

- [x] Phase 1: Instructor Management & Presets
- [x] Phase 2: Action Menu Positioning Fixes
- [ ] Phase 2.1: Project Standardization & Debt Reduction
- [ ] Phase 3: Enhanced Course Discovery
- [ ] Phase 4: Detailed Learning Goal Reporting

## Backlog

## Cross-Cutting Execution Track

### Scaling Track

Scaling and performance work is tracked separately from the feature roadmap so the main roadmap stays readable while scaling decisions remain explicit.

- `Phase D: DB index + query optimization` - completed
- `Phase A: Goal-centric reporting redesign` - pending
- `Phase B: Analytics summary tables` - pending
- `Phase C: Async report/export pipeline` - pending

Reference:
- [SCALING_PLAN.md](/D:/งาน%20AI%20Project/SCALING_PLAN.md)

### Phase 999.1: Scaleup KM Dashboard Enhancement (BACKLOG)

**Goal:** Implement strategic dashboard features including Advanced Analytics, Skill Gap Analysis, and Team Performance Comparison to align the platform with the KM + Performance vision.

**Status note:** Partially implemented in the current dashboard code, but not yet reconciled into a product-ready phase. Existing work covers analytics scaffolding; the remaining gap is domain fidelity and product positioning.

**Requirements:**
- [ ] Define Competency model and map to courses.
- [x] Implement Skill Gap Radar Chart on Admin Dashboard.
- [x] Implement Department-level performance comparison leaderboard.
- [x] Add Risk Identification reporting for non-learners.

**Still needed to close this backlog item:**
- Add a real competency model and course-to-competency mapping.
- Reconcile current dashboard widgets with the intended KM + Performance narrative.
- Decide whether remaining dashboard work should stay in backlog or be folded into a future milestone.

**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.3: Security Hardening & Edge Protection (BACKLOG)

**Goal:** Establish a production-ready abuse-protection baseline before DigitalOcean rollout by closing brute-force, upload abuse, oversized payload, permissive CORS, and missing observability gaps.

**Status note:** Baseline protections have been implemented in-app. Remaining work is mostly production-grade shared-store enforcement and deployment/runbook work.

**Requirements:**
- [ ] Protect `/api/auth/login` against brute-force and credential-stuffing with shared-store rate limiting and temporary lockouts.
- [x] Add proxy-aware rate limits for sensitive and expensive endpoints, including upload and admin analytics routes.
- [x] Harden request handling with strict CORS allowlists, safer body-size limits, security headers, and proxy-aware IP detection.
- [x] Require authenticated admin access for file uploads and tighten file validation beyond MIME type alone.
- [ ] Add structured security event logging and a deployment runbook for edge-layer DDoS controls, alerts, and recovery steps.

**Still needed to close this backlog item:**
- Replace process-local lockout/rate limiting with a shared store for multi-instance production.
- Finalize deployment/runbook guidance for edge-layer DDoS controls and incident recovery.
- Decide whether Vercel-specific deployment notes should be tracked separately from future infrastructure migration work.

**Plans:** 1 plan

Plans:
- [ ] `999.3-PLAN.md` - security hardening and edge protection execution plan
