import { prisma } from "@/lib/db";
import { calculatePrice } from "@/lib/pricing";
import { getDemandIndexFromHeatMap } from "@/lib/heatmap";
import { NextRequest, NextResponse } from "next/server";

// GET /api/waitlist/[slotId] → get waitlist info + D_cancel countdown
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slotId: string }> },
) {
  const { slotId } = await params;

  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
    include: { professional: true },
  });

  if (!slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  const waitlistCount = await prisma.waitlist.count({ where: { slotId } });

  const livePrice = calculatePrice({
    basePrice: slot.professional.base_price,
    startTime: slot.start_time,
    demandIndex: getDemandIndexFromHeatMap(
      slot.professional.heat_map,
      slot.start_time,
      slot.demand_index,
    ),
    dMax: slot.professional.d_max,
    dCancelActive: slot.d_cancel_active,
    dCancelExpiry: slot.d_cancel_expires_at ?? undefined,
  });

  // Calculate seconds remaining in the 10-min window
  const now = new Date();
  const offerActive =
    slot.d_cancel_active &&
    slot.d_cancel_expires_at &&
    now < slot.d_cancel_expires_at;

  const secondsRemaining = offerActive
    ? Math.max(
        0,
        Math.floor(
          (slot.d_cancel_expires_at!.getTime() - now.getTime()) / 1000,
        ),
      )
    : 0;

  return NextResponse.json({
    slot: {
      id: slot.id,
      start_time: slot.start_time,
      duration_mins: slot.duration_mins,
      status: slot.status,
      professional: { name: slot.professional.name },
    },
    waitlistCount,
    offerActive,
    secondsRemaining,
    currentPrice: livePrice.currentPrice,
    breakdown: livePrice,
  });
}
