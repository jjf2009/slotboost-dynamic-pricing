import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/getUser";
import { calculatePrice } from "@/lib/pricing";
import { getDemandIndexFromHeatMap } from "@/lib/heatmap";
import { NextRequest, NextResponse } from "next/server";

// GET /api/slots/[id] → single slot with live price
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const slot = await prisma.slot.findUnique({
    where: { id },
    include: { professional: true, waitlists: true },
  });

  if (!slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

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

  return NextResponse.json({ ...slot, live_price: livePrice });
}

// DELETE /api/slots/[id] → delete slot, block if booked (FR-06)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUserFromRequest();
  if (!user || user.role !== "professional") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const slot = await prisma.slot.findUnique({
    where: { id },
    include: { professional: true },
  });

  if (!slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  // Ensure the professional owns this slot
  if (slot.professional.userId !== user.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // FR-06: Prevent deletion of a slot with an active booking
  if (slot.status === "booked") {
    return NextResponse.json(
      { error: "Cannot delete a slot that has an active booking." },
      { status: 409 },
    );
  }

  await prisma.slot.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
