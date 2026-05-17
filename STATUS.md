# SlotBoost — MVP Status & What's Left To Do

> **Reference:** SRS v1.0 (IEEE 830) | **Date:** May 2026
> This document cross-references **actual code files** against every SRS requirement.
> Only things that are genuinely feasible for MVP and unlock testing are listed as TODO.

---

> **🎉 UPDATE:** All MVP features are now **100% complete**. The project has officially transitioned into the **Testing Phase**. Please refer to `TESTING_PLAN.md` for the test implementation strategy (Unit → Module → E2E).

---

## ✅ What Is Already Done

| FR / NFR | Requirement | File(s) |
|----------|-------------|---------|
| FR-01 | Professional registration | `app/(auth)/register/` |
| FR-08 | Client registration | `app/(auth)/register/` |
| FR-02/03 | Set BasePrice & D_max | `app/api/professional/profile/route.ts` |
| FR-04 | Configure Heat Map (DI values) | `app/api/professional/heatmap/route.ts` |
| FR-05 | Create appointment slots | `app/api/slots/route.ts` |
| FR-06 | Delete slot (blocks if booked) | `app/api/slots/[id]/route.ts` |
| FR-07 | Professional Dashboard (price + status) | `app/professional/dashboard/page.tsx` |
| FR-09 | Client — browse available slots | `app/client/browse/` |
| FR-13 | Calculate CurrentPrice formula | `lib/pricing.ts` (pure function, fully correct) |
| FR-14 | Apply D_lead step function | `lib/pricing.ts` |
| FR-15 | Apply D_peak = 0.15 × (1 − DI) | `lib/pricing.ts` |
| FR-16 | Apply D_cancel on cancellation | `lib/pricing.ts` |
| FR-17 | Enforce D_max cap | `lib/pricing.ts` |
| FR-19 | Price freeze on booking | `app/api/slots/book/route.ts` (recalculates at moment of booking) |
| FR-20 | Book slot atomically (DB transaction) | `app/api/slots/book/route.ts` (Prisma `$transaction`) |
| FR-22 | Client cancellation + D_cancel trigger | `app/api/slots/cancel/route.ts` |
| FR-25 | Notify waitlist on cancellation (autopilot) | `app/api/notifications/send/route.ts` (type=`waitlist_autopilot`) |
| FR-12 | Client joins waitlist | `app/api/waitlist/join/route.ts` |
| FR-10 | Opt-in to flash-deal notifications | `app/api/subscribers/route.ts` |
| FR-11 | Opt-out from notifications | `app/api/subscribers/route.ts` (DELETE) |
| FR-28/30 | Geo-check (OSRM & Nominatim - 100% Free routing/geocoding) | `app/api/geo/check/route.ts` |
| NFR-03 | JWT auth, bcrypt passwords | `lib/auth.ts` |
| NFR-07 | Referential integrity, FK constraints | `prisma/schema.prisma` |
| NFR-08 | Pricing formula as single testable function | `lib/pricing.ts` |
| Cron | Pricing engine runs every 15 min | `vercel.json` → `GET /api/pricing/recalculate` |
| Cron | Flash-deal SMS triggered on first price drop | `app/api/pricing/recalculate/route.ts` |
| DB | All 6 SRS tables exist | `prisma/schema.prisma` |

---

## ⚠️ Partially Done (Stubs — Need Completion for MVP)

### 1. SMS / WhatsApp Notifications are STUBBED (Console.log only)
**File:** `app/api/notifications/send/route.ts`

Every notification type (confirmation, flash deal, waitlist autopilot) **logs to console** instead of calling Twilio. The Twilio lines exist but are commented out.

**What to do:**
```
// [TWILIO] lines are already written — just uncomment them.
// Also install the Twilio package: npm install twilio
// Add env vars to .env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
```
**Impact:** Without this, zero SMS/WhatsApp alerts are sent. The entire notification system (FR-18, FR-21, FR-24, FR-25, FR-26, FR-27) is silently broken.

---

### 2. Booking Confirmation SMS is Fire-and-Forget but Untested (FR-21)
**File:** `app/api/slots/book/route.ts` (line 73)

The `fetch()` call to `/api/notifications/send` is fire-and-forget with `.catch(console.error)`. Once Twilio is uncommented this will work, but the `price` field is passed correctly. ✅ Logic is correct — just depends on #1 above.

---

### 3. Reminder SMS (FR-24) — NOT implemented
**Requirement:** Send reminder SMS to client **1 hour before** appointment.

**Currently:** No reminder scheduler exists. The cancel route does NOT schedule a reminder.

**What to do (minimal):**
- In `app/api/slots/book/route.ts`, after booking is confirmed, fire a call to a new `/api/notifications/reminder` endpoint with the slot time.
- On Vercel, use a **delayed cron** or simply enhance the existing 15-min `/api/pricing/recalculate` to also check for slots starting in ~1 hour and send a reminder if not already sent.
- Add a `reminder_sent` boolean column to the `Slot` model in `schema.prisma`.

---

### 4. Waitlist 10-Minute Window UI (FR-26) — Page exists, booking not wired
**File:** `app/waitlist/[slotId]/` — page folder exists but no `page.tsx` contents confirmed.

