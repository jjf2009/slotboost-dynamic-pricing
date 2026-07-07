# SlotBoost — Automated Test Plan (Phase 0 Discovery)

> Generated from code + markdown cross-check | July 2026  
> **Code is source of truth.** Docs that disagree are flagged below; tests target implemented behavior.

---

## 1. Markdown sources scanned

| File | Role |
|------|------|
| [README.md](README.md) | Feature list, tech stack, env vars, project structure |
| [SRS.MD](SRS.MD) | FR-01–FR-33, NFR-01–08, use cases UC-01–UC-03 (+ UC-19/20 in schema only) |
| [test.md](test.md) | Manual MVP test plan (Modules 0–12 + demo rehearsal) |
| [STATUS.md](STATUS.md) | Code-aligned implementation matrix |
| [design.md](design.md) | Algorithms, ER/DFD (academic; some references outdated vs code) |
| [agent.md](agent.md) | Historical scaffold; superseded by README/STATUS for runtime behavior |

No other `**/*.md` files exist. No `docs/`, `.github/` test specs, or nested READMEs.

---

## 2. Actual tech stack (test environment implications)

| Layer | Documented (older) | **Actual (test against this)** |
|-------|-------------------|--------------------------------|
| Auth | Supabase SSR | JWT httpOnly cookies — `lib/getUser.ts`, `lib/auth.ts`, `lib/services/auth.service.ts` |
| Database | Supabase Postgres | Prisma + PostgreSQL — `DATABASE_URL`, `prisma/schema.prisma` |
| Geo | Google Maps | OSRM + Nominatim — `app/api/geo/check/route.ts` |
| Notifications | Twilio (some docs said stub) | Twilio WhatsApp sandbox — `app/api/notifications/send/route.ts` |
| Live prices | Supabase Realtime | Server-side `calculatePrice()` on page load + 15-min cron; `hooks/use-live-slot.ts` **unused** |
| State | Zustand | `store/authStore.ts` **unused** |
| Cron auth | README CRON_SECRET | **Enforced** — `lib/cron-auth.ts` on `GET /api/pricing/recalculate` |

### Environment variables (from `.env.example`)

| Variable | Tests |
|----------|-------|
| `DATABASE_URL` / `DIRECT_URL` | **Real** Postgres for integration/E2E; teardown required |
| `JWT_SECRET` | Integration/E2E auth cookie injection |
| `CRON_SECRET` | Integration tests for pricing cron |
| `TWILIO_*` | Optional live sends to `TEST_PHONE_NUMBER` (to add); else assert API response only |
| `NEXT_PUBLIC_APP_URL` | E2E base URL |

**Not used:** `NEXT_PUBLIC_SUPABASE_*` (remove from test setup assumptions).

### Existing test tooling

| Tool | Status |
|------|--------|
| Vitest | Installed — `vitest.config.ts`, scripts: `test`, `test:unit`, `test:integration`, `test:watch`, `test:coverage` |
| Playwright | Installed — `playwright.config.ts`, `npm run test:e2e` |
| Existing tests | See [TESTING.md](TESTING.md) for current counts |

---

## 3. Doc ↔ code contradictions (explicit flags)

| # | Docs say | Code does | Test implication |
|---|----------|-----------|------------------|
| 1 | Supabase Auth/DB (README old, agent.md, design.md sequence diagram) | JWT + Prisma | E2E uses cookie auth, not Supabase session |
| 2 | Google Maps geo (SRS FR-28–30, design.md) | OSRM + Nominatim | Mock/freeze external HTTP in geo integration tests |
| 3 | Live realtime price sync (README “Live Price Updates”, agent.md §9) | Server render + cron only | E2E: refresh/poll assertions, not instant websocket sync |
| 4 | Zustand auth store (README stack) | `authStore` never imported | **Skip** Zustand tests unless store is wired |
| 5 | Flex Credits / UC-19/20 (SRS §3.7) | `Subscription` model only | **`.skip()`** all subscription tests |
| 6 | PWA installable (SRS §2.4) | Not built | **`.skip()`** PWA tests |
| 7 | Razorpay FR-31 stretch | Not built | **`.skip()`** per test.md |
| 8 | design.md still shows Google/Supabase | Academic artifact | Ignore for test scope; use SRS.MD (updated) + STATUS.md |
| 9 | D_max as “pricing floor” (README marketing) | D_max caps **discount %** (0–60%), not min price | Unit tests use discount-cap semantics from `lib/pricing.ts` |

