import { prisma } from "@/lib/db";
import { calculatePrice } from "@/lib/pricing";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/getUser";

// POST /api/slots/book
// Books a slot atomically using a Prisma transaction to prevent double-booking
export async function POST(req: NextRequest) {
  const { slotId, name, email, phone } = await req.json();

  if (!slotId || !email) {
    return NextResponse.json({ error: "slotId and email are required" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Lock and verify slot is available
      const slot = await tx.slot.findUnique({
        where: { id: slotId },
        include: { professional: true },
      });

      if (!slot || slot.status !== "available") {
        throw new Error("SLOT_NOT_AVAILABLE");
      }

      // 2. Recalculate price at moment of booking (FR-19 — prevent stale price exploit)
      const { currentPrice } = calculatePrice({
        basePrice: slot.professional.base_price,
        startTime: slot.start_time,
        demandIndex: slot.demand_index,
        dMax: slot.professional.d_max,
        dCancelActive: slot.d_cancel_active,
        dCancelExpiry: slot.d_cancel_expires_at ?? undefined,
      });

      // 3. Get or create client record
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

      // 4. Create booking record
      const booking = await tx.booking.create({
        data: {
          slotId,
          clientId: client.id,
          price_paid: currentPrice,
          status: "confirmed",
        },
      });

      // 5. Mark slot as booked and freeze price (FR-19)
      await tx.slot.update({
        where: { id: slotId },
        data: { status: "booked", current_price: currentPrice },
      });

      return { booking, client, currentPrice };
    });

    // 6. Fire confirmation notification (fire-and-forget)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    fetch(`${appUrl}/api/notifications/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "confirmation",
        slotId,
        clientId: result.client.id,
        price: result.currentPrice,
      }),
    }).catch(console.error);

    return NextResponse.json({ booking: result.booking, price: result.currentPrice }, { status: 201 });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "SLOT_NOT_AVAILABLE") {
      return NextResponse.json(
        { error: "Slot not available. Would you like to join the waitlist?" },
        { status: 409 }
      );
    }
    console.error("Booking error:", err);
    return NextResponse.json({ error: "Booking failed" }, { status: 500 });
  }
}