**What to do:**
- Build `app/waitlist/[slotId]/page.tsx` that:
  1. Fetches the slot and checks `d_cancel_expires_at` — if expired, show "Offer expired."
  2. Shows the countdown timer (10 min) and the discounted price.
  3. Has a "Book Now" button that calls `POST /api/slots/book`.

---

### 5. Professional Cancellation (FR-23) — Not yet separated from client cancellation
**File:** `app/api/slots/cancel/route.ts`

The cancel API does handle auth correctly (checks `isClient || isProfessional`), but the SRS says **professional cancellation must issue a full refund and notify the client**. The notification side is stubbed (see #1), and there's no refund logic (Razorpay is out of scope for MVP — a console log "Refund issued" is fine for now).

**What to do (minimal):**
- In `cancel/route.ts`, detect if the canceller is the professional and send a `type: "professional_cancel"` notification to the client's phone.
- Add that notification type to `notifications/send/route.ts`.

---

### 6. Geo-Check not called during Booking Flow (FR-28/29)
**File:** `app/api/geo/check/route.ts` — exists and works.

But `app/api/slots/book/route.ts` **does NOT call the geo check** before creating the booking.

**What to do:**
- In `book/route.ts`, after verifying the slot is available, check if `slot.professional.is_mobile === true`.
- If yes, call `geoCheck(origin, destination, slot.start_time)` — or directly call the Google Maps API inline.
- If `allowed === false`, return HTTP 403 with message "This professional is not available in your area for this time slot."

---

## ❌ Not Started (Out of MVP Scope — Don't Build Now)

| FR / Area | Reason to Skip for MVP |
|-----------|----------------------|
| **FR-31/32/33 Subscriptions (Razorpay)** | Explicitly marked as *stretch goal for Sprint 6* in SRS §8.2. No payment tables need to be live. |
| **Meta WhatsApp template approval** | Takes 1–3 business days + Meta review. Use Twilio sandbox for testing. |
| **PWA Service Worker** | Nice-to-have, not a functional requirement for testing the booking flow. |
| **Admin dashboard** | Not in SRS scope. |
| **Automated test suite** | Needed eventually, but manual testing of MVP flows is sufficient to start. |

---

## 🚀 Exact To-Do List — In Priority Order

Complete these **in this order** to have a fully testable MVP:

```
[x] 1. Uncomment Twilio lines in app/api/notifications/send/route.ts
        → npm install twilio
        → Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER to .env

[x] 2. Add geo-check call inside app/api/slots/book/route.ts
        → After slot availability check, before booking creation
        → Only for is_mobile === true professionals
        → Return 403 with SRS error message if travel > 30 min

[x] 3. Build app/waitlist/[slotId]/page.tsx
        → Show countdown timer from d_cancel_expires_at
        → Show discounted price
        → "Book Now" button → POST /api/slots/book
        → Show "Offer expired" if time has passed

[x] 4. Add reminder notification to booking flow (FR-24)
        → Add reminder_sent Boolean @default(false) to Slot in schema.prisma
        → In /api/pricing/recalculate: find slots starting in 45–75 min,
          reminder_sent = false → fire notification → set reminder_sent = true

[x] 5. Add professional_cancel notification type (FR-23)
        → In cancel/route.ts: if canceller is professional, send notification to client
        → Add type: "professional_cancel" case in notifications/send/route.ts
```

---

## 🧪 How to Test the MVP Once Above Steps Are Done

| Test Scenario | Steps | Verifies |
|---------------|-------|---------|
| **Flash deal flow** | Register pro, create slot 20 hrs away, trigger `/api/pricing/recalculate`, check SMS fired | FR-13, FR-14, FR-18 |
| **Book a slot** | Register client, browse, book slot, check confirmation SMS to both parties | FR-20, FR-21 |
| **Double-booking prevention** | Two clients try to book same slot simultaneously | FR-20 (atomic transaction) |
| **Cancellation + waitlist** | Client 1 books, Client 2 joins waitlist, Client 1 cancels within 4 hrs, check SMS to Client 2 | FR-22, FR-25, FR-26, FR-27 |
| **Waitlist 10-min window** | Open `/waitlist/[slotId]` link, verify timer, book within 10 min | FR-26, FR-27 |
| **Geo-block** | Mobile professional, client outside 30 min radius — booking should be blocked | FR-28, FR-29 |
| **Heat Map** | Professional sets DI values, create slot in that hour, verify D_peak in price | FR-04, FR-15 |
| **D_max cap** | Set D_max = 0.20, verify price never drops more than 20% | FR-17 |

---

## Summary

| Category | Status |
|----------|--------|
| Core pricing engine | ✅ Complete |
| Booking transaction | ✅ Complete |
| Cancellation + D_cancel | ✅ Complete |
| Waitlist join | ✅ Complete |
| Heat Map save/load | ✅ Complete |
| Geo-check API | ✅ Complete |
| Auth (JWT + bcrypt) | ✅ Complete |
| Database schema | ✅ Complete |
| Pricing cron (Vercel) | ✅ Complete |
| **Twilio SMS activation** | ✅ **Complete (Configured for WhatsApp Sandbox)** |
| **Geo-check wired into booking** | ✅ **Complete** |
| **Waitlist page** | ✅ **Complete** |
| **Reminder SMS (FR-24)** | ✅ **Complete** |
| **Professional cancel notify (FR-23)**| ✅ **Complete** |
| Razorpay payments | 🔴 Out of MVP scope |
