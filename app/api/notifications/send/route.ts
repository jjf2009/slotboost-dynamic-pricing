import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";

// POST /api/notifications/send
// Dispatches notifications. Currently logs to console.
// To activate Twilio: uncomment the lines marked [TWILIO]
export async function POST(req: NextRequest) {
  const { type, slotId, clientId, price } = await req.json();

  if (!type || !slotId) {
    return NextResponse.json({ error: "type and slotId are required" }, { status: 400 });
  }

  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
    include: { professional: true },
  });

  if (!slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  const pro = slot.professional;
  const slotTime = format(slot.start_time, "dd MMM, h:mm a");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // ── Booking Confirmation (FR-21) ──────────────────────────────────────────
  if (type === "confirmation") {
    if (!clientId) {
      return NextResponse.json({ error: "clientId required for confirmation" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const clientMsg = `✅ Booking confirmed! ${pro.name} on ${slotTime}. Price: ₹${price}. See you there!`;
    const proMsg = `📅 New booking! ${client.name} booked your ${slotTime} slot at ₹${price}.`;

    console.log(`[SMS → Client ${client.phone ?? client.email}] ${clientMsg}`);
    console.log(`[SMS → Professional ${pro.phone ?? pro.email}] ${proMsg}`);
    // [TWILIO] await twilioClient.messages.create({ body: clientMsg, from: TWILIO_PHONE, to: client.phone })
    // [TWILIO] await twilioClient.messages.create({ body: proMsg, from: TWILIO_PHONE, to: pro.phone })
  }

  // ── Flash Deal (FR-18) ────────────────────────────────────────────────────
  if (type === "flash_deal") {
    const subscribers = await prisma.subscriber.findMany({
      where: { professionalId: pro.id },
    });

    const currentPrice = slot.current_price;
    const discount = Math.round((1 - currentPrice / pro.base_price) * 100);
    const bookingUrl = `${appUrl}/book/${slotId}`;

    for (const sub of subscribers) {
      const msg = `⚡ Flash Deal! ${pro.name}'s ${slotTime} slot is now ₹${currentPrice} (${discount}% off ₹${pro.base_price}). Book now: ${bookingUrl}`;
      console.log(`[${sub.channel.toUpperCase()} → ${sub.phone}] ${msg}`);
      // [TWILIO] const from = sub.channel === 'whatsapp' ? TWILIO_WHATSAPP : TWILIO_PHONE
      // [TWILIO] const to = sub.channel === 'whatsapp' ? `whatsapp:${sub.phone}` : sub.phone
      // [TWILIO] await twilioClient.messages.create({ body: msg, from, to }).catch(console.error)
    }
  }

  // ── Waitlist Autopilot (FR-25) ────────────────────────────────────────────
  if (type === "waitlist_autopilot") {
    const waitlist = await prisma.waitlist.findMany({
      where: { slotId },
      include: { client: true },
    });

    const bookingUrl = `${appUrl}/waitlist/${slotId}`;

    for (const entry of waitlist) {
      const phone = entry.client.phone;
      const identifier = phone ?? entry.client.email;
      const msg = `🚨 Urgent! ${pro.name}'s ${slotTime} slot just opened at ₹${slot.current_price}. Valid 10 mins only: ${bookingUrl}`;
      console.log(`[SMS → ${identifier}] ${msg}`);
      // [TWILIO] await twilioClient.messages.create({ body: msg, from: TWILIO_PHONE, to: phone }).catch(console.error)
    }
  }

  return NextResponse.json({ success: true, type });
}
