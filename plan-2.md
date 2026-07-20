# Plan: One-Command Live Demo Autopilot (College Presentation)

## Goal

Make this repo a **demo-only presentation system** you control with **one terminal command**.

You run:

```bash
npm run demo
```

The system then:

1. Resets demo data and ensures 1 professional + 2 clients exist  
2. Starts the site in a **fast production mode**  
3. Opens a **visible browser** that walks the full user story by itself  
4. Prints **narration cues** in the terminal so you only explain to professors  

No manual register. No clicking through flows mid-presentation. You talk; the UI proves it.

---

## Fixed demo accounts (same as before)

| Role | Email | Password | Phone (Twilio sandbox) |
|------|-------|----------|------------------------|
| Professional | `demo.pro@slotboost.test` | `DemoPass123` | `8421012788` |
| Client A | `demo.client.a@slotboost.test` | `DemoPass123` | `8421012788` |
| Client B | `demo.client.b@slotboost.test` | `DemoPass123` | `8421012788` |

- Login is **email + password** (JWT cookie). Phone is for WhatsApp notifications only.  
- Same phone on all accounts is intentional so every sandbox WhatsApp hits your number.

---

## Constraints you added (how they change the design)

### 1. “Mostly only this system”

- Demo harness is first-class, not a side CI test.
- One primary path: `npm run demo`.
- Supporting commands (`demo:seed`, `demo:e2e`) exist for rehearsal/debug only.

### 2. “Prove the story works”

- Keep a full professor story as an automated headed walkthrough.
- Story is the source of truth (from `docs/test.md` Final Demo Rehearsal), not random e2e accounts.

### 3. “One command; website works on its own; I just explain”

`npm run demo` is an **orchestrator**, not only a test:

| Phase | What happens | What you do |
|-------|--------------|-------------|
| Prepare | seed accounts + clean slots/bookings | wait ~few seconds |
| Build/start | production server for quick page loads | wait for “Demo server ready” |
| Autopilot | headed Chromium drives the full flow slowly | **narrate** using terminal cues |
| End | browser leaves final dashboard open; server stays up | Q&A with professors |

### 4. “Use my NVIDIA GPU so it loads quickly”

Honest technical boundary (important for college demo credibility):

| Layer | Does NVIDIA GPU help? | What we will do |
|-------|----------------------|-----------------|
| Next.js / Node / Prisma / API | **No** — CPU + RAM + DB | Use **production build** (`next build` + `next start`) so pages load much faster than `next dev` |
| Browser UI (smooth scrolling, paint, animations) | **Yes** — GPU compositing | Launch Chromium with **hardware acceleration** + NVIDIA offload env vars on Linux |
| Twilio / Postgres | No | Keep sandbox config as-is |

So “GPU for speed” means:

- **Real speed win:** production server (biggest difference for Next apps).  
- **GPU win:** smoother visible browser during autopilot, not faster SQL.

The demo runner will:

1. Detect NVIDIA (`nvidia-smi`) and print `GPU: detected / not found`.  
2. If detected, export Linux hybrid-GPU helpers when useful:  
   - `__NV_PRIME_RENDER_OFFLOAD=1`  
   - `__GLX_VENDOR_LIBRARY_NAME=nvidia`  
   - `VDPAU_DRIVER=nvidia` (best-effort)  
3. Launch Playwright Chromium headed with GPU-friendly flags, e.g.:  
   - `--enable-gpu`  
   - `--ignore-gpu-blocklist`  
   - avoid pure software-render flags  
4. Prefer a warm production server so first paint is quick when the browser opens.

If drivers/session can’t use NVIDIA (common on some remote/WSL setups), demo still runs on CPU; script will not hard-fail.

---

## One-command experience (demo day)

```bash
# first time on machine only
npm install
npx prisma db push   # if schema not applied yet

# every rehearsal / live show
npm run demo
```

What you should see in the terminal:

