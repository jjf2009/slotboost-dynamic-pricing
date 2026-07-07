# SlotBoost — MVP Status (code-aligned)

> **Reference:** SRS v1.0 | **Last aligned with code:** July 2026  
> This document describes **what the repository actually implements today**, not aspirational SRS wording.

---

## ✅ Implemented

| FR / Area | Requirement | Source of truth |
|-----------|-------------|-----------------|
| FR-01 / FR-08 | Register (professional & client) | `app/api/register/route.ts`, `lib/services/auth.service.ts` |
| FR-02 / FR-03 | Base price & D_max | `app/api/professional/profile/route.ts` |
| FR-04 | Heat map (7×24 DI) | `app/api/professional/heatmap/route.ts`, `lib/heatmap.ts` |
| FR-05 / FR-06 | Create / delete slots | `app/api/slots/route.ts`, `app/api/slots/[id]/route.ts` |
| FR-07 | Professional dashboard | `app/professional/dashboard/page.tsx` — prices computed server-side on each request |
| FR-09 | Client browse | `app/client/browse/`, `app/client/professionals/[id]/` |
| FR-10 / FR-11 | Flash-deal subscribe / unsubscribe | `app/api/subscribers/route.ts`, `components/flash-deal-toggle.tsx` |
| FR-12 | Join waitlist | `app/api/waitlist/join/route.ts` |
| FR-13–17 | Pricing formula | `lib/pricing.ts` |
| FR-18 | Flash-deal alerts at H threshold crossings | `lib/flash-deal-trigger.ts` + `app/api/pricing/recalculate/route.ts` — fires when H crosses below **24h** or **2h** (not on every price drop) |
| FR-19 | Price freeze on booking | `app/api/slots/book/route.ts` |
| FR-20 | Atomic booking | `app/api/slots/book/route.ts` (Prisma `$transaction`, `updateMany` claim) |
| FR-21 | Booking confirmation WhatsApp | `app/api/notifications/send/route.ts` (`type: confirmation`) — **real Twilio sandbox sends**, not console.log |
| FR-22 | Client cancel + D_cancel | `app/api/slots/cancel/route.ts` |
| FR-23 | Professional cancel + client notify | `app/api/slots/cancel/route.ts`, `type: professional_cancel` |
| FR-24 | 1-hour reminder | `app/api/pricing/recalculate/route.ts` (45–75 min window, `reminder_sent` on `Slot`) |
| FR-25 | Waitlist autopilot on cancel | `type: waitlist_autopilot` in notifications route |
| FR-26 | 10-minute waitlist offer UI | `app/waitlist/[slotId]/page.tsx`, `POST /api/waitlist/book` |
| FR-27 | FCFS waitlist + slot-filled notify | Waitlist membership enforced in `app/api/waitlist/book/route.ts`; `type: slot_filled` WhatsApp to remaining waitlist |
| FR-28–30 | Geo-check (OSRM + Nominatim) | `app/api/geo/check/route.ts`, called from `app/api/slots/book/route.ts` for `is_mobile` professionals |
| NFR-03 | JWT + bcrypt | `lib/auth.ts`, `lib/services/auth.service.ts` |
| NFR-07 / NFR-08 | Prisma schema + pure pricing fn | `prisma/schema.prisma`, `lib/pricing.ts` |
| Cron | 15-min price recalc | `vercel.json` → `GET /api/pricing/recalculate` |
| Cron auth | CRON_SECRET required | `lib/cron-auth.ts` — `Authorization: Bearer` or `?secret=`; **401** if missing/invalid |
| Tests | Unit + integration (Vitest) | `tests/unit/`, `tests/integration/`, `npm test` |

---

## ⚠️ Partially implemented / known gaps

| Item | Status | Notes |
|------|--------|-------|
| **FR-23 refund** | Notify only | WhatsApp sent; no Razorpay refund (payments out of scope) |
| **FR-31–33 Flex Credits** | Schema only | `Subscription` model in `prisma/schema.prisma`; **no API or UI** |
| **UC-19 / UC-20** | Not built | Subscription purchase & off-peak credit enforcement not implemented |
| **PWA (SRS §2.4)** | Not started | No manifest, service worker, or install flow |
| **Live price push** | Not implemented | Prices refresh on **page load**, **user action**, and **15-min cron** — not via websocket/realtime subscription |
| **D_max wording** | Cap on discount % | D_max limits total discount (0–60%), not a minimum price floor |

---

## 🗑️ Known unused code (pending cleanup — do not document as active)

| File | Notes |
|------|-------|
| `store/authStore.ts` | Zustand store defined but **never imported**; auth uses JWT cookies, not this store |
| `hooks/use-live-slot.ts` | Supabase Realtime hook — **never imported**; dead code |
| `lib/supabase/client.ts`, `lib/supabase/server.ts` | Legacy Supabase client stubs; app data layer is Prisma |

---

## ❌ Out of scope (stretch / not built)

| Area | Notes |
|------|-------|
| **Razorpay / FR-31 payments** | Stretch goal per SRS §8.2; automated tests should `.skip()` |
| **Google Maps geo** | Replaced in implementation by OSRM + Nominatim (free) |
| **Supabase Auth / DB** | Not used; JWT + Prisma + PostgreSQL |

---

## 🧪 Manual test reference

See [`test.md`](test.md) for step-by-step demo rehearsal. Automated tests: `npm test`.

---

## Summary

| Category | Status |
|----------|--------|
| Core pricing engine | ✅ |
| Booking + double-book prevention | ✅ |
| Cancellation + waitlist autopilot | ✅ |
| Waitlist membership gate (403) | ✅ |
| Twilio WhatsApp notifications | ✅ (sandbox) |
| Cron auth (CRON_SECRET) | ✅ |
| FR-18 threshold-based flash alerts | ✅ |
| Geo-check in booking (OSRM) | ✅ |
| Flex Credits / subscriptions UI | 🔴 Schema only |
| PWA | 🔴 Not started |
| Razorpay | 🔴 Stretch / not built |