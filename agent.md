# SlotBoost – Implementation Guide
## Next.js + Supabase + shadcn/ui

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router) |
| UI Components | shadcn/ui + Tailwind CSS |
| Backend / DB | Supabase (Postgres + Auth + Realtime + Edge Functions) |
| Notifications | Twilio SMS / WhatsApp |
| Geo | Google Maps Distance Matrix API |
| Deployment | Vercel (frontend) + Supabase hosted |

---

## 1. Project Setup

```bash
npx create-next-app@latest slotboost --typescript --tailwind --app
cd slotboost

# shadcn/ui
npx shadcn@latest init
# When prompted: Default style, Slate base colour, CSS variables = yes

# Add shadcn components you'll need
npx shadcn@latest add button card table badge input label dialog sheet
npx shadcn@latest add select slider toast calendar form

# Supabase client
npm install @supabase/supabase-js @supabase/ssr

# Extras
npm install twilio @googlemaps/google-maps-services-js
npm install date-fns zod react-hook-form @hookform/resolvers
```

---

## 2. Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

GOOGLE_MAPS_API_KEY=your_google_maps_key
```

---

## 3. Supabase Database Schema

Run this in the Supabase SQL editor:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Professionals table
create table professionals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text not null,
  service_type text not null,
  base_price numeric not null check (base_price >= 100),
  d_max numeric not null default 0.40 check (d_max between 0 and 0.60),
  heat_map jsonb default '{}',
  is_mobile boolean default false,
  created_at timestamptz default now()
);

-- Slots table
create table slots (
  id uuid primary key default uuid_generate_v4(),
  professional_id uuid references professionals(id) on delete cascade,
  start_time timestamptz not null,
  duration_mins integer not null default 60,
  status text not null default 'available' check (status in ('available','booked','cancelled')),
  demand_index numeric not null default 0.5 check (demand_index between 0 and 1),
  current_price numeric,
  d_cancel_active boolean default false,
  d_cancel_expires_at timestamptz,
  created_at timestamptz default now()
);

-- Clients table
create table clients (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text not null,
  created_at timestamptz default now()
);

-- Bookings table
create table bookings (
  id uuid primary key default uuid_generate_v4(),
  slot_id uuid references slots(id) on delete restrict,
  client_id uuid references clients(id) on delete restrict,
  price_paid numeric not null,
  status text not null default 'confirmed' check (status in ('confirmed','cancelled')),
  booked_at timestamptz default now(),
  cancelled_at timestamptz
);

-- Waitlists table
create table waitlists (
  id uuid primary key default uuid_generate_v4(),
  slot_id uuid references slots(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  joined_at timestamptz default now(),
  unique(slot_id, client_id)
);

-- Flash-deal subscribers
create table subscribers (
  id uuid primary key default uuid_generate_v4(),
  professional_id uuid references professionals(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  phone text not null,
  channel text default 'sms' check (channel in ('sms','whatsapp')),
  created_at timestamptz default now(),
  unique(professional_id, client_id)
);

-- Subscriptions / Flex Credits
create table subscriptions (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id) on delete cascade,
  professional_id uuid references professionals(id) on delete cascade,
  credits_total integer default 4,
  credits_used integer default 0,
  off_peak_used integer default 0,
  billing_month date not null,
  created_at timestamptz default now()
);

-- Row Level Security
alter table professionals enable row level security;
alter table slots enable row level security;
alter table clients enable row level security;
alter table bookings enable row level security;
alter table waitlists enable row level security;
alter table subscribers enable row level security;

-- RLS Policies (simplified — expand for production)
create policy "Professionals manage own data"
  on professionals for all using (auth.uid() = user_id);

create policy "Anyone can read slots"
  on slots for select using (true);

create policy "Professionals manage own slots"
  on slots for insert with check (
    professional_id in (select id from professionals where user_id = auth.uid())
  );

create policy "Clients manage own data"
  on clients for all using (auth.uid() = user_id);

create policy "Clients can read own bookings"
  on bookings for select using (
    client_id in (select id from clients where user_id = auth.uid())
  );
```

---

## 4. Supabase Client Setup

```typescript
// lib/supabase/client.ts  — use in Client Components
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

```typescript
// lib/supabase/server.ts  — use in Server Components / Route Handlers
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

---

## 5. Pricing Engine

This is the core logic. Put it in a shared util so both API routes and Supabase Edge Functions can import it.

