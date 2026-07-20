# SlotBoost — Testing Guide

## Quick start

```bash
npm install
npx prisma generate

# Unit + integration (no running server required)
npm test

# Unit only
npm run test:unit

# Integration only (mocked DB routes + optional real DB auth tests)
npm run test:integration

# Coverage
npm run test:coverage

# E2E (starts dev server, requires DATABASE_URL)
npm run test:e2e

# College live demo (seed + production server + headed story)
npm run demo
# After first build: npm run demo:fast
# Seed only: npm run demo:seed
```

See **[DEMO_CHEATSHEET.md](DEMO_CHEATSHEET.md)** for fixed logins (`demo.pro@…` / Client A / Client B, phone `8421012788`) and narration steps.

Copy `.env.example` → `.env.local` and fill in at minimum:

- `DATABASE_URL` / `DIRECT_URL` — required for DB-backed integration & E2E
- `JWT_SECRET` — auth tests
- `CRON_SECRET` — pricing cron tests
- `TWILIO_*` — optional; notification tests mock Twilio by default
- `TEST_PHONE_NUMBER` — optional; when set with real Twilio creds, live sandbox sends target this number only

## Test layout

```
tests/
├── unit/           # Pure logic (pricing, heatmap, cron-auth, flash-deal)
├── integration/    # API route handlers (mocked Prisma + optional real DB)
├── e2e/            # Playwright browser + API concurrency
└── helpers/        # auth tokens, DB teardown, request builders
```

## What's mocked vs real

| Area | Default in CI/local | Real when configured |
|------|---------------------|----------------------|
| Pricing formula | Real (`lib/pricing.ts`) | — |
| API route DB | **Mocked** in most integration tests | Auth register/login suite uses real Prisma if `DATABASE_URL` set |
| Geo OSRM/Nominatim | **Mocked** `fetch` in integration | — |
| Twilio | **Mocked** `twilio` package | Set `TWILIO_ACCOUNT_SID` + `TEST_PHONE_NUMBER` for live sandbox |
| E2E browser | Real Next.js dev server | Requires `DATABASE_URL` |
| Cron secret | Test value from `tests/setup.ts` | — |

## E2E dual-context patterns

- **concurrency.spec.ts** — two isolated `APIRequestContext`s race `POST /api/slots/book`
- **client-booking.spec.ts** — mobile viewport (`Pixel 5` project) books via `/book/[slotId]`
- Prices do **not** update live without refresh — assert after navigation/reload

## Skipped features (`.skip()`)

See `tests/integration/skipped-features.test.ts`:

- Flex Credits FR-31–33 (schema only)
- PWA / service worker
- Zustand `authStore` (unused)
- Supabase Realtime (`use-live-slot.ts` dead code)
- Razorpay payments

## Data cleanup

- E2E creates real rows via API; use a dedicated test database or periodic manual cleanup.
- `tests/helpers/db.ts` tracks IDs for integration tests that opt into real DB and deletes in `afterAll`.

## Known gaps (cannot fully automate)

- **Instant cross-session price sync** — not implemented; no websocket assertions
- **10-minute waitlist window E2E** — use API time manipulation in integration layer; full UI wait is avoided to prevent flake
- **Twilio delivery proof** — integration asserts API `success: true`; SID verification only with real creds + `TEST_PHONE_NUMBER`

## Reference

Full feature matrix: [TEST_PLAN.md](TEST_PLAN.md)  
Manual demo script: [test.md](test.md)