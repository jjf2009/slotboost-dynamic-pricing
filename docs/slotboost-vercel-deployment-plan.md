# SlotBoost Vercel Deployment Plan

## Architecture overview

```mermaid
flowchart LR
  subgraph vercel [Vercel]
    NextApp[Next.js 15 App]
    CronRoute["GET /api/pricing/recalculate"]
    ApiRoutes[API Routes]
  end

  subgraph external [External Services]
    SupabaseDB[(Supabase Postgres)]
    Twilio[Twilio WhatsApp]
    OSRM[OSRM + Nominatim]
    ExtCron[External Cron every 15m]
  end

  User[Browser] --> NextApp
  NextApp --> ApiRoutes
  ApiRoutes --> SupabaseDB
  ApiRoutes --> Twilio
  ApiRoutes --> OSRM
  ExtCron -->|"Bearer CRON_SECRET"| CronRoute
  CronRoute --> SupabaseDB
  CronRoute --> Twilio
```

**Stack (source of truth):** JWT httpOnly cookies, Prisma + PostgreSQL, Twilio WhatsApp, OSRM/Nominatim (no API keys). Supabase Auth is **not** used — only Supabase Postgres.

---

## Phase 0 — One required code change before deploy

The repo is missing a Prisma client generation step for Vercel builds.

**Add to [`package.json`](package.json) scripts:**
```json
"postinstall": "prisma generate"
```

Without this, `next build` will fail because `@prisma/client` is not generated in CI/Vercel.

**Optional but recommended for Hobby (10s function timeout):** add to [`app/api/pricing/recalculate/route.ts`](app/api/pricing/recalculate/route.ts):
```ts
export const maxDuration = 10; // Hobby limit
export const runtime = "nodejs";
```

**Optional serverless DB tuning** in [`lib/db.ts`](lib/db.ts): set `max: 1` on the `pg` Pool to avoid exhausting Supabase connection limits under serverless concurrency.

---

## Phase 1 — Supabase Postgres setup

1. In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Settings → Database**.
2. Copy **two** connection strings (Prisma needs both per [`.env.example`](.env.example)):

| Vercel env var | Supabase source | Purpose |
|---|---|---|
| `DATABASE_URL` | **Transaction pooler** (port `6543`, `?pgbouncer=true`) | Runtime queries from Vercel serverless |
| `DIRECT_URL` | **Session/direct** connection (port `5432`) | `prisma db push` / migrations from your machine |

Example shape (replace placeholders):
```env
DATABASE_URL=postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[ref]:[PASSWORD]@db.[ref].supabase.co:5432/postgres
```

3. **Sync schema to production** (run locally once, before or right after first deploy):
```bash
DIRECT_URL="your-direct-url" npx prisma db push
```
The repo has no `prisma/migrations/` folder — production uses `db push`, not `migrate deploy`.

4. If connections fail from Vercel, add this Vercel env var (matches local dev script):
```env
NODE_OPTIONS=--dns-result-order=ipv4first
```

---

## Phase 2 — Generate secrets

Generate strong random values locally (do **not** use dev fallbacks in production):

```bash
openssl rand -base64 32   # → JWT_SECRET
openssl rand -base64 32   # → CRON_SECRET
```

`JWT_SECRET` is critical — [`lib/auth.ts`](lib/auth.ts) falls back to `fallback_secret_for_development` if unset.

---

## Phase 3 — Vercel project configuration

### Import from GitHub