```typescript
// lib/pricing.ts

export interface PricingInput {
  basePrice: number
  startTime: Date
  demandIndex: number   // 0.0 – 1.0
  dMax: number          // e.g. 0.40
  dCancelActive: boolean
  dCancelExpiry?: Date
}

export interface PricingResult {
  currentPrice: number
  dLead: number
  dPeak: number
  dCancel: number
  dTotal: number
  hoursRemaining: number
}

export function calculatePrice(input: PricingInput): PricingResult {
  const now = new Date()
  const hoursRemaining = (input.startTime.getTime() - now.getTime()) / (1000 * 60 * 60)

  // D_lead — step function
  let dLead = 0
  if      (hoursRemaining < 2)  dLead = 0.25
  else if (hoursRemaining < 6)  dLead = 0.20
  else if (hoursRemaining < 12) dLead = 0.15
  else if (hoursRemaining < 24) dLead = 0.10
  else                          dLead = 0.00

  // D_peak
  const dPeakMax = 0.15
  const dPeak = dPeakMax * (1 - input.demandIndex)

  // D_cancel — only active if within expiry window
  const dCancel =
    input.dCancelActive &&
    input.dCancelExpiry &&
    now < input.dCancelExpiry
      ? 0.15
      : 0

  // Cap at D_max
  const dTotal = Math.min(dLead + dPeak + dCancel, input.dMax)

  const currentPrice = Math.round(input.basePrice * (1 - dTotal))

  return { currentPrice, dLead, dPeak, dCancel, dTotal, hoursRemaining }
}
```

---

## 6. Folder Structure

```
slotboost/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── professional/
│   │   ├── dashboard/page.tsx       ← slot management + live prices
│   │   ├── heatmap/page.tsx         ← demand index configuration
│   │   └── slots/new/page.tsx       ← create a slot
│   ├── book/
│   │   └── [slotId]/page.tsx        ← public booking page (client-facing)
│   ├── waitlist/
│   │   └── [slotId]/page.tsx        ← 10-min countdown page for waitlist
│   └── api/
│       ├── pricing/recalculate/route.ts    ← called by cron every 15 min
│       ├── slots/book/route.ts             ← booking endpoint
│       ├── slots/cancel/route.ts           ← cancellation endpoint
│       ├── notifications/send/route.ts     ← Twilio wrapper
│       └── geo/check/route.ts             ← Google Maps distance check
├── components/
│   ├── SlotCard.tsx                 ← shows slot + live price + countdown
│   ├── HeatMapGrid.tsx              ← 7×24 grid with sliders
│   ├── BookingForm.tsx
│   ├── WaitlistCountdown.tsx        ← 10-minute timer UI
│   └── PricingBreakdown.tsx         ← shows D_lead / D_peak / D_cancel
├── lib/
│   ├── pricing.ts                   ← formula (Section 5 above)
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── twilio.ts
│   └── googlemaps.ts
└── types/
    └── database.ts                  ← generated Supabase types
```

---

## 7. Key API Routes

### POST `/api/slots/book`

```typescript
// app/api/slots/book/route.ts
import { createClient } from '@/lib/supabase/server'
import { calculatePrice } from '@/lib/pricing'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { slotId, clientId } = await req.json()

  // 1. Lock the slot row and verify it's still available
  const { data: slot, error } = await supabase
    .from('slots')
    .select('*, professionals(*)')
    .eq('id', slotId)
    .eq('status', 'available')
    .single()

  if (error || !slot) {
    return NextResponse.json({ error: 'Slot not available' }, { status: 409 })
  }

  // 2. Recalculate price at time of booking (prevent stale price exploit)
  const pro = slot.professionals
  const { currentPrice } = calculatePrice({
    basePrice: pro.base_price,
    startTime: new Date(slot.start_time),
    demandIndex: slot.demand_index,
    dMax: pro.d_max,
    dCancelActive: slot.d_cancel_active,
    dCancelExpiry: slot.d_cancel_expires_at ? new Date(slot.d_cancel_expires_at) : undefined,
  })

  // 3. Create booking + update slot status atomically via RPC
  const { data: booking, error: bookingError } = await supabase.rpc('create_booking', {
    p_slot_id: slotId,
    p_client_id: clientId,
    p_price: currentPrice,
  })

  if (bookingError) {
    return NextResponse.json({ error: 'Booking failed' }, { status: 500 })
  }

  // 4. Send confirmation SMS (fire and forget)
  fetch('/api/notifications/send', {
    method: 'POST',
    body: JSON.stringify({ type: 'confirmation', slotId, clientId, price: currentPrice }),
  })

  return NextResponse.json({ booking, price: currentPrice })
}
```