---

## 4. Feature inventory → coverage tier

Legend: **Side** = Professional | Client | System/Cron | **Tier** = Unit | Integration | E2E

### A. Pricing engine

| Feature | Source | Side | Tier | Code | Test status |
|---------|--------|------|------|------|-------------|
| D_lead step function (0/10/15/20/25%) | SRS FR-14, design.md, test.md Mod 5 | System | Unit | `lib/pricing.ts` | **TODO** |
| D_peak = 0.15 × (1 − DI) | SRS FR-15 | System | Unit | `lib/pricing.ts` | **TODO** |
| D_cancel 15% in 10-min window | SRS FR-16 | System | Unit | `lib/pricing.ts` | **TODO** |
| D_max discount cap | SRS FR-17 | System | Unit | `lib/pricing.ts` | **TODO** |
| Monotonic discount as H decreases | Master prompt A | System | Unit | `lib/pricing.ts` | **TODO** |
| Edge: past slot, H at bucket boundaries | Master prompt A | System | Unit | `lib/pricing.ts` | **TODO** |
| Edge: d_max = 0 (zero discount room) | Master prompt A | System | Unit | `lib/pricing.ts` | **TODO** |
| 7×24 heatmap DI lookup | SRS FR-04, README | Professional | Unit | `lib/heatmap.ts` | **TODO** |
| Legacy heatmap key normalization | — | Professional | Unit | `lib/heatmap.ts` | **TODO** |
| FR-18 flash alert thresholds (24h, 2h) | SRS FR-18, STATUS.md | System | Unit | `lib/flash-deal-trigger.ts` | **Done** (7 tests) |
| Cron recalc updates DB prices | SRS FR-13, test.md Mod 5 | System | Integration | `app/api/pricing/recalculate/route.ts` | **TODO** |
| Cron CRON_SECRET auth | README, lib/cron-auth | System | Unit + Integration | `lib/cron-auth.ts` | **Done** (4 unit); integration **TODO** |
| D_cancel expiry cleanup on cron | design.md | System | Integration | recalculate route | **TODO** |
| Reminder 45–75 min window (FR-24) | SRS FR-24, STATUS.md | System | Integration | recalculate route | **TODO** |

### B. Authentication & accounts

| Feature | Source | Side | Tier | Code | Test status |
|---------|--------|------|------|------|-------------|
| Professional register (FR-01) | SRS, test.md Mod 1 | Professional | E2E + Integration | `app/api/register/route.ts` | **TODO** |
| Client register (FR-08) | SRS, test.md Mod 1 | Client | E2E + Integration | same | **TODO** |
| Login / logout / session cookie | test.md Mod 1 | Both | E2E + Integration | `login`, `auth/logout`, `auth/me` | **TODO** |
| Register/login Zod validation | Master prompt E | Both | Integration | Zod in register/login routes | **TODO** |
| bcrypt 12 rounds (NFR-03) | SRS | System | Integration | `auth.service.ts` | **TODO** (optional) |

### C. Professional flows

| Feature | Source | Side | Tier | Code | Test status |
|---------|--------|------|------|------|-------------|
| Set base_price & d_max (FR-02/03) | test.md Mod 2 | Professional | E2E + Integration | `api/professional/profile` | **TODO** |
| Profile Zod bounds (100–50000, d_max 0–0.6) | SRS | Professional | Integration | profile route | **TODO** |
| Configure heatmap (FR-04) | test.md Mod 3 | Professional | E2E + Integration | `professional/heatmap`, `api/professional/heatmap` | **TODO** |
| Heatmap Zod key format | SRS FR-04 | Professional | Integration | heatmap route | **TODO** |
| Create slot (FR-05) | test.md Mod 4 | Professional | E2E + Integration | `professional/slots/new`, `POST /api/slots` | **TODO** |
| Delete slot, block if booked (FR-06) | SRS | Professional | Integration + E2E | `DELETE /api/slots/[id]` | **TODO** |
| Dashboard prices + status (FR-07) | test.md Mod 4 | Professional | E2E | `professional/dashboard` | **TODO** — assert on refresh, not push |
| Professional cancel + notify (FR-23) | STATUS.md | Professional | Integration + E2E | `api/slots/cancel`, `professional_cancel` notify | **TODO** |
| View waitlist count on dashboard | test.md | Professional | E2E | dashboard `_count` | **TODO** |

