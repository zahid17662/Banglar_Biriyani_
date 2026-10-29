# Banglar Biriyani Auth, Phone Normalization & RBAC TDD Evidence Report

**Date**: 2026-10-30  
**Test Runner**: Vitest `v5.0.5`  
**Test Suite**: `tests/auth-rbac.test.ts` (39 tests) + full test suite across 4 files (110 tests total)  
**Status**: 100% GREEN (0 errors, 0 failures)

---

## 1. User Journeys & Acceptance Criteria

- **User Journey 1: Bangladesh Phone Number Normalization**
  - *As a customer* registering or logging in using either `+88017...`, `88017...`, or canonical `017...` formats (with or without spaces, hyphens, or parentheses),
  - *I want* the system to canonicalize my phone number to 11-digit `01XXXXXXXXX` format,
  - *So that* I can authenticate reliably regardless of how I type my phone number, and duplicate phone accounts are prevented.

- **User Journey 2: Case-Insensitive Email Authentication**
  - *As a customer* entering my email address in uppercase, lowercase, or mixed case with surrounding whitespace (e.g. `   CuStOmEr@BanglarBiriyani.Com   `),
  - *I want* to log in seamlessly without casing errors,
  - *So that* mobile keyboard auto-capitalization does not prevent me from signing in.

- **User Journey 3: Zero-Leak Guarantee for `passwordHash`**
  - *As a security reviewer*,
  - *I want* to ensure that `passwordHash` is never exposed in any API response payload (`/api/auth/*` or `/api/admin/users`),
  - *So that* user credentials cannot be scraped or exposed.

- **User Journey 4: Strict Unauthenticated Access Protection**
  - *As an unauthenticated visitor*,
  - *I want* any request to protected `/api/admin/*` endpoints to return HTTP 401 Unauthorized with structured error JSON,
  - *So that* unauthorized access to restaurant metrics, schedules, orders, and user lists is impossible.

- **User Journey 5: Role-Based Access Control (RBAC)**
  - *As a customer*, any attempt to call `/api/admin/*` routes must return HTTP 403 Forbidden.
  - *As a kitchen staff member*, I can view statistics (`/stats`), view/update schedules (`/schedule`), and manage live orders (`/orders`), but I am strictly blocked (HTTP 403 Forbidden) from creating or deleting menu items and managing user accounts/roles.
  - *As an administrator*, I have full management access, but I am blocked (HTTP 403 Forbidden) from demoting my own role or deactivating my own account.

---

## 2. Test Execution & Evidence

### Initial Test Run (RED Evidence)
- **Command**: `npx vitest run tests/auth-rbac.test.ts`
- **Output**:
  ```
  FAIL tests/auth-rbac.test.ts > 1. Bangladesh Phone Normalization Tests > normalizeBdPhone helper accurately canonicalizes all Bangladesh formats
  AssertionError: Expected values to be strictly equal:
  + actual: '+88(017)11000003'
  - expected: '01711000003'
  ```
- **Root Cause**: `normalizeBdPhone` in `server/utils/auth.ts` only stripped spaces and hyphens (`/[\s-]/g`), leaving parentheses intact and failing international formats with non-digit punctuation.

### Minimal Fix Applied
- Enhanced `normalizeBdPhone` in `server/utils/auth.ts` to strip `[\s\-\(\)\.]` and canonicalize `+8801...`, `+881...`, `8801...`, and `881...` to `01XXXXXXXXX`.
- Enhanced `signupSchema` and `updateProfileSchema` in `server/validators/authSchema.ts` with `.transform((val) => normalizeBdPhone(val))` and `.refine((val) => /^01[3-9]\d{8}$/.test(val))`.
- Updated `POST /api/auth/signup` and `POST /api/auth/login` in `server/routes/auth.ts` to use `ilike(users.email, ...)` for case-insensitive email matching.
- Enhanced `setSessionCookie` and `clearSessionCookie` in `server/utils/auth.ts` to enforce `secure: isProd && isHttps` so cookies persist seamlessly on local development/preview (`http://localhost:*`).

