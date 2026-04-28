import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { bookingId } = await req.json();

  const { data: booking } = await supabase
    .from("bookings")
    .select("*, slots(*)")
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const slot = booking.slots;
  const hoursRemaining =
    (new Date(slot.start_time).getTime() - Date.now()) / (1000 * 60 * 60);

  // Within recovery window → trigger D_cancel + waitlist autopilot
  const withinRecovery = hoursRemaining < 4;

  // Cancel the booking
  await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  // Reopen slot with D_cancel if within recovery window
  const dCancelExpiresAt = withinRecovery
    ? new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
    : null;

  await supabase
    .from("slots")
    .update({
      status: "available",
      d_cancel_active: withinRecovery,
      d_cancel_expires_at: dCancelExpiresAt,
    })
    .eq("id", slot.id);

  // Fire waitlist autopilot if within recovery window
  if (withinRecovery) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    fetch(`${appUrl}/api/notifications/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "waitlist_autopilot",
        slotId: slot.id,
      }),
    }).catch(console.error);
  }

  return NextResponse.json({ success: true, withinRecovery });
}
