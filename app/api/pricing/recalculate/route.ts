import { createClient } from "@/lib/supabase/server";
import { calculatePrice } from "@/lib/pricing";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  // Get all available slots in the next 24 hours
  const { data: slots } = await supabase
    .from("slots")
    .select("*, professionals(*)")
    .eq("status", "available")
    .gte("start_time", new Date().toISOString())
    .lte(
      "start_time",
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    );

  if (!slots) return NextResponse.json({ updated: 0 });

  let flashAlertsSent = 0;

  for (const slot of slots) {
    const pro = slot.professionals;
    const oldPrice = slot.current_price;

    const result = calculatePrice({
      basePrice: pro.base_price,
      startTime: new Date(slot.start_time),
      demandIndex: slot.demand_index,
      dMax: pro.d_max,
      dCancelActive: slot.d_cancel_active,
      dCancelExpiry: slot.d_cancel_expires_at
        ? new Date(slot.d_cancel_expires_at)
        : undefined,
    });

    await supabase
      .from("slots")
      .update({ current_price: result.currentPrice })
      .eq("id", slot.id);

    // If D_lead just kicked in (price dropped for first time) → send flash SMS
    const justDropped = oldPrice !== null && result.currentPrice < oldPrice;
    if (justDropped && result.dLead > 0) {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      fetch(`${appUrl}/api/notifications/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "flash_deal", slotId: slot.id }),
      }).catch(console.error);
      flashAlertsSent++;
    }
  }

  return NextResponse.json({
    updated: slots.length,
    flashAlertsSent,
    timestamp: new Date().toISOString(),
  });
}