Create the Supabase RPC function to make the booking atomic:

```sql
-- Run in Supabase SQL editor
create or replace function create_booking(
  p_slot_id uuid,
  p_client_id uuid,
  p_price numeric
) returns bookings as $$
declare
  v_booking bookings;
begin
  -- Lock the slot row
  perform id from slots
    where id = p_slot_id and status = 'available'
    for update;

  if not found then
    raise exception 'slot_not_available';
  end if;

  -- Insert booking
  insert into bookings (slot_id, client_id, price_paid)
    values (p_slot_id, p_client_id, p_price)
    returning * into v_booking;

  -- Mark slot as booked
  update slots set status = 'booked' where id = p_slot_id;

  return v_booking;
end;
$$ language plpgsql security definer;
```

---

### POST `/api/slots/cancel`

```typescript
// app/api/slots/cancel/route.ts
import { createClient } from '@/lib/supabase/server'
import { addHours } from 'date-fns'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { bookingId } = await req.json()

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, slots(*)')
    .eq('id', bookingId)
    .single()

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const slot = booking.slots
  const hoursRemaining =
    (new Date(slot.start_time).getTime() - Date.now()) / (1000 * 60 * 60)

  // Within recovery window → trigger D_cancel + waitlist autopilot
  const withinRecovery = hoursRemaining < 4

  // Cancel the booking
  await supabase
    .from('bookings')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', bookingId)

  // Reopen slot
  await supabase
    .from('slots')
    .update({
      status: 'available',
      d_cancel_active: withinRecovery,
      d_cancel_expires_at: withinRecovery
        ? addMinutes(new Date(), 10).toISOString()
        : null,
    })
    .eq('id', slot.id)

  // Fire waitlist autopilot if within recovery window
  if (withinRecovery) {
    fetch('/api/notifications/send', {
      method: 'POST',
      body: JSON.stringify({ type: 'waitlist_autopilot', slotId: slot.id }),
    })
  }

  return NextResponse.json({ success: true, withinRecovery })
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000)
}
```

---

### POST `/api/pricing/recalculate`

Call this every 15 minutes. Use Vercel Cron (add to `vercel.json`) or a Supabase Edge Function on a schedule.

```typescript
// app/api/pricing/recalculate/route.ts
import { createClient } from '@/lib/supabase/server'
import { calculatePrice } from '@/lib/pricing'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  // Get all available slots in the next 24 hours
  const { data: slots } = await supabase
    .from('slots')
    .select('*, professionals(*)')
    .eq('status', 'available')
    .gte('start_time', new Date().toISOString())
    .lte('start_time', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())

  if (!slots) return NextResponse.json({ updated: 0 })

  for (const slot of slots) {
    const pro = slot.professionals
    const oldPrice = slot.current_price

    const result = calculatePrice({
      basePrice: pro.base_price,
      startTime: new Date(slot.start_time),
      demandIndex: slot.demand_index,
      dMax: pro.d_max,
      dCancelActive: slot.d_cancel_active,
      dCancelExpiry: slot.d_cancel_expires_at
        ? new Date(slot.d_cancel_expires_at)
        : undefined,
    })

    await supabase
      .from('slots')
      .update({ current_price: result.currentPrice })
      .eq('id', slot.id)

    // If D_lead just kicked in (price dropped for first time) → send flash SMS
    const justDropped = oldPrice !== null && result.currentPrice < oldPrice
    if (justDropped && result.dLead > 0) {
      fetch('/api/notifications/send', {
        method: 'POST',
        body: JSON.stringify({ type: 'flash_deal', slotId: slot.id }),
      })
    }
  }

  return NextResponse.json({ updated: slots.length })
}
```

Add to `vercel.json` for automatic cron:

