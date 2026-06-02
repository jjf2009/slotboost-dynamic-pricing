# SlotBoost Local MVP Status

Reference: `SRS.MD` v1.0, updated for the local college demo.

## MVP Scope

SlotBoost is prepared as a local demo MVP focused on the core booking and yield-management workflow:

- Professional registration/login, profile pricing settings, heat map, dashboard, and slot creation.
- Client registration/login, browsing, flash-deal subscription, direct booking, and waitlist joining.
- Dynamic pricing with lead-time, demand-index, cancellation-recovery, and max-discount cap.
- Booking and waitlist booking guarded by atomic slot claims to prevent double booking.
- Cancellation recovery with a 10-minute waitlist autopilot offer.
- WhatsApp notifications through Twilio Sandbox, with console/mock fallback if credentials are missing.
- Geo-checking for mobile professionals using free Nominatim + OSRM services.

## Future Scope

These SRS items are intentionally outside the local MVP:

- Payment gateway integration.
- Payment-provider refunds.
- Flex Credit subscription purchase and enforcement.
- Credit-expiry reminders.
- Production paid-map-provider integration.

## Local Demo Commands

```bash
npm run dev
```

Open `http://localhost:3000`.

Manually trigger pricing recalculation, flash-deal checks, and reminder checks:

```bash
curl http://localhost:3000/api/pricing/recalculate
```

## Environment Required

The MVP expects these `.env` keys:

```env
DATABASE_URL=
DIRECT_URL=
JWT_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
NODE_ENV=development
```

`DIRECT_URL` may be omitted if `DATABASE_URL` is the only working database connection.

## Demo Flow

1. Register a professional.
2. Set base price and max discount.
3. Configure the heat map.
4. Create a slot within 24 hours.
5. Register Client A and Client B.
6. Client A subscribes and books the slot.
7. Client B joins the waitlist.
8. Client A cancels within the recovery window.
9. Client B opens `/waitlist/[slotId]` and books inside the 10-minute window.

## Verification

Before demo, run:

```bash
npx prisma validate
npx prisma db push
npm run lint
npm run build
```