### D. Client flows

| Feature | Source | Side | Tier | Code | Test status |
|---------|--------|------|------|------|-------------|
| Browse professionals/slots (FR-09) | test.md Mod 6 | Client | E2E | `client/browse`, `client/professionals/[id]` | **TODO** |
| Subscribe/unsubscribe flash deals (FR-10/11) | test.md Mod 6 | Client | E2E + Integration | `flash-deal-toggle`, `api/subscribers` | **TODO** |
| Book slot (FR-20) mobile viewport | test.md Mod 7, README | Client | E2E | `book/[slotId]`, `BookingForm`, `POST /api/slots/book` | **TODO** |
| Price freeze (FR-19) | SRS | Client | Integration | book route | **TODO** |
| Join waitlist (FR-12) | test.md Mod 9 | Client | E2E + Integration | `JoinWaitlistButton`, `api/waitlist/join` | **TODO** |
| Client cancel (FR-22) | test.md Mod 10 | Client | E2E + Integration | `CancelBookingDialog`, cancel route | **TODO** |
| View bookings | — | Client | E2E | `client/bookings`, `api/client/bookings` | **TODO** |
| Geo-block mobile pro (FR-28/29) | test.md Mod 12 | Client | Integration (+ E2E opt) | book route → geo check | **TODO** — mock OSRM |
| Geo fallback (FR-30) | test.md Mod 12C | System | Integration | `api/geo/check` | **TODO** |
| Double-booking 409 (FR-20) | test.md Mod 8 | Client | E2E (2 contexts) | `api/slots/book` | **TODO** |

### E. Waitlist autopilot & notifications

| Feature | Source | Side | Tier | Code | Test status |
|---------|--------|------|------|------|-------------|
| Waitlist autopilot on cancel (FR-25) | test.md Mod 10 | System | Integration | cancel → `waitlist_autopilot` notify | **TODO** |
| 10-min offer window (FR-26) | test.md Mod 11 | Client | E2E + Integration | `waitlist/[slotId]`, `api/waitlist/book` | **TODO** |
| Waitlist membership 403 | test.md Mod 11 | Client | Integration | `api/waitlist/book` | **Done** (1 test) |
| Waitlist book success 201 | test.md Mod 11 | Client | Integration | `api/waitlist/book` | **Done** (1 test) |
| Slot-filled WhatsApp (FR-27) | SRS, STATUS | System | Integration | `slot_filled` in notifications/send | **TODO** — assert fetch/API, optional Twilio |
| Booking confirmation (FR-21) | test.md Mod 7 | System | Integration | `confirmation` notify type | **TODO** |
| Flash-deal to subscribers (FR-18) | test.md Mod 6 | System | Integration | recalculate → `flash_deal` | **TODO** |
| Reminder (FR-24) | STATUS.md | System | Integration | recalculate → `reminder` | **TODO** |

### F. Cross-role / concurrency (E2E — dual Playwright contexts)

| Scenario | Source | Tier | Notes |
|----------|--------|------|-------|
| Cancel → waitlist client books in 10 min | test.md rehearsal | E2E | Refresh dashboard; no realtime |
| Two clients race same slot | test.md Mod 8 | E2E | Expect one 201, one 409 |
| Two clients race waitlist offer | Master prompt D | E2E | FCFS + 409 on loser |
| Pro dashboard reflects new booking | Master prompt D | E2E | Reload after client books |

### G. API route matrix (integration — auth & validation)

| Route | Auth | Zod | Priority tests |
|-------|------|-----|----------------|
| `POST /api/register` | Public | Yes | 400 invalid, 201 valid, 409 duplicate |
| `POST /api/login` | Public | Yes | 400, 200, 409 bad creds |
| `GET /api/auth/me` | JWT | — | 401 without cookie |
| `POST /api/auth/logout` | — | — | Cookie cleared |
| `PUT /api/professional/profile` | JWT pro | Yes | 401, 400 bounds |
| `PUT /api/professional/heatmap` | JWT pro | Yes | 400 bad keys |
| `POST /api/slots` | JWT pro | Manual | 401, 400 past date |
| `DELETE /api/slots/[id]` | JWT pro | — | 409 if booked |
| `POST /api/slots/book` | Optional | Manual | 409, 403 geo |
| `POST /api/slots/cancel` | JWT | Manual | 401, 403 |
| `POST /api/waitlist/join` | Optional | Manual | 409 duplicate |
| `POST /api/waitlist/book` | Optional | Manual | 403, 410 expired |
| `POST /api/subscribers` | JWT client | Yes | 409 duplicate |
| `GET /api/pricing/recalculate` | CRON_SECRET | — | 401, 200 with secret |
| `POST /api/geo/check` | Public | Manual | allowed/blocked/fallback |
| `POST /api/notifications/send` | **None** | Manual | 400/404; mock Twilio |

