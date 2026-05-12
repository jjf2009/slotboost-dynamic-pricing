// ── SlotBoost Database Types ──────────────────────────────────────────────────
// These mirror the Prisma schema. Prisma auto-generates types too,
// but these are useful for frontend components that receive API JSON.

export interface User {
  id: string
  name: string
  email: string
  role: 'professional' | 'client'
  created_at: string
}

export interface Professional {
  id: string
  userId: string
  name: string
  email: string | null
  phone: string | null
  service_type: string | null
  base_price: number
  d_max: number
  heat_map: Record<string, number> | null  // { "mon_09": 0.8 }
  is_mobile: boolean
  created_at: string
}

export interface Client {
  id: string
  userId: string | null
  name: string
  email: string
  phone: string | null
  created_at: string
}

export interface Slot {
  id: string
  professionalId: string
  start_time: string
  duration_mins: number
  status: 'available' | 'booked'
  demand_index: number
  current_price: number
  d_cancel_active: boolean
  d_cancel_expires_at: string | null
  created_at: string
  // Joined
  professional?: Professional
  waitlists?: Waitlist[]
}

export interface Booking {
  id: string
  slotId: string
  clientId: string
  price_paid: number
  status: 'confirmed' | 'cancelled'
  booked_at: string
  cancelled_at: string | null
  // Joined
  slot?: Slot
  client?: Client
}

export interface Waitlist {
  id: string
  slotId: string
  clientId: string
  joined_at: string
  // Joined
  client?: Client
}

export interface Subscriber {
  id: string
  professionalId: string
  clientId: string
  phone: string
  channel: 'sms' | 'whatsapp'
  created_at: string
}

export interface Subscription {
  id: string
  clientId: string
  professionalId: string
  credits_total: number
  credits_used: number
  off_peak_used: number
  billing_month: string  // "2026-05"
  created_at: string
}

// ── Pricing Engine Types ──────────────────────────────────────────────────────
export interface PricingBreakdown {
  currentPrice: number
  dLead: number
  dPeak: number
  dCancel: number
  dTotal: number
  hoursRemaining: number
}

// ── API Response shapes ───────────────────────────────────────────────────────
export interface SlotWithLivePrice extends Slot {
  live_price: PricingBreakdown
}

export interface WaitlistStatus {
  slot: Pick<Slot, 'id' | 'start_time' | 'duration_mins' | 'status'> & { professional?: Pick<Professional, 'name'> }
  waitlistCount: number
  offerActive: boolean
  secondsRemaining: number
  currentPrice: number
  breakdown: PricingBreakdown
}
