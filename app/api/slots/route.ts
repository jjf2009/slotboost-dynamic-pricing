import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/getUser";
import { calculatePrice } from "@/lib/pricing";
import { getDemandIndexFromHeatMap } from "@/lib/heatmap";
import { NextRequest, NextResponse } from "next/server";

// GET /api/slots?professionalId=xxx  → list available slots with live prices
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const professionalId = searchParams.get("professionalId");

  if (!professionalId) {
    return NextResponse.json(
      { error: "professionalId is required" },
      { status: 400 },
    );
  }

  const slots = await prisma.slot.findMany({
    where: {
      professionalId,
      status: "available",
      start_time: { gt: new Date() },
    },
    include: { professional: true },
    orderBy: { start_time: "asc" },
  });

  // Attach live price to each slot
  const slotsWithLivePrice = slots.map((slot) => {
    const result = calculatePrice({
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
    return { ...slot, live_price: result };
  });

  return NextResponse.json(slotsWithLivePrice);
}

// POST /api/slots → create a new slot (professional only)
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user || user.role !== "professional") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { date, time, duration, demandIndex } = body;

  if (!date || !time) {
    return NextResponse.json(
      { error: "date and time are required" },
      { status: 400 },
    );
  }

  const professional = await prisma.professional.findUnique({
    where: { userId: user.userId },
  });
  if (!professional) {
    return NextResponse.json(
      { error: "Professional profile not found" },
      { status: 404 },
    );
  }

  const startTime = new Date(`${date}T${time}`);
  if (startTime <= new Date()) {
    return NextResponse.json(
      { error: "Slot must be in the future" },
      { status: 400 },
    );
  }

  const heatMap =
    professional.heat_map &&
    typeof professional.heat_map === "object" &&
    !Array.isArray(professional.heat_map)
      ? (professional.heat_map as Record<string, number>)
      : {};
  const heatMapKey = `${["mon", "tue", "wed", "thu", "fri", "sat", "sun"][(startTime.getDay() + 6) % 7]}_${String(startTime.getHours()).padStart(2, "0")}`;
  const resolvedDemandIndex = heatMap[heatMapKey] ?? demandIndex ?? 0.5;

  // Calculate initial price
  const { currentPrice } = calculatePrice({
    basePrice: professional.base_price,
    startTime,
    demandIndex: resolvedDemandIndex,
    dMax: professional.d_max,
    dCancelActive: false,
  });

  const slot = await prisma.slot.create({
    data: {
      professionalId: professional.id,
      start_time: startTime,
      duration_mins: duration ?? 60,
      demand_index: resolvedDemandIndex,
      current_price: currentPrice,
      status: "available",
    },
  });

  return NextResponse.json(slot, { status: 201 });
}
