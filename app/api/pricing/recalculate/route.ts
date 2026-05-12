import { prisma } from "@/lib/db";
import { calculatePrice } from "@/lib/pricing";
import { NextResponse } from "next/server";

// GET /api/pricing/recalculate
// Recalculates prices for all open slots in the next 24 hours.
// Called by a cron job every 15 minutes.
export async function GET() {
  const now = new Date();
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const slots = await prisma.slot.findMany({
    where: {
      status: "available",
      start_time: { gt: now, lte: in24h },
    },
    include: { professional: true },
  });

  let updated = 0;
  let flashAlertsSent = 0;
  const errors: string[] = [];

  for (const slot of slots) {
    try {
      const oldPrice = slot.current_price;

      const result = calculatePrice({
        basePrice: slot.professional.base_price,
        startTime: slot.start_time,
        demandIndex: slot.demand_index,
        dMax: slot.professional.d_max,
        dCancelActive: slot.d_cancel_active,
        dCancelExpiry: slot.d_cancel_expires_at ?? undefined,
      });

      await prisma.slot.update({
        where: { id: slot.id },
        data: { current_price: result.currentPrice },
      });

      updated++;

      // Detect first-time D_lead activation → send flash deal (FR-18)
      const justDropped = oldPrice !== null && result.currentPrice < oldPrice && result.dLead > 0;
      if (justDropped) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        fetch(`${appUrl}/api/notifications/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "flash_deal", slotId: slot.id }),
        }).catch(console.error);
        flashAlertsSent++;
      }

      // Clean up expired D_cancel (if window has passed, reset it)
      if (
        slot.d_cancel_active &&
        slot.d_cancel_expires_at &&
        now > slot.d_cancel_expires_at
      ) {
        await prisma.slot.update({
          where: { id: slot.id },
          data: { d_cancel_active: false, d_cancel_expires_at: null },
        });
      }
    } catch (err: unknown) {
      const error = err as Error;
      // Don't let one bad slot crash the entire engine (NFR-08)
      errors.push(`Slot ${slot.id}: ${error.message}`);
    }
  }

  return NextResponse.json({
    updated,
    flashAlertsSent,
    errors,
    timestamp: now.toISOString(),
  });
}
