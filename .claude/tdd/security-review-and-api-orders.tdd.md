# TDD Evidence Report: Security Review & Orders API Hardening

**Task**: Security review checklist & TDD test suite for menu schedule and orders API  
**Date**: 2026-10-29  
**Status**: COMPLETE (All 22 automated tests passing)

---

## 1. User Journeys

1. **Menu Explorer**:
   - *As a customer*, I want to fetch the daily menu for any of the 7 days (`SATURDAY` through `FRIDAY`) so that I can see the day-specific specials alongside everyday staples.
2. **Order Submitter**:
   - *As a customer*, I want to submit my order with valid Bangladeshi contact details and address so that my order is recorded and prepared.
3. **Abuse Prevention**:
   - *As a platform owner*, I want invalid phone formats, empty carts, and bot/spam order submissions throttled (max 10 per IP per 15 mins) and sanitized against XSS so that the database and customer notifications stay secure.
4. **Financial Integrity**:
   - *As a business owner*, I want menu item prices and delivery fees to be calculated authoritatively on the server from Neon PostgreSQL so that client price tampering cannot change order totals.

---

## 2. Test Specification & Guarantees

| # | What is Guaranteed | Test Name / Location | Type | Result | Evidence |
|---|--------------------|----------------------|------|--------|----------|
| 1 | `.env` is ignored by git and `.env.local` is protected | `tests/api.test.ts: .gitignore exists and ignores .env` | Security / Unit | PASS | `.gitignore` verified |
| 2 | No Neon credentials (`DATABASE_URL`) bundled or referenced in `src/` client files | `tests/api.test.ts: No Neon credentials in src/ client files` | Security / Unit | PASS | Codebase static analysis passed |
| 3 | `GET /api/menu/:day` returns 200 with day-specific items and everyday staples for all 7 days | `tests/api.test.ts: GET /api/menu/${day} (SATURDAY - FRIDAY)` | API / Integration | PASS | All 7 days verified against Neon DB |
| 4 | `GET /api/menu/INVALID_DAY` rejected with HTTP 400 | `tests/api.test.ts: GET /api/menu/INVALID_DAY` | API / Integration | PASS | Returns `INVALID_DAY` 400 |
| 5 | `POST /api/orders` rejects empty cart (`items: []`) | `tests/api.test.ts: Rejects empty cart` | API / Validation | PASS | Returns HTTP 422 |
| 6 | `POST /api/orders` rejects missing `items` field | `tests/api.test.ts: Rejects missing items array` | API / Validation | PASS | Returns HTTP 422 |
| 7 | `POST /api/orders` rejects invalid BD phone numbers (too short, operator 012, non-numeric, too long) | `tests/api.test.ts: Rejects invalid BD phone` (6 variants) | API / Validation | PASS | Returns HTTP 422 |
| 8 | Valid order persisted into Neon PostgreSQL with HTTP 201, `BB-` order number, and authoritative fees | `tests/api.test.ts: Persists valid order into Neon PostgreSQL` | Database / Integration | PASS | HTTP 201 + verified in `orders` and `order_items` tables |
| 9 | Client price tampering (injected `subtotalBdt`, `totalBdt`, `unitPriceBdt`) is ignored; server calculates authoritatively | `tests/api.test.ts: Tampering with prices in client payload` | Security / Integration | PASS | Authoritative subtotal and total persisted |
| 10 | String inputs (`customerName`, `customerAddress`, `notes`) stripped of `<script>`, `<img>`, and HTML tags | `tests/api.test.ts: Sanitizes HTML / script tags` | Security / Integration | PASS | Stored values sanitized without XSS payloads |
| 11 | Rate limiting on `POST /api/orders` blocks requests exceeding 10 orders / 15 minutes per IP with HTTP 429 | `tests/api.test.ts: Enforces max 10 order submissions per IP` | Security / Rate Limiting | PASS | 10 succeeded (201), 11th returned 429, separate IP allowed |

---

## 3. Execution Evidence Excerpt

```text
> figma-make-app@1.0.0 test
> node --import tsx/esm --test tests/**/*.test.ts

▶ Banglar Biriyani API & Security Test Suite (TDD)
  ▶ Security Checklist & Secrets Management
    ✔ .gitignore exists and ignores .env and .env.local (1.6582ms)
    ✔ No Neon credentials (DATABASE_URL) are bundled or referenced in src/ client files (6.5647ms)
  ✔ Security Checklist & Secrets Management (9.2768ms)
  ▶ GET /api/menu/:day for all 7 days
    ✔ GET /api/menu/SATURDAY returns 200 with day-specific items and everyday staples (2564.1702ms)
    ✔ GET /api/menu/SUNDAY returns 200 with day-specific items and everyday staples (1855.8271ms)
    ✔ GET /api/menu/MONDAY returns 200 with day-specific items and everyday staples (318.5165ms)
    ✔ GET /api/menu/TUESDAY returns 200 with day-specific items and everyday staples (553.0153ms)
    ✔ GET /api/menu/WEDNESDAY returns 200 with day-specific items and everyday staples (1405.8819ms)
    ✔ GET /api/menu/THURSDAY returns 200 with day-specific items and everyday staples (539.129ms)
    ✔ GET /api/menu/FRIDAY returns 200 with day-specific items and everyday staples (2256.5737ms)
    ✔ GET /api/menu/INVALID_DAY returns HTTP 400 with descriptive error (3.9437ms)
  ✔ GET /api/menu/:day for all 7 days (9500.2538ms)
  ▶ POST /api/orders validation and persistence
    ✔ Rejects empty cart with HTTP 422 or 400 (37.2204ms)
    ✔ Rejects missing items array with HTTP 422 or 400 (4.5963ms)
    ✔ Rejects invalid BD phone "12345" with HTTP 422/400 (8.7729ms)
    ✔ Rejects invalid BD phone "01212345678" with HTTP 422/400 (5.1592ms)
    ✔ Rejects invalid BD phone "0171234567890" with HTTP 422/400 (4.458ms)
    ✔ Rejects invalid BD phone "01712-345678" with HTTP 422/400 (3.6284ms)
    ✔ Rejects invalid BD phone "+15551234567" with HTTP 422/400 (3.2221ms)
    ✔ Rejects invalid BD phone "abcdefghijk" with HTTP 422/400 (2.8357ms)
    ✔ Persists valid order into Neon PostgreSQL with HTTP 201 (6383.3186ms)
  ✔ POST /api/orders validation and persistence (7385.4155ms)
  ▶ Price Tampering Resistance
    ✔ Tampering with prices in client payload does NOT alter subtotalBdt or totalBdt (2489.5961ms)
  ✔ Price Tampering Resistance (2490.2242ms)
  ▶ Input Sanitization on POST /api/orders
    ✔ Sanitizes HTML / script tags from customerName, customerAddress, and notes (6077.9754ms)
  ✔ Input Sanitization on POST /api/orders (6078.4785ms)
  ▶ Rate-Limiting on POST /api/orders
    ✔ Enforces max 10 order submissions per IP per 15 minutes (30324.0381ms)
  ✔ Rate-Limiting on POST /api/orders (30324.2609ms)
✔ Banglar Biriyani API & Security Test Suite (TDD) (55790.4021ms)
ℹ tests 22
ℹ suites 7
ℹ pass 22
ℹ fail 0
ℹ duration_ms 57490.4307
```

