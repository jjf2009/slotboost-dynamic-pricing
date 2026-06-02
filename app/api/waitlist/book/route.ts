import { prisma } from "@/lib/db";
import { calculatePrice } from "@/lib/pricing";
import { getUserFromRequest } from "@/lib/getUser";
import { NextRequest, NextResponse } from "next/server";

// POST /api/waitlist/book
// Allows a waitlisted client to book within the 10-minute D_cancel window (FR-26, FR-27)
export async function POST(req: NextRequest) {
  const { slotId, email, name, phone } = await req.json();

  if (!slotId || !email) {
    return NextResponse.json({ error: "slotId and email are required" }, { status: 400 });
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
      if (!slot.d_cancel_active || !slot.d_cancel_expires_at || now > slot.d_cancel_expires_at) {
        throw new Error("OFFER_EXPIRED");
      }

      // Recalculate price with D_cancel still active
      const { currentPrice } = calculatePrice({
        basePrice: slot.professional.base_price,
        startTime: slot.start_time,
        demandIndex: slot.demand_index,
        dMax: slot.professional.d_max,
        dCancelActive: true,
        dCancelExpiry: slot.d_cancel_expires_at,
      });

      // Get or create client
      const authUser = await getUserFromRequest();
      let client = await tx.client.findUnique({ where: { email } });

      if (!client) {
        throw new Error("NOT_WAITLISTED");
      }

      const waitlistEntry = await tx.waitlist.findUnique({
        where: {
          slotId_clientId: {
            slotId,
            clientId: client.id,
          },
        },
      });

      if (!waitlistEntry) {
        throw new Error("NOT_WAITLISTED");
      }

      if (authUser?.userId && !client.userId) {
        client = await tx.client.update({
          where: { id: client.id },
          data: {
            userId: authUser.userId,
            name: name ?? client.name,
            phone: phone ?? client.phone,
          },
        });
      }

      // Atomically claim the slot for first-come-first-served behavior (FR-27)
      const claimed = await tx.slot.updateMany({
        where: { id: slotId, status: "available" },
        data: {
          status: "booked",
          current_price: currentPrice,
          d_cancel_active: false,
          d_cancel_expires_at: null,
        },
      });

      if (claimed.count === 0) {
        throw new Error("SLOT_NOT_AVAILABLE");
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

      // Remove the booking client from waitlist
      await tx.waitlist.deleteMany({
        where: { slotId, clientId: client.id },
      });

      return { booking, client, currentPrice };
    });

    // Notify remaining waitlisted clients "slot filled" (FR-27)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await fetch(`${appUrl}/api/notifications/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "slot_filled", slotId }),
    }).catch(console.error);

    await prisma.waitlist.deleteMany({ where: { slotId } });

    return NextResponse.json({ booking: result.booking, price: result.currentPrice }, { status: 201 });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "SLOT_NOT_AVAILABLE") {
      return NextResponse.json({ error: "Slot no longer available." }, { status: 409 });
    }
    if (error.message === "OFFER_EXPIRED") {
      return NextResponse.json(
        { error: "The 10-minute offer window has expired. The slot is available at regular pricing." },
        { status: 410 }
      );
    }
    if (error.message === "NOT_WAITLISTED") {
      return NextResponse.json(
        { error: "Only clients already on this waitlist can claim the recovery offer." },
        { status: 403 }
      );
    }
    console.error("Waitlist booking error:", err);
    return NextResponse.json({ error: "Booking failed" }, { status: 500 });
  }
}
