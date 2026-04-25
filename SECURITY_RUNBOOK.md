# Security Runbook: Scaleup KM Learning Platform

This document outlines the security procedures and incident response steps for the e-learning platform.

## 1. Key Rotation
### JWT Secret Rotation
If `JWT_SECRET` is compromised:
1. Update the `JWT_SECRET` in the production environment variables.
2. Restart the API service.
3. **Impact**: All users will be logged out immediately. They must log in again to receive a new token.

### Database Credentials
If DB credentials are compromised:
1. Rotate the password in the Supabase Dashboard.
2. Update `DATABASE_URL` and `DIRECT_URL` in the environment variables.
3. Restart the API service.

## 2. DDoS & Rate Limiting
### Global Rate Limit
The API has a global rate limit (default: 300 requests per 15 min per IP).
To adjust:
- Change `DEFAULT_RATE_LIMIT_MAX` in environment variables.

### Blocking an IP (WAF Layer)
If an IP is attacking the system:
1. Access the **CloudFront/WAF** console (if deployed) or **DigitalOcean/AWS** firewall.
2. Add the malicious IP to the "Deny" list.

## 3. Audit Logs
Structured security logs are output to `stdout` with the `[security]` prefix.
To investigate:
- Search logs for `auth.login.failure` to identify brute-force attempts.
- Search for `security.cors.denied` to identify unauthorized origin attempts.

## 4. Row Level Security (RLS)
RLS is enabled on `User`, `PointsLedger`, and `RedeemRequest`.
To check if a query is being blocked by RLS:
1. The error will usually manifest as 0 rows returned even if data exists, or a "permission denied" error.
2. Ensure the Prisma client is using the `$extends` logic in `src/utils/prisma.js`.