### Final Test Run (GREEN Evidence)
- **Command**: `npm test` (`vitest run`)
- **Output**:
  ```
  Test Files  4 passed (4)
       Tests  110 passed (110)
    Duration  44.81s
  ```
- **TypeScript**: `npx tsc --noEmit` -> 0 errors.
- **Vite Build**: `npm run build` -> Built clean in 528ms.
- **Code Formatting**: `npm run format -- --check` -> 60/60 files compliant.

---

## 3. Test Specification & Verification Matrix

| # | What is Guaranteed | Test File & Target | Test Type | Result | Evidence Command |
|---|--------------------|--------------------|-----------|--------|------------------|
| 1 | `normalizeBdPhone` converts all BD formats to `01XXXXXXXXX` | `tests/auth-rbac.test.ts:1. Bangladesh Phone Normalization Tests` | Unit | PASS | `npx vitest run tests/auth-rbac.test.ts` |
| 2 | `POST /api/auth/signup` stores canonical phone in database | `tests/auth-rbac.test.ts:normalizes +8801... phone` | Integration | PASS | `npx vitest run tests/auth-rbac.test.ts` |
| 3 | `POST /api/auth/signup` rejects duplicate phone in alternate format (409) | `tests/auth-rbac.test.ts:prevents duplicate phone` | Integration | PASS | `npx vitest run tests/auth-rbac.test.ts` |
| 4 | `POST /api/auth/login` accepts `+8801...`, `8801...`, and `01...` | `tests/auth-rbac.test.ts:login succeeds using prefix formats` | Integration | PASS | `npx vitest run tests/auth-rbac.test.ts` |
| 5 | Case-insensitive email login (`UPPERCASE`, `MixedCase`) succeeds | `tests/auth-rbac.test.ts:2. Case-Insensitive Email Authentication Tests` | Integration | PASS | `npx vitest run tests/auth-rbac.test.ts` |
| 6 | Duplicate signup with case-variant email returns 409 Conflict | `tests/auth-rbac.test.ts:rejects duplicate email with different casing` | Integration | PASS | `npx vitest run tests/auth-rbac.test.ts` |
| 7 | `passwordHash` is absent in `/api/auth/me`, `/profile`, `/admin/users`, and role update | `tests/auth-rbac.test.ts:3. passwordHash Exposure Prevention Audit` | Integration | PASS | `npx vitest run tests/auth-rbac.test.ts` |
| 8 | Unauthenticated requests to `/api/admin/*` return 401 Unauthorized | `tests/auth-rbac.test.ts:4. Unauthenticated Admin Route Protection` | Integration | PASS | `npx vitest run tests/auth-rbac.test.ts` |
| 9 | `CUSTOMER` role blocked from all `/api/admin/*` endpoints (403) | `tests/auth-rbac.test.ts:5. Customer Role RBAC Restriction` | Integration | PASS | `npx vitest run tests/auth-rbac.test.ts` |
| 10 | `STAFF` role allowed on stats, schedule, and orders (200) | `tests/auth-rbac.test.ts:6. Staff Role RBAC Permissions & Restrictions` | Integration | PASS | `npx vitest run tests/auth-rbac.test.ts` |
| 11 | `STAFF` blocked from menu deletion/creation and user role management (403) | `tests/auth-rbac.test.ts:Staff CANNOT delete/create menu items or view users` | Integration | PASS | `npx vitest run tests/auth-rbac.test.ts` |
| 12 | `ADMIN` blocked from self-demotion and self-deactivation (403) | `tests/auth-rbac.test.ts:7. Admin Management & Self-Protection Guardrails` | Integration | PASS | `npx vitest run tests/auth-rbac.test.ts` |
| 13 | `ADMIN` can update other users' roles | `tests/auth-rbac.test.ts:Admin CAN promote and demote other users` | Integration | PASS | `npx vitest run tests/auth-rbac.test.ts` |

