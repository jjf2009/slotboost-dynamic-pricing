import { createClient } from "@/lib/supabase/server";
import { calculatePrice } from "@/lib/pricing";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { slotId, name, email, phone } = await req.json();

  // 1. Lock the slot row and verify it's still available
  const { data: slot, error } = await supabase
    .from("slots")
    .select("*, professionals(*)")
    .eq("id", slotId)
    .eq("status", "available")
    .single();

  if (error || !slot) {
    return NextResponse.json(
      { error: "Slot not available" },
      { status: 409 }
    );
  }

  // 2. Recalculate price at time of booking (prevent stale price exploit)
  const pro = slot.professionals;
  const { currentPrice } = calculatePrice({
    basePrice: pro.base_price,
    startTime: new Date(slot.start_time),
    demandIndex: slot.demand_index,
    dMax: pro.d_max,
    dCancelActive: slot.d_cancel_active,
    dCancelExpiry: slot.d_cancel_expires_at
      ? new Date(slot.d_cancel_expires_at)
      : undefined,
  });

  // 3. Get or create client
  const { data: authUser } = await supabase.auth.getUser();

  let clientId: string;

  if (authUser?.user) {
    // Logged-in user — find or create client profile
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", authUser.user.id)
      .single();

    if (existingClient) {
      clientId = existingClient.id;
    } else {
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({
          user_id: authUser.user.id,
          name: name || authUser.user.email,
          email: email || authUser.user.email,
          phone: phone || "",
        })
        .select("id")
        .single();

      if (clientError || !newClient) {
        return NextResponse.json(
          { error: "Failed to create client profile" },
          { status: 500 }
        );
      }
      clientId = newClient.id;
    }
  } else {
    // Guest booking — create/find by email
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("email", email)
      .single();

    if (existingClient) {
      clientId = existingClient.id;
    } else {
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({ name, email, phone })
        .select("id")
        .single();

      if (clientError || !newClient) {
        return NextResponse.json(
          { error: "Failed to create client profile" },
          { status: 500 }
        );
      }
      clientId = newClient.id;
    }
  }

  // 4. Create booking + update slot status
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      slot_id: slotId,
      client_id: clientId,
      price_paid: currentPrice,
    })
    .select()
    .single();

  if (bookingError) {
    return NextResponse.json(
      { error: "Booking failed" },
      { status: 500 }
    );
  }

  // Mark slot as booked
  await supabase
    .from("slots")
    .update({ status: "booked", current_price: currentPrice })
    .eq("id", slotId);

  // 5. Fire confirmation notification (fire and forget)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  fetch(`${appUrl}/api/notifications/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "confirmation",
      slotId,
      clientId,
      price: currentPrice,
    }),
  }).catch(console.error);

  return NextResponse.json({ booking, price: currentPrice });
}
