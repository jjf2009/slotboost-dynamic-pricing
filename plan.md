# Plan: College Demo Automation (Fixed Accounts + Key-Feature Flow)

## Goal

Automate demo setup so you can run one command, log in with fixed accounts, and walk through SlotBoost’s key features without manually creating users/slots every time.

**Accounts you asked for**

| Role | Login email (fixed) | Password | Phone (sandbox) |
|------|---------------------|----------|-----------------|
| Professional | `demo.pro@slotboost.test` | `DemoPass123` | `8421012788` |
| Client A | `demo.client.a@slotboost.test` | `DemoPass123` | `8421012788` |
| Client B | `demo.client.b@slotboost.test` | `DemoPass123` | `8421012788` |

**Important fact about this codebase**

- Login is **email + password** (JWT cookie), not OTP by phone.
- Phone is stored on professional/client profiles and used for **Twilio WhatsApp sandbox** notifications.
- Using the same number `8421012788` for all three is intentional for your sandbox: every booking / waitlist / flash-deal WhatsApp goes to your phone.

---

## What already exists (reuse, don’t reinvent)

- Manual professor script: [`docs/test.md`](docs/test.md) → “Final Demo Rehearsal Flow”
- E2E helpers that register via API: [`tests/e2e/helpers.ts`](tests/e2e/helpers.ts)
- Playwright already configured: [`playwright.config.ts`](playwright.config.ts)
- Auth service supports create + login: [`lib/services/auth.service.ts`](lib/services/auth.service.ts)
- No seed/demo scripts yet (`package.json` has only unit/integration/e2e)

Existing E2E tests create **random one-off accounts** each run. That is fine for CI, but bad for a live college demo. This plan adds a **fixed demo harness** alongside them.

---

## Recommended approach (two layers)

### Layer 1 — `demo:seed` (setup before the demo)

Idempotent Prisma script that:

1. Upserts 1 professional + 2 clients with fixed emails/password/phone.
2. Ensures professional profile is demo-ready (base price, max discount, service type, heatmap).
3. Clears old demo-owned slots/bookings/waitlists/subscribers (clean slate).
4. Optionally creates a **starter available slot** ~6–8 hours from now (low demand) so pricing discount is visible immediately.
5. Prints a short credentials cheat-sheet to the terminal.

### Layer 2 — `demo:e2e` (proves the story works)

One Playwright suite that uses the **same fixed logins** and exercises the professor flow end-to-end:

1. Pro login → settings persist (base price / D_max)
2. Pro creates (or uses seeded) low-demand slot
3. Client A login → browse/subscribe → book
4. Client B login → join waitlist on booked slot
5. Client A cancel → cancellation recovery window
6. Client B waitlist book → slot rebooked

You can also run it **headed** during rehearsal (`--headed`) so the browser walks the flow while you narrate.

---

## Demo-day usage (what you will actually run)

```bash
# Once per machine / after DB reset
npx prisma db push

# Reset + create fixed accounts + clean demo data
npm run demo:seed

# Optional: fully automated proof (headless)
npm run demo:e2e

# Optional: visible browser walkthrough for rehearsal
npm run demo:e2e -- --headed --project=chromium

# Live presentation
npm run dev
# then log in with the three fixed accounts printed by demo:seed
```

Between rehearsals, re-run `npm run demo:seed` to wipe demo bookings/slots and restore a clean start state **without re-registering manually**.

---

## Implementation details

### 1. Shared demo constants

**New file:** `tests/demo/credentials.ts`

```ts
export const DEMO_PHONE = "8421012788";
export const DEMO_PASSWORD = "DemoPass123";
export const DEMO = {
  pro: { email: "demo.pro@slotboost.test", name: "Demo Professional", serviceType: "Tutor" },
  clientA: { email: "demo.client.a@slotboost.test", name: "Demo Client A" },
  clientB: { email: "demo.client.b@slotboost.test", name: "Demo Client B" },
} as const;
```

Single source of truth for seed + e2e + docs.

### 2. Seed script

**New file:** `scripts/demo-seed.ts`  
**Script:** `"demo:seed": "npx tsx scripts/demo-seed.ts"` (add `tsx` as devDependency if needed)

Steps:

1. Load env from `.env.local` / `.env` (same pattern as Playwright config).
2. Connect via existing Prisma adapter pattern from `lib/db.ts` (or lightweight Prisma client like `tests/helpers/db.ts`).
3. For each of the 3 emails:
   - If user missing → create with bcrypt hash (12 rounds, same as auth service).
   - If user exists → update password hash to known demo password (so login never drifts).
   - Ensure linked `professional` or `client` row exists; set `phone = 8421012788`.
4. Professional defaults for a strong demo:
   - `base_price: 1000`
   - `d_max: 0.4`
   - `service_type: "Tutor"`
   - simple heatmap with at least one low DI cell (e.g. evening/off-peak)
5. Cleanup demo-owned operational data only (do **not** wipe non-demo users):
   - find professional/client IDs for demo emails
   - delete bookings → waitlists → subscribers → slots for those IDs (FK-safe order, same idea as `tests/helpers/db.ts`)
