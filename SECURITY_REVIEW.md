# ShopKart Application Security Review & Hardening Audit (Phase 5)

**Review Date:** November 2026  
**Auditor:** Senior Software Engineer & Application Security Reviewer  
**Scope:** Full-stack MERN Application (`shopkart/backend` and `shopkart/frontend`)  
**Status:** All Critical, High, and Medium vulnerabilities remediated and verified with automated test suites.

---

## Executive Summary

A comprehensive application security audit and defensive hardening was conducted on ShopKart to identify vulnerabilities, eliminate attack vectors, and enhance production resilience. The remediation introduced defense-in-depth measures including HTTP security headers (`helmet`), CORS whitelisting, IP-based rate limiting, NoSQL injection sanitization, Zod schema validation on write endpoints, account lockout policies, single-use hashed password reset tokens, ReDoS protection, CSV formula injection escaping, and centralized error handling with request correlation IDs.

Both embedded JSON storage and MongoDB replica-set modes passed all regression smoke tests (244/244 passed) and a newly introduced Vitest + Supertest automated security test suite (44/44 tests passed with coverage reporting).

---

## Vulnerability Findings & Remediation Matrix

| ID         | Vulnerability / Threat Area                              | Severity     | Location                                                                                                                 | Remediation Implemented                                                                                                                                                                                                                                                                               | Verification Status                                                                                                                                        |
| ---------- | -------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SEC-01** | Insecure `JWT_SECRET` Handling & Default Secrets         | **Critical** | `backend/src/config/env.ts`, `backend/src/index.ts`                                                                      | Centralized env validation (`validateEnvironment()`). In production (`NODE_ENV=production`), the application refuses to start if `JWT_SECRET` is unset, less than 32 characters, or matches known default/example secret strings.                                                                     | **Remediated** (Unit tested & startup check)                                                                                                               |
| **SEC-02** | Weak Password Hashing & Inadequate Salt Rounds           | **Medium**   | `backend/src/routes/authRoutes.ts`, `backend/src/seedData.ts`                                                            | Standardized bcrypt hashing with a minimum work factor (salt rounds = 10) across all registration, seeding, and password changes/resets. Prevents fast offline dictionary attacks.                                                                                                                    | **Remediated** (Verified in smoke & unit tests)                                                                                                            |
| **SEC-03** | Token Expiry & Incomplete Logout Story                   | **High**     | `backend/src/middleware/auth.ts`, `backend/src/routes/authRoutes.ts`, `backend/src/types.ts`                             | Tokens are signed with an explicit expiry (`7d`). Added a user `tokenVersion` counter. Explicit logout (`POST /api/auth/logout`) and password reset increment `tokenVersion`, instantly invalidating existing tokens on subsequent requests.                                                          | **Remediated** (Tested in `auth.test.ts`)                                                                                                                  |
| **SEC-04** | Insecure Direct Object Reference (IDOR)                  | **High**     | `backend/src/routes/orderRoutes.ts`, `backend/src/routes/cartRoutes.ts`, `backend/src/routes/wishlistRoutes.ts`          | All cart, wishlist, and profile queries enforce tenancy using `req.user._id` from the validated JWT token rather than client parameters. User orders enforce ownership checks (`order.userId === req.user._id`), allowing access only to the resource owner or administrators.                        | **Remediated** (Verified in smoke & Vitest)                                                                                                                |
| **SEC-05** | Mass Assignment (Privilege Escalation & Field Tampering) | **High**     | `backend/src/routes/authRoutes.ts`, `backend/src/middleware/validation.ts`                                               | Registration strictly hardcodes `role: 'customer'`, `isBlocked: false`, and `failedLoginAttempts: 0`. `PUT /auth/profile` and `POST /auth/address` use Zod schemas and explicit field picking to reject unauthorized assignment of `role`, `isBlocked`, or credentials.                               | **Remediated** (Tested in `auth.test.ts`)                                                                                                                  |
| **SEC-06** | NoSQL Query Injection                                    | **High**     | `backend/src/middleware/sanitizer.ts`, `backend/src/index.ts`                                                            | Implemented `noSqlSanitizer` middleware that recursively scans and strips object keys containing `$` (MongoDB query operators like `$gt`, `$ne`, `$where`) or `.` (dot notation path manipulation) from `req.body`, `req.query`, and `req.params`.                                                    | **Remediated** (Tested in `security.test.ts`)                                                                                                              |
| **SEC-07** | Regular Expression Denial of Service (ReDoS)             | **High**     | `backend/src/utils/security.ts`, `backend/src/repository/MongoRepository.ts`, `backend/src/repository/JsonRepository.ts` | Created `escapeRegex()` utility escaping all regex metacharacters (`.*+?^${}()                                                                                                                                                                                                                        | []\`). All search queries (products, categories, brands) escape user input prior to constructing `RegExp` instances, preventing catastrophic backtracking. | **Remediated** (Tested in `security.test.ts`) |
| **SEC-08** | CSV Formula Injection (DDE / Spreadsheet Injection)      | **Medium**   | `backend/src/utils/security.ts`, `backend/src/routes/adminRoutes.ts`                                                     | Implemented `escapeCsvCell()` which prefixes cells starting with formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) with a single quote (`'`) and double-quotes cells according to RFC 4180. Prevents malicious code execution in Microsoft Excel/Google Sheets.                                       | **Remediated** (Tested in `security.test.ts`)                                                                                                              |
| **SEC-09** | Information Disclosure & Internal Stack Leaks            | **Low**      | `backend/src/index.ts`, `backend/src/middleware/validation.ts`                                                           | Centralized error handler masks internal stack traces and database details when `NODE_ENV=production`, returning safe generic error messages. Standard 404 handler returns structured JSON without exposing framework internals.                                                                      | **Remediated** (Tested in `security.test.ts`)                                                                                                              |
| **SEC-10** | Missing Defensive HTTP Headers & CORS Permissiveness     | **Medium**   | `backend/src/index.ts`                                                                                                   | Configured `helmet` with `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and strict CORP. Restriced CORS to explicit allow-list origins specified in `CORS_ORIGIN` env var.                                                                                                         | **Remediated** (Tested in `security.test.ts`)                                                                                                              |
| **SEC-11** | Unrestricted Rate of Requests (Brute-Force & DoS)        | **High**     | `backend/src/middleware/rateLimiter.ts`, `backend/src/index.ts`                                                          | Implemented IP rate limiting via `express-rate-limit`: global limiter (500 req/15min), strict auth limiter on `/login`, `/register`, `/forgot-password`, and strict payment limiter on `/create-order` and `/verify`.                                                                                 | **Remediated** (Tested in `security.test.ts`)                                                                                                              |
| **SEC-12** | Request Payload Flooding                                 | **Medium**   | `backend/src/index.ts`                                                                                                   | Enforced strict body-size limits (`1mb`) on JSON and URL-encoded parsers. Payloads exceeding 1MB are rejected with HTTP 413 Payload Too Large.                                                                                                                                                        | **Remediated** (Tested in `security.test.ts`)                                                                                                              |
| **SEC-13** | Password Complexity & Account Lockout                    | **Medium**   | `backend/src/utils/security.ts`, `backend/src/routes/authRoutes.ts`                                                      | Enforced password rules: min 8 characters, at least 1 uppercase letter, 1 lowercase letter, and 1 number or special character. Account lockout locks an account for 15 minutes after 5 consecutive failed login attempts (returning HTTP 423).                                                        | **Remediated** (Tested in `auth.test.ts`)                                                                                                                  |
| **SEC-14** | Secure Password Reset Tokens                             | **High**     | `backend/src/utils/security.ts`, `backend/src/routes/authRoutes.ts`, `backend/src/services/emailService.ts`              | Password resets issue single-use, cryptographically secure 256-bit random tokens (`crypto.randomBytes(32)`). Tokens are stored as SHA-256 hashes with a 1-hour expiration timestamp. Raw tokens are never returned in production API responses and are delivered via email (or dev console fallback). | **Remediated** (Tested in `auth.test.ts`)                                                                                                                  |
| **SEC-15** | Request Correlation & Observability                      | **Low**      | `backend/src/index.ts`                                                                                                   | Added `X-Request-Id` header (using client header or `crypto.randomUUID()`) propagated through all logs and responses for end-to-end auditability.                                                                                                                                                     | **Remediated** (Tested in `security.test.ts`)                                                                                                              |

---

## Detailed Review of Critical Findings

### 1. JWT Secret Handling & Production Safeguards

- **Vulnerability:** Applications with hardcoded or fallback secrets (`dev-only-insecure-secret`) are trivial to forge if deployed without setting `JWT_SECRET`.
- **Fix:** `validateEnvironment()` is invoked during startup. When `NODE_ENV === 'production'`:
  1. Refuses to start if `JWT_SECRET` is unset.
  2. Refuses to start if `JWT_SECRET` matches any known default strings (`dev-only-insecure-secret`, `secret`, `password`, etc.).
  3. Refuses to start if `JWT_SECRET` length is under 32 characters.

### 2. Mass Assignment Defense

- **Vulnerability:** Unfiltered body parsing allows attackers to inject `role: 'admin'` or `isBlocked: false` into `/api/auth/register` or `/api/auth/profile`.
- **Fix:**
  - `POST /api/auth/register` explicitly forces `role: 'customer'`, `isBlocked: false`, `failedLoginAttempts: 0`.
  - `PUT /api/auth/profile` uses Zod validation and only extracts `name`, `phone`, and `addresses`.
  - Admin promotion is only possible via authorized admin controllers.

### 3. Account Lockout & Brute-Force Protection

- **Vulnerability:** Unrestricted authentication attempts allow credential stuffing and automated dictionary attacks.
- **Fix:**
  - `authRateLimiter` limits IP attempts to 60 per 15-minute window.
  - Per-account failed login tracking locks the account for 15 minutes after 5 consecutive failed attempts, returning `423 Locked`.
  - Successful authentication clears the failed attempt counter.

### 4. Single-Use Password Reset Tokens

- **Vulnerability:** Reusable or non-expiring reset tokens, or returning tokens in API responses, allow account takeover.
- **Fix:**
  - Tokens are 32 bytes of cryptographic randomness.
  - Only the SHA-256 hash of the token is stored in the database (`resetPasswordToken: hashToken(rawToken)`).
  - Tokens expire in 60 minutes (`resetPasswordExpires: Date.now() + 3600000`).
  - Upon successful reset, the token and expiry are set to `null`, failed login attempts are cleared, and `tokenVersion` is bumped to invalidate any existing JWT sessions.
  - The raw token is NEVER returned in the API response in production.

### 5. ReDoS (Regular Expression Denial of Service)

- **Vulnerability:** Unsanitized user search terms passed into `new RegExp(search, 'i')` allow catastrophic backtracking expressions to monopolize the Node.js event loop.
- **Fix:**
  - `escapeRegex()` escapes all special characters: `str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`.
  - Applied across `MongoRepository.ts` and `JsonRepository.ts` for product searches, categories, and brands.

### 6. CSV Formula Injection Defense

- **Vulnerability:** Data exported to CSV containing `=cmd|...` or `-2+3` triggers formula execution in spreadsheet viewers.
- **Fix:**
  - `escapeCsvCell()` detects formula prefixes `/^[=+\-@\t\r]/` and prepends a single quote (`'`), neutralizing formula evaluation while maintaining readability.

---

## Dependency Vulnerability Audit (`npm audit`)

Running `npm audit` across both packages yielded:

- **`shopkart/backend`**: `found 0 vulnerabilities` (351 packages audited)
- **`shopkart/frontend`**: `found 0 vulnerabilities` (189 packages audited)

No unpatched vulnerabilities or vulnerable dependencies exist in either workspace.

---

## Automated Test Coverage & Verification

Automated testing consists of two complementary layers:

1. **Regression Smoke Test Suite (`scripts/smoke-all-modes.mjs`):**
   - 244 test assertions per storage mode covering Catalog, Auth, Cart, Wishlist, Orders, Coupons, Payments, Admin CRUD, Analytics, and Reports.
   - **Result:** 244/244 passed on JSON Store, 244/244 passed on MongoDB.
2. **Vitest + Supertest Unit & Integration Test Suite (`backend/tests/`):**
   - 44 tests across 8 suites: `auth.test.ts`, `cart.test.ts`, `orders.test.ts`, `coupons.test.ts`, `payments.test.ts`, `admin.test.ts`, `validation.test.ts`, `security.test.ts`.
   - **Result:** 44/44 passed (100% test success).
   - Route coverage verified with `@vitest/coverage-v8`.
