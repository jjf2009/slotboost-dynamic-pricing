# SlotBoost — College Demo Cheatsheet

## One command (live show)

```bash
# First time only
npm install
npx prisma db push

# Every rehearsal / presentation
npm run demo
```

After the first successful build (faster):

```bash
npm run demo:fast
```

### What you will see

1. Seeds **1 professional + 2 clients** (phone `8421012788`)
2. Production build + server (unless `demo:fast`)
3. **Slow headed browser** walks the full story while you read the `SAY:` lines
4. Browser **stays open ~45 minutes** for Q&A (you can click around)
5. Opens **Firefox / Chrome** to `/login` when available for extra windows
6. Local server keeps running until **Ctrl+C**

---

## Fixed logins (local + deployed)

| Role | Email | Password | Phone |
|------|-------|----------|-------|
| Professional | `demo.pro@slotboost.test` | `DemoPass123` | `8421012788` |
| Client A | `demo.client.a@slotboost.test` | `DemoPass123` | `8421012788` |
| Client B | `demo.client.b@slotboost.test` | `DemoPass123` | `8421012788` |

### Deployed site (Firefox + Chrome Q&A)

Yes — for professor Q&A you can open your **Vercel URL** in Firefox and Chrome and log in with the table above.

**Important:** `npm run demo:seed` only hits the DB in your local `.env`.  
If those accounts do not exist on production yet, either:

```bash
# one-time: point temporarily at production DATABASE_URL, then:
npm run demo:seed
```

…or register the same three accounts once on the live site.

Suggested Q&A layout:

- **Chrome** — professional (`demo.pro@…`)
- **Firefox** — client A or B (private window for the other client if needed)

---

## Pace controls (if still too fast / too slow)

```bash
# Slower narration (~6s between beats)
DEMO_STEP_MS=6000 npm run demo:fast

# Even slower
DEMO_STEP_MS=8000 npm run demo:fast

# Keep browser open 90 minutes after story
DEMO_HOLD_MS=5400000 npm run demo:fast
```

| Env | Default | Meaning |
|-----|---------|---------|
| `DEMO_STEP_MS` | `4500` | Pause after each major action |
| `DEMO_HOLD_MS` | `2700000` (45 min) | Keep Chromium open after story |
| `DEMO_SKIP_BUILD` | off | Use `demo:fast` instead |
| `DEMO_HEADED` | `1` | Set `0` only for CI |

---

## Narration cues (match autopilot)

1. **Pro login** — service-provider side  
2. **Settings** — base ₹1000, max discount 40%  
3. **Heat map** — low demand → bigger discounts  
4. **Create slot** — ~3h, low DI → live discount  
5. **Client A** — subscribe + book  
6. **Client B** — join waitlist  
7. **Client A cancel** — recovery window  
8. **Client B** — waitlist flash rebook  
9. **Pro dashboard** — slot booked again · **Q&A hold**

---

## Supporting commands

```bash
npm run demo:seed   # accounts + clean slate only
npm run demo:e2e    # story only (server must already be up)
npm run demo:fast   # full demo, skip rebuild
```

---

## Pre-demo checklist

- [ ] Local dry-run: `npm run demo:fast` once  
- [ ] Deployed logins work in Firefox + Chrome  
- [ ] Twilio sandbox joined for `8421012788` (optional)  
- [ ] Projector zoom 100–110%  
- [ ] Know Ctrl+C stops the local server only (not your deployed site)  