```
[1/4] Seeding demo accounts (pro + client A/B, phone 8421012788)...
[2/4] Building production app (fast loads)...
[3/4] Starting server on http://localhost:3000  |  GPU: NVIDIA detected
[4/4] Opening demo autopilot browser...

▶ STEP 1 — Professional login
   SAY: "This is the service provider side — tutors, clinics, etc."
...
▶ STEP 7 — Client B rebooks via waitlist recovery
   SAY: "Cancellation activated a 10-minute recovery discount; waitlist client books it."

✅ Story complete. Server still running for Q&A.
   Press Ctrl+C to stop.
```

Browser window stays visible the whole time with deliberate pauses (`slowMo` + step delays ~1.5–3s) so professors can follow.

---

## Architecture

```
npm run demo
    │
    ▼
scripts/run-demo.ts          ← single orchestrator
    │
    ├─► scripts/demo-seed.ts              (accounts + clean slate + starter slot)
    ├─► next build (skip if DEMO_SKIP_BUILD=1 and .next exists)
    ├─► next start (production)           (fast page loads)
    └─► playwright headed demo-flow       (auto user story + terminal narration)
            uses tests/demo/credentials.ts
            uses tests/e2e/demo-flow.spec.ts (or tests/demo/autopilot.spec.ts)
```

### Optional supporting commands

```bash
npm run demo:seed     # reset data only
npm run demo:e2e      # headless proof (CI/rehearsal without presentation UI)
npm run demo:fast     # same as demo but skip rebuild if .next already present
```

---

## Story the browser will play (prove it works)

Same professor path as `docs/test.md`, fully automated:

1. **Pro login** → professional dashboard  
2. **Settings** → base price ₹1000, max discount 40% (show persistence)  
3. **Heatmap / demand** → low DI cell so discount story is clear  
4. **Create / show slot** under 24h with low demand → discounted `current_price`  
5. **Client A login** → browse pro → subscribe (flash deals) → **book**  
6. **Client B login** → join **waitlist** on booked slot  
7. **Client A cancel** → slot recovers, D_cancel window active  
8. **Client B waitlist book** → rebooked; price frozen  
9. **Final shot** → pro dashboard shows recovered booking  

Key features covered while you talk: roles, pricing engine, booking, double-booking safety (optional short race step if stable), waitlist, cancellation recovery, WhatsApp sandbox to `8421012788`.

---

## Implementation details

### 1. Shared credentials

**New:** `tests/demo/credentials.ts`

- Fixed emails, password `DemoPass123`, phone `8421012788`
- Step titles + short “SAY:” lines for terminal narration

### 2. Seed script

**New:** `scripts/demo-seed.ts`

- Idempotent upsert of pro + 2 clients  
- Always reset password to known demo value  
- Set phone on all profiles  
- Delete only demo-owned slots/bookings/waitlists/subscribers (FK-safe)  
- Create one available starter slot ~8h ahead, DI `0.2`, price via `calculatePrice`  
- Print credentials cheat-sheet  

### 3. Autopilot Playwright suite

**New:** `tests/e2e/demo-flow.spec.ts` (or `tests/demo/autopilot.spec.ts`)

- Uses fixed logins only (not random `@slotboost.test` timestamps)  
- Headed by default when launched from orchestrator  
- `slowMo: 400–700` + explicit waits after each major action  
- After each step, write a clear line to stdout (narration cue)  
- Prefer real UI clicks for professor visibility; use API only for flaky edges  
- Soft-handle Twilio: UI success is enough; real WhatsApp if env configured  

**Helpers:** `tests/demo/login.ts`

- `loginAs(page, role)`  
- `logout(page)` if needed between roles (or isolated browser contexts — **prefer 1 window with login/logout** so professors see one screen; optional second context for “two clients racing” if we include that beat)

### 4. Orchestrator (the one command)

**New:** `scripts/run-demo.ts`

Responsibilities:

1. Load `.env.local` / `.env`  
2. Fail fast with clear message if `DATABASE_URL` / `JWT_SECRET` missing  
3. Run seed  
4. Detect NVIDIA GPU; set env for browser  
5. `next build` (or skip with `DEMO_SKIP_BUILD=1`)  
6. Spawn `next start` on `NEXT_PUBLIC_APP_URL` (default `http://localhost:3000`)  
7. Wait until server health (HTTP 200 on `/login` or `/`)  
8. Run Playwright:  
   - headed  
   - project chromium  
   - GPU launch args  
   - workers 1  
9. On finish: keep server alive, print Q&A credentials, wait for Ctrl+C  
10. Cleanup child processes on exit  

### 5. package.json scripts

```json
"demo": "npx tsx scripts/run-demo.ts",
"demo:fast": "DEMO_SKIP_BUILD=1 npx tsx scripts/run-demo.ts",
"demo:seed": "npx tsx scripts/demo-seed.ts",
"demo:e2e": "playwright test tests/e2e/demo-flow.spec.ts --project=chromium"
```

Add devDependency: `tsx` (if not already present).

### 6. Docs for you (short)

**New:** `docs/DEMO_CHEATSHEET.md`

- One-command usage  
- Credentials table  
- Narration script matching autopilot steps  
- GPU note (production = speed; NVIDIA = smooth browser)  
- Pre-demo checklist: DB up, Twilio sandbox joined for `8421012788`, projector resolution  

Update `docs/TESTING.md` with a short pointer to the demo command.

---

## Performance defaults for demo

| Setting | Choice | Why |
|---------|--------|-----|
| Server mode | Production (`next start`) | Much faster than `next dev` for live demo |
| First run | Full `next build` | Warm `.next` cache |
| Rehearsals | `npm run demo:fast` | Skip rebuild when code unchanged |
| Browser | Headed Chromium + GPU flags | Smooth visible UI |
| Parallelism | 1 worker | Stable single-story narration |
| Data | Clean seed every run | Story always starts the same |

---

## Out of scope

- Making Node/Prisma “run on CUDA” (not applicable; misleading for this stack)  
- Razorpay / Flex Credits / PWA (not implemented)  
- Manual multi-account register flow as the primary path  
- Deleting non-demo users  
- Real-time websocket price sync (not in product)

---

## Implementation order

1. `tests/demo/credentials.ts` + narration step text  
2. `scripts/demo-seed.ts` + `demo:seed` — verify 3 logins work  
3. Autopilot Playwright flow with slow visible steps + terminal cues  
4. `scripts/run-demo.ts` orchestrator: seed → build → start → headed play  
5. GPU detect + Chromium launch args  
6. `npm run demo` / `demo:fast` / docs cheatsheet  
7. Full dry-run once on your machine before presentation day  

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Build takes long on first `npm run demo` | Use `demo:fast` after first successful build; start early before professors arrive |
| NVIDIA not available in session | Fall back to CPU; production server still fast |
| Demo data dirty from last run | Seed always wipes demo-owned operational rows |
| WhatsApp fails live | UI still completes; server logs simulation/SID |
| Autopilot too fast for narration | Tunable `DEMO_STEP_MS` (default ~2000ms) |
| Port 3000 busy | Orchestrator prints clear error; optional `PORT` / `NEXT_PUBLIC_APP_URL` |

---

## Success criteria

- **One command:** `npm run demo` alone is enough for the live show after `npm install` + DB schema once.  
- Browser **self-drives** the full professor story while you only explain.  
- Fixed pro + 2 clients always work with the same password/phone.  
- Production server makes page transitions feel quick.  
- When NVIDIA is present, browser launches with GPU acceleration env/flags.  
- Re-running `npm run demo` restores a clean, repeatable story every time.

## Estimated effort

Medium but focused: orchestrator + seed + one autopilot spec + scripts/docs. No product feature rewrite.