1. Go to [vercel.com/new](https://vercel.com/new) → import your GitHub repo.
2. **Framework:** Next.js (auto-detected).
3. **Root directory:** repo root (trailing-space folder name is only local — GitHub repo should be normal).
4. **Build command:** `npm run build` (default).
5. **Install command:** `npm install` (triggers `postinstall` → `prisma generate`).
6. **Node.js version:** 20.x (matches `@types/node`).

### Environment variables (Vercel → Project → Settings → Environment Variables)

Set for **Production** (and Preview if you want staging):

| Variable | Required | Value / notes |
|---|---|---|
| `DATABASE_URL` | Yes | Supabase transaction pooler URL |
| `DIRECT_URL` | Yes | Supabase direct URL (used by Prisma CLI locally; safe to store in Vercel for future ops) |
| `JWT_SECRET` | Yes | Strong random string |
| `CRON_SECRET` | Yes | Strong random string; secures [`lib/cron-auth.ts`](lib/cron-auth.ts) |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://your-app.vercel.app` (or custom domain) |
| `TWILIO_ACCOUNT_SID` | For WhatsApp | From Twilio console |
| `TWILIO_AUTH_TOKEN` | For WhatsApp | From Twilio console |
| `TWILIO_WHATSAPP_NUMBER` | Optional | Listed in `.env.example`; [`app/api/notifications/send/route.ts`](app/api/notifications/send/route.ts) currently hardcodes sandbox `whatsapp:+14155238886` as `from` — update code if your sandbox number differs |
| `NODE_OPTIONS` | If DB DNS issues | `--dns-result-order=ipv4first` |

**Do not set** `NODE_ENV` manually — Vercel sets `production` automatically. Cookie `secure: true` in [`app/api/register/route.ts`](app/api/register/route.ts) and [`app/api/login/route.ts`](app/api/login/route.ts) depends on this.

**Not needed for deploy:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (legacy stubs in `lib/supabase/` — unused).

---

## Phase 4 — Cron: Hobby plan workaround (critical)

[`vercel.json`](vercel.json) schedules `*/15 * * * *`, but **Vercel Hobby only allows cron jobs that run once per day**. The 15-minute schedule will not work on your plan.

**Recommended approach:**

1. **Keep or soften `vercel.json`** — change to a daily fallback (optional):
```json
{
  "crons": [
    { "path": "/api/pricing/recalculate", "schedule": "0 5 * * *" }
  ]
}
```

2. **Primary scheduler — external cron (every 15 minutes):** use [cron-job.org](https://cron-job.org), GitHub Actions, or similar to call:
```
GET https://your-app.vercel.app/api/pricing/recalculate?secret=<CRON_SECRET>
```
[`lib/cron-auth.ts`](lib/cron-auth.ts) accepts either `?secret=` or `Authorization: Bearer <CRON_SECRET>`.

3. If you later upgrade to **Vercel Pro**, restore `*/15 * * * *` in `vercel.json`. Vercel auto-sends `Authorization: Bearer $CRON_SECRET` when `CRON_SECRET` is set.

**What the cron does:** recalculates slot prices, sends flash-deal alerts (FR-18), and 1-hour reminders (FR-24) via [`app/api/pricing/recalculate/route.ts`](app/api/pricing/recalculate/route.ts).

---

## Phase 5 — Twilio WhatsApp (production behavior)

- Without Twilio creds, notifications **log only** (no real sends) — fine for a dry run.
- With creds, real sandbox messages send using the hardcoded template SID in [`app/api/notifications/send/route.ts`](app/api/notifications/send/route.ts).
- Recipients must **join your Twilio WhatsApp sandbox** before they receive messages.
- Moving beyond sandbox requires Twilio-approved templates and a production WhatsApp sender (out of current MVP scope).

---

## Phase 6 — Deploy and verify

### Deploy
1. Commit the `postinstall` change (and any optional tuning).
2. Push to GitHub → Vercel auto-builds.
3. Watch build logs for: `prisma generate` success, `next build` success.

### Post-deploy smoke tests

| Check | How |
|---|---|
| App loads | Open `https://your-app.vercel.app` |
| DB connected | Register a professional via `/register` |
| Auth cookies | Land on `/professional/dashboard` after register |
| Cron auth | `curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/pricing/recalculate` → `200` JSON |
| Cron rejects bad secret | Same URL without secret → `401` |
| Booking flow | Create slot → open `/book/[slotId]` → book |
| Geo (mobile pro) | `POST /api/geo/check` with two addresses (free OSRM/Nominatim) |
| WhatsApp | Book a slot with a sandbox-joined phone number |

### Common failure modes

| Symptom | Fix |
|---|---|
| Build: `DATABASE_URL is not defined` | Add `DATABASE_URL` to Vercel env **before** redeploy |
| Build: Prisma client missing | Ensure `postinstall: prisma generate` |
| `P1001` / connection timeout | Use pooler URL for `DATABASE_URL`; add `NODE_OPTIONS=--dns-result-order=ipv4first` |
| Register works locally, 500 on Vercel | Run `npx prisma db push` against production `DIRECT_URL` |
| Prices never update | External 15-min cron not configured (Hobby limitation) |
| WhatsApp silent | Missing Twilio env vars or recipient not in sandbox |

---

## Phase 7 — Optional hardening (post-MVP)

- Add a **custom domain** in Vercel → update `NEXT_PUBLIC_APP_URL`.
- Replace `db push` with **`prisma migrate`** for safer schema changes.
- Upgrade to **Vercel Pro** for native 15-min cron and longer function duration.
- Remove dead Supabase client files (`lib/supabase/`, `hooks/use-live-slot.ts`) to reduce confusion.
- Add a Vercel **Preview** environment with a separate Supabase branch/database.

---

## Summary checklist

- [ ] Add `"postinstall": "prisma generate"` to `package.json`
- [ ] Create Supabase Postgres; copy pooler + direct URLs
- [ ] Run `npx prisma db push` against production `DIRECT_URL`
- [ ] Generate `JWT_SECRET` and `CRON_SECRET`
- [ ] Import GitHub repo in Vercel; set all env vars
- [ ] Set `NEXT_PUBLIC_APP_URL` to production URL
- [ ] Configure **external cron every 15 min** (Hobby plan)
- [ ] Deploy; run smoke tests above
- [ ] (Optional) Set Twilio creds + join sandbox numbers for WhatsApp demo