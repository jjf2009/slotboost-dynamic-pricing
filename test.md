Absolutely. Here’s a practical MVP test plan you can follow before the professor demo. Test in this order so every module builds on the previous one.

## MVP Test Plan

### 0. Setup Check

Run these first:

```bash
npm install
npx prisma validate
npx prisma generate
npx prisma db push
npm run lint
npm run build
npm run dev
```

Expected:
- Prisma validates.
- Database schema syncs.
- Lint passes.
- Build passes.
- App runs at `http://localhost:3000`.

Also confirm `.env` has:

```env
DATABASE_URL=
DIRECT_URL=
JWT_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
NODE_ENV=development
```

Run automated unit/integration tests:

```bash
npm test
```

---

## Module 1: Authentication

### Test Professional Register/Login
1. Open `/register`.
2. Register as `professional`.
3. Confirm redirect to professional dashboard.
4. Logout.
5. Login again.

Expected:
- User is created.
- Professional profile is created.
- Login cookie works.
- Dashboard opens.

### Test Client Register/Login
1. Register another account as `client`.
2. Confirm redirect to client dashboard.
3. Logout/login again.

Expected:
- Client profile is created.
- Client dashboard opens.

---

## Module 2: Professional Profile Settings

Path: `/professional/dashboard`

Test:
1. Click professional settings.
2. Set base price, for example `1000`.
3. Set max discount, for example `40%`.
4. Save.
5. Refresh page.

Expected:
- New base price persists.
- Dashboard shows updated price.
- No errors in console/server logs.

---

## Module 3: Heat Map

Path: `/professional/heatmap`

Test:
1. Open heatmap page.
2. Select one low-demand slot.
3. Set DI to `0.20`.
4. Save.
5. Refresh page.

Expected:
- Heat map loads from Prisma API (`GET/PUT /api/professional/heatmap`).
- Saved DI values persist.
- No validation error from `/api/professional/heatmap`.

---

## Module 4: Slot Creation

Path: `/professional/slots/new`

Test:
1. Create a slot within the next 24 hours.
2. Use duration `60`.
3. Use a demand index matching low/off-peak, for example `0.2`.
4. Return to dashboard.

Expected:
- Slot appears in dashboard.
- Slot status is `available`.
- Price shows discount if slot is under 24 hours (computed server-side on dashboard load).
- Price respects `D_max`.

---

## Module 5: Pricing Engine

Manual trigger (requires `CRON_SECRET` — see `lib/cron-auth.ts`):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/pricing/recalculate
# or: curl "http://localhost:3000/api/pricing/recalculate?secret=$CRON_SECRET"
```

Test:
1. Create slots at different times:
   - More than 24 hours away.
   - Less than 24 hours away.
   - Less than 2 hours away.
2. Trigger recalculation.
3. Check dashboard prices.

Expected:
- `H >= 24`: no lead discount.
- `12 <= H < 24`: 10% lead discount.
- `6 <= H < 12`: 15%.
- `2 <= H < 6`: 20%.
- `H < 2`: 25%.
- D_peak applies based on demand index.
- Total discount never exceeds `D_max`.
- Flash-deal WhatsApp to subscribers fires only when H **crosses below 24h** or **crosses below 2h** (`lib/flash-deal-trigger.ts`), not on every intermediate price drop.

---

## Module 6: Client Browse + Subscribe

Path: `/client/browse`

Test:
1. Login as Client A.
2. Browse professionals.
3. Open professional profile.
4. Subscribe to flash deals.

Expected:
- Client can see available slots.
- Current price is visible (server-computed on page load).
- Subscribe button works.
- Subscriber record is created.

Then trigger recalculation (with cron secret):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/pricing/recalculate
```

Expected:
- Flash deal WhatsApp sent to subscribers when an H threshold is crossed (24h or 2h).
- If Twilio credentials are missing, notification route logs a simulation message.

---

## Module 7: Normal Booking

Test:
1. Login as Client A.
2. Open an available slot.
3. Book the slot.
4. Return to professional dashboard.

Expected:
- Booking succeeds.
- Slot status becomes `booked`.
- Price is frozen as `price_paid`.
- Client and professional confirmation WhatsApp is sent or mocked.

---

## Module 8: Double Booking Protection

Use two browser sessions or two clients.

Test:
1. Open the same available slot in Client A and Client B sessions.
2. Try booking quickly from both.

Expected:
- One booking succeeds.
- One booking fails with `409`.
- Only one booking row exists.
- Slot remains `booked`.

This is important for professor demo credibility.

---

## Module 9: Waitlist Join

Test:
1. Login as Client B.
2. Open the already booked slot.
3. Join waitlist.

Expected:
- Waitlist join succeeds.
- Duplicate waitlist join returns conflict.
- Waitlist count increases.

---

## Module 10: Cancellation Recovery

Test:
1. Login as Client A.
2. Cancel the booking within 4 hours of slot start.
3. Check slot status.

Expected:
- Booking status becomes `cancelled`.
- Slot status becomes `available`.
- `d_cancel_active = true`.
- `d_cancel_expires_at` is set around 10 minutes ahead.
- Waitlist autopilot WhatsApp is sent to Client B.

---

## Module 11: Waitlist Autopilot Page

Path:

```text
/waitlist/[slotId]
```

Test:
1. Open the waitlist link as Client B (`/waitlist/[slotId]`).
2. Confirm countdown is visible.
3. Book within 10 minutes via `POST /api/waitlist/book` (the page form calls this endpoint).

Expected:
- Page shows recovery price.
- Countdown works.
- Client B booking succeeds (Client B must already be on the waitlist).
- D_cancel is removed.
- Slot becomes `booked`.
- Remaining waitlisted clients receive `slot_filled` WhatsApp via `/api/notifications/send`.

Also test with a non-waitlisted email (not on waitlist for this slot).

Expected:
- `POST /api/waitlist/book` returns **403** (`app/api/waitlist/book/route.ts` — waitlist membership check).

---

## Module 12: Geo-Check

Use a mobile professional.

Test A: Missing Location
1. Set professional as mobile in DB or settings if available.
2. Try booking without `clientLocation`.

Expected:
- Booking blocked with friendly location-required message.

Test B: Far Location
1. Try booking with a far-away client location.
2. Example: origin Goa, destination Mumbai.

Expected:
- If travel time exceeds 30 minutes, booking blocked with:
  > This professional is not available in your area for this time slot.

Test C: Geo API Failure
1. Use invalid/unresolvable address.

Expected:
- Booking allowed as fallback.
- Error/fallback reason logged.

---

## Final Demo Rehearsal Flow

Use this exact story for the professor:

1. Professional logs in.
2. Sets base price and max discount.
3. Configures low-demand heatmap.
4. Creates a slot within 24 hours.
5. Client A subscribes and books.
6. Client B joins waitlist.
7. Client A cancels.
8. System activates cancellation discount.
9. Client B receives/open waitlist offer.
10. Client B books within 10 minutes.
11. Show dashboard: slot booked again, price frozen, booking recorded.

## Pass Criteria

Your MVP is demo-ready when:

- `npm run lint` passes.
- `npm run build` passes.
- `npx prisma db push` works.
- Professional flow works.
- Client booking works.
- Waitlist recovery works.
- Twilio either sends real WhatsApp or clearly logs fallback.
- Geo uses OSRM + Nominatim (not Google Maps); Razorpay/subscriptions are stretch goals only.