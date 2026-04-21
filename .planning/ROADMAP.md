# Project Roadmap: Scaleup KM Learning Platform

Overall goal: Transform the current LMS into a comprehensive KM + Performance hybrid system.

## Milestones

### Milestone 1: Initial Launch (v1.0)
Current focus: Stabilizing core education and admin features.

- [x] Phase 1: Instructor Management & Presets
- [x] Phase 2: Action Menu Positioning Fixes
- [ ] Phase 3: Enhanced Course Discovery
- [ ] Phase 4: Detailed Learning Goal Reporting

## Backlog

### Phase 999.1: Scaleup KM Dashboard Enhancement (BACKLOG)

**Goal:** Implement strategic dashboard features including Advanced Analytics, Skill Gap Analysis, and Team Performance Comparison to align the platform with the KM + Performance vision.

**Requirements:**
- [ ] Define Competency model and map to courses.
- [ ] Implement Skill Gap Radar Chart on Admin Dashboard.
- [ ] Implement Department-level performance comparison leaderboard.
- [ ] Add Risk Identification reporting for non-learners.

**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.3: Security Hardening & Edge Protection (BACKLOG)

**Goal:** Establish a production-ready abuse-protection baseline before DigitalOcean rollout by closing brute-force, upload abuse, oversized payload, permissive CORS, and missing observability gaps.

**Requirements:**
- [ ] Protect `/api/auth/login` against brute-force and credential-stuffing with shared-store rate limiting and temporary lockouts.
- [ ] Add proxy-aware rate limits for sensitive and expensive endpoints, including upload and admin analytics routes.
- [ ] Harden request handling with strict CORS allowlists, safer body-size limits, security headers, and proxy-aware IP detection.
- [ ] Require authenticated admin access for file uploads and tighten file validation beyond MIME type alone.
- [ ] Add structured security event logging and a deployment runbook for edge-layer DDoS controls, alerts, and recovery steps.

**Plans:** 1 plan

Plans:
- [ ] `999.3-PLAN.md` - security hardening and edge protection execution plan