```json
{
  "crons": [
    {
      "path": "/api/pricing/recalculate",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

---

### POST `/api/notifications/send`

```typescript
// app/api/notifications/send/route.ts
import twilio from 'twilio'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { format } from 'date-fns'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { type, slotId, clientId, price } = await req.json()

  const { data: slot } = await supabase
    .from('slots')
    .select('*, professionals(*)')
    .eq('id', slotId)
    .single()

  if (!slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 })

  const pro = slot.professionals
  const slotTime = format(new Date(slot.start_time), 'dd MMM, h:mm a')

  if (type === 'confirmation') {
    const { data: clientData } = await supabase
      .from('clients').select('phone').eq('id', clientId).single()

    await client.messages.create({
      body: `Booking confirmed! ${pro.name} on ${slotTime}. Price: ₹${price}. See you there!`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: clientData!.phone,
    })
  }

  if (type === 'flash_deal') {
    // Get all subscribers for this professional
    const { data: subs } = await supabase
      .from('subscribers')
      .select('phone, channel')
      .eq('professional_id', pro.id)

    const currentPrice = slot.current_price
    const discount = Math.round((1 - currentPrice / pro.base_price) * 100)
    const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/book/${slotId}`

    for (const sub of subs ?? []) {
      const body = `⚡ Flash Deal! ${pro.name}'s ${slotTime} slot is now ₹${currentPrice} (${discount}% off ₹${pro.base_price}). Book now: ${bookingUrl}`
      const from = sub.channel === 'whatsapp'
        ? process.env.TWILIO_WHATSAPP_NUMBER
        : process.env.TWILIO_PHONE_NUMBER
      const to = sub.channel === 'whatsapp' ? `whatsapp:${sub.phone}` : sub.phone

      await client.messages.create({ body, from, to }).catch(console.error)
    }
  }

  if (type === 'waitlist_autopilot') {
    const { data: waitlist } = await supabase
      .from('waitlists')
      .select('clients(phone)')
      .eq('slot_id', slotId)

    const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/waitlist/${slotId}`

    for (const entry of waitlist ?? []) {
      const phone = (entry.clients as any).phone
      await client.messages.create({
        body: `🚨 Urgent! ${pro.name}'s ${slotTime} slot just opened up at ₹${slot.current_price}. Valid 10 mins only: ${bookingUrl}`,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: phone,
      }).catch(console.error)
    }
  }

  return NextResponse.json({ success: true })
}
```

---

### POST `/api/geo/check`

```typescript
// app/api/geo/check/route.ts
import { Client } from '@googlemaps/google-maps-services-js'
import { NextRequest, NextResponse } from 'next/server'

const mapsClient = new Client()

export async function POST(req: NextRequest) {
  const { origin, destination, departureTime } = await req.json()

  try {
    const response = await mapsClient.distancematrix({
      params: {
        origins: [origin],           // "lat,lng" string or address
        destinations: [destination],
        mode: 'driving' as any,
        departure_time: departureTime ? new Date(departureTime) : 'now' as any,
        key: process.env.GOOGLE_MAPS_API_KEY!,
      },
    })

    const element = response.data.rows[0].elements[0]

    if (element.status !== 'OK') {
      // Fallback: allow booking if API can't determine distance
      return NextResponse.json({ allowed: true, fallback: true })
    }

    const durationMinutes = element.duration_in_traffic
      ? element.duration_in_traffic.value / 60
      : element.duration.value / 60

    const THRESHOLD_MINUTES = 30
    const allowed = durationMinutes <= THRESHOLD_MINUTES

    return NextResponse.json({
      allowed,
      durationMinutes: Math.round(durationMinutes),
      distanceKm: Math.round(element.distance.value / 1000),
    })
  } catch (err) {
    // Always fallback to allowed on error — don't block revenue
    console.error('Geo check failed:', err)
    return NextResponse.json({ allowed: true, fallback: true })
  }
}
```

---

## 8. Key UI Components

### SlotCard — shows live price with discount breakdown

```tsx
// components/SlotCard.tsx
'use client'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { calculatePrice } from '@/lib/pricing'
import { format } from 'date-fns'

interface SlotCardProps {
  slot: {
    id: string
    start_time: string
    duration_mins: number
    demand_index: number
    d_cancel_active: boolean
    d_cancel_expires_at?: string
    professionals: {
      name: string
      base_price: number
      d_max: number
    }
  }
  onBook: (slotId: string) => void
}

