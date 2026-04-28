// ── Supabase Database Types ──────────────────────────────────────────────────

export interface Professional {
  id: string
  user_id: string
  name: string
  email: string
  phone: string
  service_type: string
  base_price: number
  d_max: number
  heat_map: Record<string, number>
  is_mobile: boolean
  created_at: string
}

export interface Slot {
  id: string
  professional_id: string
  start_time: string
  duration_mins: number
  status: 'available' | 'booked' | 'cancelled'
  demand_index: number
  current_price: number | null
  d_cancel_active: boolean
  d_cancel_expires_at: string | null
  created_at: string
  // Joined
  professionals?: Professional
}

export interface Client {
  id: string
  user_id: string
  name: string
  email: string
  phone: string
  created_at: string
}

export interface Booking {
  id: string
  slot_id: string
  client_id: string
  price_paid: number
  status: 'confirmed' | 'cancelled'
  booked_at: string
  cancelled_at: string | null
  // Joined
  slots?: Slot
  clients?: Client
}

export interface Waitlist {
  id: string
  slot_id: string
  client_id: string
  joined_at: string
  // Joined
  clients?: Client
}

export interface Subscriber {
  id: string
  professional_id: string
  client_id: string
  phone: string
  channel: 'sms' | 'whatsapp'
  created_at: string
}

export interface Subscription {
  id: string
  client_id: string
  professional_id: string
  credits_total: number
  credits_used: number
  off_peak_used: number
  billing_month: string
  created_at: string
}