### H. Non-functional

| Item | Source | Tier | Status |
|------|--------|------|--------|
| Booking flow a11y (labels, keyboard) | Master prompt F | E2E | **TODO** — `@axe-core/playwright` |
| Mobile viewport booking snapshot | README, Master prompt F | E2E | **TODO** — 390×844 Playwright |

### I. Explicitly skip (not implemented)

| Feature | Source | Reason |
|---------|--------|--------|
| Flex Credits FR-31–33 | SRS §3.7 | Schema only — no API/UI |
| UC-19 / UC-20 | SRS use cases | Not built |
| Razorpay payments | SRS §8.2, test.md | Stretch goal |
| PWA / service worker | SRS §2.4 | Not started |
| Supabase Realtime live sync | agent.md | Dead hook |
| Zustand store transitions | Master prompt Phase 1 | `authStore` unused |
| Professional waitlist manual override | Master prompt B | No such route found |
| Instant cross-session price sync | Master prompt D | Polling/refresh only |

---

## 5. Mapped to test.md modules

| Module | Automated coverage plan |
|--------|-------------------------|
| 0 Setup | CI script: `prisma validate`, `npm test`, `npm run build` |
| 1 Auth | E2E dual role + integration register/login/me |
| 2 Profile settings | E2E + integration profile PUT |
| 3 Heatmap | E2E + integration heatmap PUT/GET |
| 4 Slot creation | E2E + integration POST /api/slots |
| 5 Pricing engine | Unit `pricing.ts` + integration cron with secret |
| 6 Browse + subscribe | E2E + integration subscribers |
| 7 Normal booking | E2E mobile + integration book |
| 8 Double booking | E2E two client contexts |
| 9 Waitlist join | E2E + integration join |
| 10 Cancellation recovery | E2E + integration cancel + notify |
| 11 Waitlist autopilot page | E2E + integration book (403 partial **done**) |
| 12 Geo-check | Integration mock OSRM; optional E2E |

---

## 6. Phase 1 setup checklist

- [x] Playwright + `playwright.config.ts` (desktop + mobile projects)
- [x] `test:e2e`, `test:coverage` scripts
- [x] `TEST_PHONE_NUMBER` in `.env.example`
- [x] `tests/helpers/db.ts`, `auth.ts`, `request.ts`
- [x] `TESTING.md`

---

## 7. Current test count baseline

| Suite | Files | Tests | Status |
|-------|-------|-------|--------|
| Unit | 2 | 11 | Passing |
| Integration | 1 | 2 | Passing |
| E2E | 0 | 0 | Not started |
| **Total** | **3** | **13** | `npm test` |

---

## 8. Sanity-check summary for review

**Ready to test (implemented):** Full pricing formula, heatmap, JWT auth, slot CRUD, atomic booking, cancellation + D_cancel, waitlist join/book with 403 gate, Twilio WhatsApp notifications, OSRM geo in booking, cron with CRON_SECRET, FR-18 threshold alerts, slot_filled notify.

**Do not test (flag only):** Flex Credits, Razorpay, PWA, Supabase Realtime, Zustand store.

**Test environment:** Use **Prisma/PostgreSQL** (`DATABASE_URL`), not Supabase. Twilio optional with `TEST_PHONE_NUMBER`. Geo integration should mock Nominatim/OSRM HTTP.

**Biggest flake risk:** Time-driven slots and 10-min D_cancel windows — use `vi.setSystemTime()` in unit/integration and API-level setup in E2E, not `sleep(600000)`.

**Phase 1–2 implemented.** Run `npm test` and `npm run test:e2e` (E2E requires `DATABASE_URL` + dev server).