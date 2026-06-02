import { prisma } from "@/lib/db";
import { calculatePrice } from "@/lib/pricing";
import { getDemandIndexFromHeatMap } from "@/lib/heatmap";
import { getUserFromRequest } from "@/lib/getUser";
import { NextRequest, NextResponse } from "next/server";

// POST /api/waitlist/book
// Allows a waitlisted client to book within the 10-minute D_cancel window (FR-26, FR-27)
export async function POST(req: NextRequest) {
  const { slotId, email, name, phone } = await req.json();

  if (!slotId || !email) {
    return NextResponse.json(
      { error: "slotId and email are required" },
      { status: 400 },
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const slot = await tx.slot.findUnique({
        where: { id: slotId },
        include: { professional: true },
      });

      if (!slot || slot.status !== "available") {
        throw new Error("SLOT_NOT_AVAILABLE");
      }

      // FR-26: Check the 10-minute offer window
      const now = new Date();
      if (
        !slot.d_cancel_active ||
        !slot.d_cancel_expires_at ||
        now > slot.d_cancel_expires_at
      ) {
        throw new Error("OFFER_EXPIRED");
      }

      // Recalculate price with D_cancel still active
      const { currentPrice } = calculatePrice({
        basePrice: slot.professional.base_price,
        startTime: slot.start_time,
        demandIndex: getDemandIndexFromHeatMap(
          slot.professional.heat_map,
          slot.start_time,
          slot.demand_index,
        ),
        dMax: slot.professional.d_max,
        dCancelActive: true,
        dCancelExpiry: slot.d_cancel_expires_at,
      });

      // Get or create client
      const authUser = await getUserFromRequest();
      let client = await tx.client.findUnique({ where: { email } });
      if (!client) {
        client = await tx.client.create({
          data: {
            name: name ?? email,
            email,
            phone: phone ?? null,
            userId: authUser?.userId ?? null,
          },
        });
      }

      // Create booking
      const booking = await tx.booking.create({
        data: {
          slotId,
          clientId: client.id,
          price_paid: currentPrice,
          status: "confirmed",
        },
      });

      // Mark slot as booked, deactivate D_cancel (FR-27)
      await tx.slot.update({
        where: { id: slotId },
        data: {
          status: "booked",
          current_price: currentPrice,
          d_cancel_active: false,
          d_cancel_expires_at: null,
        },
      });

      // Remove the booking client from waitlist
      await tx.waitlist.deleteMany({
        where: { slotId, clientId: client.id },
      });

      return { booking, client, currentPrice };
    });

    // Notify remaining waitlisted clients "slot filled" (FR-27)
    const remainingWaitlist = await prisma.waitlist.findMany({
      where: { slotId },
      include: { client: true },
    });

    for (const entry of remainingWaitlist) {
      console.log(
        `[SMS → ${entry.client.phone ?? entry.client.email}] Slot filled — someone else booked it.`,
      );
    }

    return NextResponse.json(
      { booking: result.booking, price: result.currentPrice },
      { status: 201 },
    );
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "SLOT_NOT_AVAILABLE") {
      return NextResponse.json(
        { error: "Slot no longer available." },
        { status: 409 },
      );
    }
    if (error.message === "OFFER_EXPIRED") {
      return NextResponse.json(
        {
          error:
            "The 10-minute offer window has expired. The slot is available at regular pricing.",
        },
        { status: 410 },
      );
    }
    console.error("Waitlist booking error:", err);
    return NextResponse.json({ error: "Booking failed" }, { status: 500 });
  }
}
