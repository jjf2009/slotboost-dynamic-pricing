import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/getUser";
import { NextRequest, NextResponse } from "next/server";

// POST /api/slots/cancel
// Cancels a booking. If within 4-hr recovery window, activates D_cancel + waitlist autopilot.
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId } = await req.json();
  if (!bookingId) {
    return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { slot: { include: { professional: true } }, client: true },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (booking.status === "cancelled") {
    return NextResponse.json({ error: "Booking already cancelled" }, { status: 409 });
  }

  // Auth check: only the booking's client OR the professional can cancel
  const professional = booking.slot.professional;
  const isClient = user.userId === booking.client.userId;
  const isProfessional = user.userId === professional.userId;

  if (!isClient && !isProfessional) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const hoursRemaining =
    (booking.slot.start_time.getTime() - Date.now()) / (1000 * 60 * 60);
  const withinRecovery = hoursRemaining < 4;

  const dCancelExpiresAt = withinRecovery
    ? new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    : null;

  // Atomic: cancel booking + reopen slot
  await prisma.$transaction([
    prisma.booking.update({
      where: { id: bookingId },
      data: { status: "cancelled", cancelled_at: new Date() },
    }),
    prisma.slot.update({
      where: { id: booking.slotId },
      data: {
        status: "available",
        d_cancel_active: withinRecovery,
        d_cancel_expires_at: dCancelExpiresAt,
      },
    }),
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (isProfessional) {
    // FR-23: Professional cancelled — notify the client with a full-refund message
    fetch(`${appUrl}/api/notifications/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "professional_cancel",
        slotId: booking.slotId,
        clientId: booking.clientId,
      }),
    }).catch(console.error);
  } else if (withinRecovery) {
    // FR-22, FR-25: Client cancelled within recovery window — trigger waitlist autopilot
    fetch(`${appUrl}/api/notifications/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "waitlist_autopilot", slotId: booking.slotId }),
    }).catch(console.error);
  }

  return NextResponse.json({ success: true, withinRecovery, dCancelExpiresAt });
}