export function SlotCard({ slot, onBook }: SlotCardProps) {
  const pro = slot.professionals
  const result = calculatePrice({
    basePrice: pro.base_price,
    startTime: new Date(slot.start_time),
    demandIndex: slot.demand_index,
    dMax: pro.d_max,
    dCancelActive: slot.d_cancel_active,
    dCancelExpiry: slot.d_cancel_expires_at
      ? new Date(slot.d_cancel_expires_at)
      : undefined,
  })

  const discount = Math.round(result.dTotal * 100)
  const isFlashDeal = result.dLead > 0

  return (
    <Card className={isFlashDeal ? 'border-orange-400 border-2' : ''}>
      <CardHeader>
        <CardTitle className="text-base">
          {format(new Date(slot.start_time), 'EEE, dd MMM · h:mm a')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{slot.duration_mins} min session</p>
      </CardHeader>

      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">₹{result.currentPrice}</span>
          {discount > 0 && (
            <>
              <span className="text-sm line-through text-muted-foreground">
                ₹{pro.base_price}
              </span>
              <Badge variant="destructive">{discount}% off</Badge>
            </>
          )}
        </div>

        {/* Pricing breakdown */}
        {discount > 0 && (
          <div className="text-xs text-muted-foreground space-y-0.5">
            {result.dLead > 0   && <p>⏱ Last-minute: -{Math.round(result.dLead * 100)}%</p>}
            {result.dPeak > 0   && <p>📉 Off-peak: -{Math.round(result.dPeak * 100)}%</p>}
            {result.dCancel > 0 && <p>🔔 Cancellation deal: -{Math.round(result.dCancel * 100)}%</p>}
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button className="w-full" onClick={() => onBook(slot.id)}>
          {isFlashDeal ? '⚡ Book Flash Deal' : 'Book Now'}
        </Button>
      </CardFooter>
    </Card>
  )
}
```

### HeatMapGrid — 7×24 demand index grid

```tsx
// components/HeatMapGrid.tsx
'use client'
import { useState } from 'react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 24 }, (_, i) =>
  i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`
)

type HeatMap = Record<string, number> // key: "Mon-9" → DI value

interface HeatMapGridProps {
  initialValues: HeatMap
  onSave: (values: HeatMap) => void
}

export function HeatMapGrid({ initialValues, onSave }: HeatMapGridProps) {
  const [values, setValues] = useState<HeatMap>(initialValues)
  const [selected, setSelected] = useState<string | null>(null)

  const getColor = (di: number) => {
    if (di >= 0.8) return 'bg-green-500'
    if (di >= 0.5) return 'bg-yellow-400'
    if (di >= 0.2) return 'bg-orange-400'
    return 'bg-red-500'
  }

  const key = (day: string, hour: number) => `${day}-${hour}`

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div className="grid" style={{ gridTemplateColumns: `60px repeat(24, 36px)`, gap: '2px' }}>
          {/* Hour headers */}
          <div />
          {HOURS.map((h, i) => (
            <div key={i} className="text-xs text-center text-muted-foreground">{i % 3 === 0 ? h : ''}</div>
          ))}

          {/* Day rows */}
          {DAYS.map(day => (
            <>
              <div key={day} className="text-sm font-medium flex items-center">{day}</div>
              {Array.from({ length: 24 }, (_, hour) => {
                const k = key(day, hour)
                const di = values[k] ?? 0.5
                return (
                  <button
                    key={k}
                    className={`h-8 rounded text-xs ${getColor(di)} ${selected === k ? 'ring-2 ring-black' : ''}`}
                    onClick={() => setSelected(k)}
                    title={`${day} ${HOURS[hour]}: DI = ${di}`}
                  />
                )
              })}
            </>
          ))}
        </div>
      </div>

      {/* Slider for selected cell */}
      {selected && (
        <div className="border rounded p-4 space-y-2">
          <p className="text-sm font-medium">
            {selected.replace('-', ' at hour ')} — Demand Index: {values[selected]?.toFixed(2) ?? '0.50'}
          </p>
          <Slider
            min={0} max={1} step={0.05}
            value={[values[selected] ?? 0.5]}
            onValueChange={([v]) => setValues(prev => ({ ...prev, [selected]: v }))}
          />
          <p className="text-xs text-muted-foreground">
            0 = no demand (max discount applied) · 1 = peak demand (no discount)
          </p>
        </div>
      )}

      <div className="flex gap-2 text-xs items-center">
        <span className="w-3 h-3 bg-green-500 rounded inline-block" /> Peak (DI ≥ 0.8)
        <span className="w-3 h-3 bg-yellow-400 rounded inline-block ml-2" /> Medium
        <span className="w-3 h-3 bg-orange-400 rounded inline-block ml-2" /> Low
        <span className="w-3 h-3 bg-red-500 rounded inline-block ml-2" /> Dead hour
      </div>

      <Button onClick={() => onSave(values)}>Save Heat Map</Button>
    </div>
  )
}
```

### WaitlistCountdown — 10-minute timer

```tsx
// components/WaitlistCountdown.tsx
'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface WaitlistCountdownProps {
  expiresAt: Date
  slotId: string
  price: number
  onBook: () => void
  onExpire: () => void
}

export function WaitlistCountdown({ expiresAt, slotId, price, onBook, onExpire }: WaitlistCountdownProps) {
  const [secondsLeft, setSecondsLeft] = useState(
    Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
  )

  useEffect(() => {
    const interval = setInterval(() => {
      const s = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
      setSecondsLeft(s)
      if (s === 0) { clearInterval(interval); onExpire() }
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt, onExpire])

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const isUrgent = secondsLeft < 60

  return (
    <Card className={`border-2 ${isUrgent ? 'border-red-500' : 'border-orange-400'}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🚨 Flash Cancellation Deal</span>
          <Badge variant={isUrgent ? 'destructive' : 'outline'} className="text-lg font-mono px-3">
            {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-3xl font-bold">₹{price}</p>
        <p className="text-sm text-muted-foreground">
          This price expires when the timer runs out. First to book wins.
        </p>
        <Button
          className="w-full"
          size="lg"
          disabled={secondsLeft === 0}
          onClick={onBook}
        >
          {secondsLeft === 0 ? 'Offer Expired' : '⚡ Book This Slot Now'}
        </Button>
      </CardContent>
    </Card>
  )
}
```

---

## 9. Supabase Realtime — Live Price Updates

Use Supabase Realtime on the booking page so the price updates live for all clients watching the same slot.

```tsx
// In your booking page component
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useLiveSlot(slotId: string, initialSlot: any) {
  const [slot, setSlot] = useState(initialSlot)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`slot-${slotId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'slots', filter: `id=eq.${slotId}` },
        (payload) => setSlot(payload.new)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [slotId])

  return slot
}
```

Enable Realtime on the `slots` table in the Supabase dashboard:
**Database → Replication → supabase_realtime publication → Add table → slots**

---

## 10. Supabase Auth Setup

```tsx
// app/(auth)/login/page.tsx
'use client'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'professional' | 'client'>('client')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { alert(error.message); return }
    router.push(role === 'professional' ? '/professional/dashboard' : '/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader><CardTitle>Sign in to SlotBoost</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={email} onChange={e => setEmail(e.target.value)} type="email" />
          </div>
          <div className="space-y-1">
            <Label>Password</Label>
            <Input value={password} onChange={e => setPassword(e.target.value)} type="password" />
          </div>
          <Button className="w-full" onClick={handleLogin}>Sign In</Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## 11. Deployment

```bash
# Push to GitHub
git init && git add . && git commit -m "initial"
gh repo create slotboost --public --push

# Deploy to Vercel
npx vercel
# Add all env vars in Vercel dashboard → Settings → Environment Variables

# Supabase is already hosted — just use the project URL
```

Enable the Vercel cron job by adding to `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/pricing/recalculate", "schedule": "*/15 * * * *" }
  ]
}
```

> **Note:** Vercel Cron requires a Pro plan for sub-hourly schedules.
> For the free tier, use Supabase Edge Functions with `pg_cron` instead —
> create a cron job in the Supabase dashboard that calls your recalculate endpoint.

---

## 12. Build Order (Sprint-by-Sprint)

| Sprint | What to build |
|---|---|
| **1** | Supabase project, schema (all tables + RPC), Auth, register/login pages |
| **2** | Professional dashboard skeleton, create slot form, slot listing page |
| **3** | `lib/pricing.ts`, SlotCard component, public booking page, `/api/slots/book` |
| **4** | `/api/slots/cancel`, `/api/notifications/send`, Twilio SMS, waitlist table + autopilot |
| **5** | HeatMapGrid component, save heat map to Supabase, `/api/geo/check`, WaitlistCountdown |
| **6** | Vercel cron + `/api/pricing/recalculate`, Supabase Realtime live prices, Flex Credits UI, final testing |

---

## Quick Reference — Formula in Code

```
CurrentPrice = BasePrice × (1 − D_total)
D_total      = min(D_lead + D_peak + D_cancel, D_max)

D_lead  → hours to slot: <2→25%, <6→20%, <12→15%, <24→10%, else 0%
D_peak  → 0.15 × (1 − DemandIndex)
D_cancel→ 0.15 if cancellation within 4 hrs AND within 10-min window
D_max   → set by professional, default 40%
```

All implemented in `lib/pricing.ts` — import it everywhere.