6. Create one available demo slot:
   - start ~8 hours from now
   - duration 60
   - demand_index `0.2` (shows lead + peak discount)
   - compute `current_price` with `calculatePrice` from `lib/pricing.ts`
7. Console output:

```
✅ Demo ready
Professional: demo.pro@slotboost.test / DemoPass123
Client A:     demo.client.a@slotboost.test / DemoPass123
Client B:     demo.client.b@slotboost.test / DemoPass123
Phone (all):  8421012788  → WhatsApp sandbox
Starter slot: <id>  (~8h, available)
```

### 3. Demo E2E suite (fixed logins)

**New file:** `tests/e2e/demo-flow.spec.ts`  
**Script:** `"demo:e2e": "playwright test tests/e2e/demo-flow.spec.ts --project=chromium"`

Helpers to add in `tests/e2e/helpers.ts` (or `tests/demo/login.ts`):

- `loginAs(page, email, password)` — fill `/login`, wait for role dashboard
- reuse API helpers only where UI would be flaky (cancel/waitlist edge timing)

Flow assertions (map to your existing manual modules):

| Step | Actor | Assertion |
|------|-------|-----------|
| Login pro | Pro | lands on `/professional/dashboard` |
| Settings | Pro | base price / D_max save + persist after reload |
| Create slot | Pro | slot listed `available` with discounted price if H&lt;24 |
| Login A | Client A | `/client/dashboard` |
| Subscribe + book | Client A | booking confirmed; slot becomes `booked` |
| Login B | Client B | join waitlist succeeds |
| Cancel | Client A | booking cancelled; D_cancel window active |
| Waitlist book | Client B | books recovered slot; price frozen |

Skip / soft-assert Twilio delivery if credentials missing (code already logs simulation). When Twilio is configured, seed phone ensures messages hit your sandbox number.

### 4. Small docs update

**Update:** [`docs/TESTING.md`](docs/TESTING.md) (short section only)

- How to seed demo accounts
- Credentials table
- `demo:e2e` vs normal `test:e2e`
- Reminder: Twilio sandbox must have your number joined; app formats 10-digit Indian numbers as `whatsapp:+918421012788` in `app/api/notifications/send/route.ts`

Optional one-pager: `docs/DEMO_CHEATSHEET.md` with the professor narration steps from `docs/test.md` plus the fixed logins.

### 5. package.json scripts

```json
"demo:seed": "npx tsx scripts/demo-seed.ts",
"demo:e2e": "playwright test tests/e2e/demo-flow.spec.ts --project=chromium",
"demo:reset": "npx tsx scripts/demo-seed.ts"
```

(`demo:reset` can alias seed — same idempotent cleanup.)

---

## What you will show live (key features covered)

Aligned with `docs/test.md` Final Demo Rehearsal:

1. **Auth & roles** — pro vs two clients, middleware redirect
2. **Professional pricing controls** — base price + max discount
3. **Heatmap / demand** — low DI drives higher peak discount
4. **Dynamic pricing** — slot under 24h shows lead-time discount
5. **Client browse + book** — Client A books, WhatsApp confirmation (sandbox)
6. **Double-booking safety** (optional quick API race from existing `concurrency.spec.ts` if time)
7. **Waitlist** — Client B joins booked slot
8. **Cancellation recovery** — Client A cancels → 10-min D_cancel window
9. **Waitlist autopilot rebook** — Client B books recovered slot

---

## Out of scope (unless you ask later)

- Automating Razorpay / Flex Credits (not implemented — already skipped in tests)
- Real multi-device OTP login (not how auth works)
- Destroying non-demo production data
- Full 10-minute UI wait for waitlist expiry (use API/state checks; avoid flaky long waits)

---

## Implementation order

1. Add `tests/demo/credentials.ts`
2. Add `scripts/demo-seed.ts` + `demo:seed` script; verify login works in browser for all 3
3. Add login helper + `tests/e2e/demo-flow.spec.ts` covering the full professor story
4. Wire `demo:e2e` script; run once headless to confirm green
5. Short docs/cheatsheet update for demo day

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Demo emails already taken with unknown password | Seed always re-hashes password to `DemoPass123` |
| Leftover booked slots break the story | Seed deletes only demo-owned slots/bookings/waitlists |
| WhatsApp fails during live demo | App falls back to console simulation; still show booking UI success |
| Slot time drifts into past mid-rehearsal | Seed creates ~8h-ahead slots; re-run `demo:seed` before show |
| Accidental wipe of real data | Cleanup scoped strictly to demo emails / their profile IDs |

---

## Success criteria

- `npm run demo:seed` alone prepares all 3 logins and a clean professional with phone `8421012788`
- You can open three browsers (or one + logout/login) and complete the professor flow without registering anything
- `npm run demo:e2e` passes against local DB + running app
- Re-running seed between rehearsals restores a clean start state in under ~30 seconds

## Estimated effort

Small, self-contained change set: ~3–4 new files, 1 helper extension, 2–3 npm scripts, short docs section. No product auth redesign required.
