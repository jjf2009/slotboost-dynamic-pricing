import { prisma } from "@/lib/db";
import { calculatePrice } from "@/lib/pricing";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/getUser";
import { Prisma } from "@prisma/client";

// FR-28/29: Call the geo-check endpoint for mobile professionals
async function runGeoCheck(
  origin: string,
  destination: string,
  departureTime: Date
): Promise<{ allowed: boolean; durationMinutes?: number }> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${appUrl}/api/geo/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin, destination, departureTime }),
    });
    return await res.json();
  } catch {
    // FR-30: Fallback — allow booking if geo API is unreachable
    return { allowed: true };
  }
}

// POST /api/slots/book
// Books a slot atomically using a Prisma transaction to prevent double-booking
export async function POST(req: NextRequest) {
  const { slotId, name, email, phone, clientLocation, previousJobLocation } = await req.json();

  if (!slotId || !email) {
    return NextResponse.json({ error: "slotId and email are required" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Lock and verify slot is available
      const slot = await tx.slot.findUnique({
        where: { id: slotId },
        include: { professional: true },
      });

      if (!slot || slot.status !== "available") {
        throw new Error("SLOT_NOT_AVAILABLE");
      }

      // FR-28/29: Geo-check for mobile professionals
      // clientLocation & previousJobLocation are optional strings like "Panaji, Goa"
      if (slot.professional.is_mobile && clientLocation) {
        const origin = previousJobLocation || "Panaji, Goa"; // fallback origin
        const geo = await runGeoCheck(origin, clientLocation, slot.start_time);
        if (!geo.allowed) {
          throw new Error("GEO_BLOCKED");
        }
      }

      if (slot.professional.is_mobile && !clientLocation) {
        throw new Error("GEO_LOCATION_REQUIRED");
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

      // 4. Atomically claim the slot before creating the booking (FR-20)
      const claimed = await tx.slot.updateMany({
        where: { id: slotId, status: "available" },
        data: { status: "booked", current_price: currentPrice },
      });

      if (claimed.count === 0) {
        throw new Error("SLOT_NOT_AVAILABLE");
      }

      // 5. Create booking record
      const booking = await tx.booking.create({
        data: {
          slotId,
          clientId: client.id,
          price_paid: currentPrice,
          status: "confirmed",
        },
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
    // FR-29: Geo-blocked booking
    if (error.message === "GEO_BLOCKED") {
      return NextResponse.json(
        { error: "This professional is not available in your area for this time slot." },
        { status: 403 }
      );
    }
    if (error.message === "GEO_LOCATION_REQUIRED") {
      return NextResponse.json(
        { error: "Please enter your location/address so we can check this mobile professional's travel time." },
        { status: 400 }
      );
    }
    console.error("Booking error:", err);
    return NextResponse.json({ error: "Booking failed" }, { status: 500 });
  }
}
