# SlotBoost Backend & Database Overhaul

Build a complete, bug-free backend so only frontend/UI work remains. No Razorpay. No Google Maps.

## Critical Issues Found

> [!CAUTION]
> **Dual Database Client Bug**: The codebase uses **both** Prisma (`lib/db.ts`) and Supabase client (`lib/supabase/server.ts`) to access the **same** database. This causes:
> - Schema mismatches (Supabase queries reference tables/columns that don't exist in Prisma)
> - No transaction safety (Supabase `.select()` can't do `SELECT FOR UPDATE`)
> - Connection pool leaks (two separate connection pools competing)
>
> **Fix**: Standardize everything on **Prisma only**. Keep Supabase client only if you need Supabase Auth (you don't — you're using custom JWT).

> [!WARNING]
> **Leftover code from another project**: `prisma/schema.prisma` contains `Application`, `ApplicationStatus`, and `ApplicationMethod` models. The `package.json` is named `"applytracker2.0"`. These must be removed.

> [!WARNING]
> **Missing Prisma tables**: `Waitlist`, `Subscriber`, and `Subscription` models are defined in `types/database.ts` but **do not exist** in `prisma/schema.prisma`. Any API hitting these tables will crash.

## Open Questions

> [!IMPORTANT]
> **Supabase Auth vs Custom JWT**: You currently use **custom JWT auth** (bcrypt + jsonwebtoken) for registration/login, but also have `@supabase/ssr` installed and a Supabase client that calls `supabase.auth.getUser()` in the booking route. **Which auth system do you want?** My plan below assumes we keep **custom JWT only** and remove Supabase auth calls, since your register/login already work with JWT.

## Proposed Changes

### 1. Database Schema — `prisma/schema.prisma`

#### [MODIFY] [schema.prisma](file:///home/jjf2009/Desktop/Projects/SPEM%20PROJECT%20/prisma/schema.prisma)

Complete rewrite of the schema. Changes:
- **Remove**: `Application`, `ApplicationStatus`, `ApplicationMethod` (leftover from another project)
- **Add fields to `Professional`**: `phone`, `email`, `service_type`, `heat_map` (Json), `is_mobile`
- **Add fields to `Client`**: `phone`, `user_id` (link to User table)
- **Add fields to `Booking`**: `cancelled_at`
- **Add new model**: `Waitlist` (slot_id, client_id, joined_at)
- **Add new model**: `Subscriber` (professional_id, client_id, phone, channel)
- **Add new model**: `Subscription` (client_id, professional_id, credits_total, credits_used, off_peak_used, billing_month)

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String        @id @default(uuid())
  name          String
  email         String        @unique
  password_hash String
  role          String        @default("client") // "professional" | "client"
  created_at    DateTime      @default(now())
  professional  Professional?
  client        Client?
  @@map("users")
}

model Professional {
  id           String        @id @default(uuid())
  userId       String        @unique @map("user_id")
  user         User          @relation(fields: [userId], references: [id])
  name         String
  email        String?
  phone        String?
  service_type String?
  base_price   Float         @default(500)
  d_max        Float         @default(0.4)
  heat_map     Json?         // JSONB: { "mon_09": 0.8, "tue_14": 0.3, ... }
  is_mobile    Boolean       @default(false)
  created_at   DateTime      @default(now())
  slots        Slot[]
  subscribers  Subscriber[]
  @@map("professionals")
}

model Slot {
  id                  String     @id @default(uuid())
  professionalId      String     @map("professional_id")
  professional        Professional @relation(fields: [professionalId], references: [id])
  start_time          DateTime
  duration_mins       Int        @default(60)
  demand_index        Float      @default(1.0)
  d_cancel_active     Boolean    @default(false)
  d_cancel_expires_at DateTime?
  current_price       Float      @default(0)
  status              String     @default("available") // available | booked
  created_at          DateTime   @default(now())
  bookings            Booking[]
  waitlists           Waitlist[]
  @@map("slots")
}

model Booking {
  id             String    @id @default(uuid())
  slotId         String    @map("slot_id")
  slot           Slot      @relation(fields: [slotId], references: [id])
  clientId       String    @map("client_id")
  client         Client    @relation(fields: [clientId], references: [id])
  price_paid     Float
  status         String    @default("confirmed") // confirmed | cancelled
  booked_at      DateTime  @default(now())
  cancelled_at   DateTime?
  @@map("bookings")
}

model Client {
  id            String         @id @default(uuid())
  userId        String?        @unique @map("user_id")
  user          User?          @relation(fields: [userId], references: [id])
  name          String
  email         String         @unique
  phone         String?
  created_at    DateTime       @default(now())
  bookings      Booking[]
  waitlists     Waitlist[]
  subscriptions Subscription[]
  subscribers   Subscriber[]
  @@map("clients")
}

model Waitlist {
  id        String   @id @default(uuid())
  slotId    String   @map("slot_id")
  slot      Slot     @relation(fields: [slotId], references: [id])
  clientId  String   @map("client_id")
  client    Client   @relation(fields: [clientId], references: [id])
  joined_at DateTime @default(now())
  @@unique([slotId, clientId]) // prevent duplicate joins
  @@map("waitlists")
}

model Subscriber {
  id             String       @id @default(uuid())
  professionalId String       @map("professional_id")
  professional   Professional @relation(fields: [professionalId], references: [id])
  clientId       String       @map("client_id")
  client         Client       @relation(fields: [clientId], references: [id])
  phone          String
  channel        String       @default("sms") // sms | whatsapp
  created_at     DateTime     @default(now())
  @@unique([professionalId, clientId]) // one subscription per pair
  @@map("subscribers")
}

model Subscription {
  id             String   @id @default(uuid())
  clientId       String   @map("client_id")
  client         Client   @relation(fields: [clientId], references: [id])
  professionalId String   @map("professional_id")
  credits_total  Int      @default(4)
  credits_used   Int      @default(0)
  off_peak_used  Int      @default(0)
  billing_month  String   // "2026-05"
  created_at     DateTime @default(now())
  @@unique([clientId, professionalId, billing_month])
  @@map("subscriptions")
}
```

---

### 2. Standardize on Prisma — Remove Supabase data calls

#### [DELETE] [client.ts](file:///home/jjf2009/Desktop/Projects/SPEM%20PROJECT%20/lib/supabase/client.ts)
#### [DELETE] [server.ts](file:///home/jjf2009/Desktop/Projects/SPEM%20PROJECT%20/lib/supabase/server.ts)

Remove the Supabase client wrappers. All database access will go through `prisma` from `lib/db.ts`.

#### [DELETE] [application.model.ts](file:///home/jjf2009/Desktop/Projects/SPEM%20PROJECT%20/lib/models/application.model.ts)
#### [DELETE] [application.service.ts](file:///home/jjf2009/Desktop/Projects/SPEM%20PROJECT%20/lib/services/application.service.ts)
#### [DELETE] [route.ts (applications)](file:///home/jjf2009/Desktop/Projects/SPEM%20PROJECT%20/app/api/applications/route.ts)
#### [DELETE] [route.ts (applications/id)](file:///home/jjf2009/Desktop/Projects/SPEM%20PROJECT%20/app/api/applications/%5Bid%5D/route.ts)
#### [DELETE] [googlemaps.ts](file:///home/jjf2009/Desktop/Projects/SPEM%20PROJECT%20/lib/googlemaps.ts)

Remove all leftover application tracker code and Google Maps helper.

---

### 3. API Endpoints — Complete list

All endpoints will use Prisma and return JSON. Here is every endpoint the frontend team needs:

#### Auth (`/api/auth/`)
| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| POST | `/api/register` | Register professional or client | ✅ Exists — needs minor fix |
| POST | `/api/login` | Login | ✅ Exists — works |
| GET | `/api/auth/me` | Get current user + profile | ⚠️ Needs rewrite (uses Supabase) |
| POST | `/api/auth/logout` | Clear JWT cookie | 🆕 New |

#### Professional Management (`/api/professional/`)
| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| GET | `/api/professional/profile` | Get own profile (base_price, d_max, heat_map) | 🆕 New |
| PUT | `/api/professional/profile` | Update base_price, d_max, service_type, is_mobile | 🆕 New |
| PUT | `/api/professional/heatmap` | Save heat map DI values | 🆕 New |

#### Slots (`/api/slots/`)
| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| GET | `/api/slots?professionalId=X` | List available slots for a professional | 🆕 New |
| GET | `/api/slots/[id]` | Get single slot with live price | 🆕 New |
| POST | `/api/slots` | Create a new slot (professional only) | ⚠️ Exists as server action — add API route |
| DELETE | `/api/slots/[id]` | Delete slot (block if booked — FR-06) | 🆕 New |
| POST | `/api/slots/book` | Book a slot atomically | ⚠️ Exists — rewrite with Prisma transaction |
| POST | `/api/slots/cancel` | Cancel a booking | ⚠️ Exists — rewrite with Prisma |

#### Waitlist (`/api/waitlist/`)
| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| POST | `/api/waitlist/join` | Join waitlist for a booked slot | 🆕 New |
| GET | `/api/waitlist/[slotId]` | Get waitlist status + countdown | 🆕 New |
| POST | `/api/waitlist/book` | Book from waitlist within 10-min window | 🆕 New |

#### Subscribers (Flash Deal Opt-in/Out) (`/api/subscribers/`)
| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| POST | `/api/subscribers` | Subscribe to a professional's flash deals | 🆕 New |
| DELETE | `/api/subscribers` | Unsubscribe from flash deals | 🆕 New |

#### Pricing Engine (`/api/pricing/`)
| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| GET | `/api/pricing/recalculate` | Recalculate all open slot prices | ⚠️ Exists — rewrite with Prisma |

#### Notifications (`/api/notifications/`)
| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| POST | `/api/notifications/send` | Send console-logged notification | ⚠️ Exists — rewrite with Prisma |

---

### 4. Rewrite Existing API Routes

#### [MODIFY] [route.ts (book)](file:///home/jjf2009/Desktop/Projects/SPEM%20PROJECT%20/app/api/slots/book/route.ts)
- Replace all `supabase.from()` calls with `prisma` equivalents
- Use `prisma.$transaction()` for atomic booking (lock slot → verify available → create booking → update slot)
- Remove `supabase.auth.getUser()` — use `getUserFromRequest()` (JWT) instead

#### [MODIFY] [route.ts (cancel)](file:///home/jjf2009/Desktop/Projects/SPEM%20PROJECT%20/app/api/slots/cancel/route.ts)
- Replace all Supabase calls with Prisma
- Add auth check (only the booking's client or the professional can cancel)

#### [MODIFY] [route.ts (recalculate)](file:///home/jjf2009/Desktop/Projects/SPEM%20PROJECT%20/app/api/pricing/recalculate/route.ts)
- Replace Supabase with Prisma
- Use `prisma.slot.findMany()` with proper filtering

#### [MODIFY] [route.ts (notifications)](file:///home/jjf2009/Desktop/Projects/SPEM%20PROJECT%20/app/api/notifications/send/route.ts)
- Replace Supabase with Prisma
- Keep console.log as the notification method (no Twilio in MVP)

#### [MODIFY] [route.ts (auth/me)](file:///home/jjf2009/Desktop/Projects/SPEM%20PROJECT%20/app/api/auth/me/route.ts)
- Replace Supabase auth with JWT verification from cookie

#### [MODIFY] [route.ts (register)](file:///home/jjf2009/Desktop/Projects/SPEM%20PROJECT%20/app/api/register/route.ts)
- Also create a `Client` record linked to user for client registrations (currently creates but doesn't link `userId`)

#### [MODIFY] [auth.service.ts](file:///home/jjf2009/Desktop/Projects/SPEM%20PROJECT%20/lib/services/auth.service.ts)
- Fix client creation to include `userId` field
- Increase bcrypt salt rounds from 10 to 12 (per SRS NFR-03)

---

### 5. New API Route Files

#### [NEW] `/app/api/auth/logout/route.ts`
- Clear the `token` cookie and return success

#### [NEW] `/app/api/professional/profile/route.ts`
- `GET`: Return professional's profile from JWT
- `PUT`: Update `base_price` (₹100–₹50,000), `d_max` (0–0.6), `service_type`, `is_mobile`

#### [NEW] `/app/api/professional/heatmap/route.ts`
- `PUT`: Save JSON heatmap `{ "mon_09": 0.8, ... }` to professional record

#### [NEW] `/app/api/slots/route.ts`
- `GET`: List available slots (query by `professionalId`), calculate live prices
- `POST`: Create slot (replaces the server action — now a proper API)

#### [NEW] `/app/api/slots/[id]/route.ts`
- `GET`: Single slot detail with live price calculation
- `DELETE`: Delete slot — block if status is "booked" (FR-06)

#### [NEW] `/app/api/waitlist/join/route.ts`
- `POST`: Add client to waitlist for a booked slot

#### [NEW] `/app/api/waitlist/[slotId]/route.ts`
- `GET`: Get waitlist info + D_cancel countdown timer remaining

#### [NEW] `/app/api/waitlist/book/route.ts`
- `POST`: Book from waitlist — check 10-minute expiry, use `prisma.$transaction()`

#### [NEW] `/app/api/subscribers/route.ts`
- `POST`: Subscribe to a professional's flash deals
- `DELETE`: Unsubscribe

---

### 6. Cleanup

#### [MODIFY] [package.json](file:///home/jjf2009/Desktop/Projects/SPEM%20PROJECT%20/package.json)
- Change `name` from `"applytracker2.0"` to `"slotboost"`
- Remove unused deps: `@supabase/ssr`, `@supabase/supabase-js`, `express`, `express-validator`, `cors`, `@neondatabase/serverless`, `ws`

#### [MODIFY] [database.ts](file:///home/jjf2009/Desktop/Projects/SPEM%20PROJECT%20/types/database.ts)
- Update types to match the new Prisma schema (Prisma will auto-generate types, so this file becomes supplementary)

---

## Verification Plan

### Automated Tests
After implementation, every endpoint will be tested with `curl` commands:

```bash
# 1. Register a professional
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Dr Test","email":"pro@test.com","password":"test12345","role":"professional"}'

# 2. Login
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"pro@test.com","password":"test12345"}'

# 3. Create a slot (with JWT cookie)
curl -X POST http://localhost:3000/api/slots \
  -H "Content-Type: application/json" \
  -b "token=<JWT>" \
  -d '{"date":"2026-05-12","time":"14:00","duration":60,"demandIndex":0.5}'

# 4. List slots
curl http://localhost:3000/api/slots?professionalId=<ID>

# 5. Book a slot
curl -X POST http://localhost:3000/api/slots/book \
  -H "Content-Type: application/json" \
  -d '{"slotId":"<ID>","name":"Client","email":"client@test.com","phone":"9876543210"}'

# 6. Cancel + verify waitlist autopilot fires
curl -X POST http://localhost:3000/api/slots/cancel \
  -H "Content-Type: application/json" \
  -d '{"bookingId":"<ID>"}'

# 7. Pricing recalculation
curl http://localhost:3000/api/pricing/recalculate
```

### Build Verification
```bash
npx prisma generate  # Schema compiles
npx prisma db push   # Tables created in DB
npm run build         # Next.js builds without errors
```
