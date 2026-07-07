import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import twilio from "twilio";

const twilioWhatsappNumber = "whatsapp:+14155238886";

// FR-21/24/25/26/27: Send free template-approved WhatsApp messages via Twilio Sandbox
async function sendWhatsApp(to: string | null, contentVariables: { "1": string; "2": string }) {
  if (!to) return;
  
  // Format target number to whatsapp:+<number> format
  let formattedTo = to.trim();
  if (!formattedTo.startsWith("whatsapp:")) {
    // Strip everything except digits
    let digits = formattedTo.replace(/\D/g, "");
    // If it's a 10-digit number, prepend Indian country code 91 (common for +91)
    if (digits.length === 10) {
      digits = `91${digits}`;
    }
    formattedTo = `whatsapp:+${digits}`;
  }

  console.log(`[Twilio WhatsApp → ${formattedTo}] Sending variables:`, contentVariables);

  const activeAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const activeAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioClient = activeAccountSid && activeAuthToken ? twilio(activeAccountSid, activeAuthToken) : null;

  if (twilioClient) {
    try {
      const message = await twilioClient.messages.create({
        from: twilioWhatsappNumber,
        contentSid: "HXb5b62575e6e4ff6129ad7c8efe1f983e", // Pre-approved Sandbox Template
        contentVariables: JSON.stringify(contentVariables),
        to: formattedTo,
      });
      console.log(`[Twilio WhatsApp Success] SID: ${message.sid}`);
    } catch (err) {
      console.error(`[Twilio WhatsApp Error] Failed to send to ${formattedTo}:`, err);
    }
  } else {
    console.log(`[Twilio Simulation] Credentials missing. Mocking message sending.`);
  }
}

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

    // Send WhatsApp to Client
    await sendWhatsApp(client.phone, {
      "1": `Booking with ${pro.name}`,
      "2": `${slotTime} (Price: ₹${price})`
    });

    // Send WhatsApp to Professional
    await sendWhatsApp(pro.phone, {
      "1": `New Booking by ${client.name}`,
      "2": `${slotTime} (Price: ₹${price})`
    });
  }

  // ── Flash Deal (FR-18) ────────────────────────────────────────────────────
  if (type === "flash_deal") {
    const subscribers = await prisma.subscriber.findMany({
      where: { professionalId: pro.id },
    });

    const currentPrice = slot.current_price;
    const discount = Math.round((1 - currentPrice / pro.base_price) * 100);

    for (const sub of subscribers) {
      await sendWhatsApp(sub.phone, {
        "1": `⚡ Flash Deal with ${pro.name}!`,
        "2": `${slotTime} - now at ₹${currentPrice} (${discount}% off)`
      });
    }
  }

  // ── Waitlist Autopilot (FR-25) ────────────────────────────────────────────
  if (type === "waitlist_autopilot") {
    const waitlist = await prisma.waitlist.findMany({
      where: { slotId },
      include: { client: true },
    });

    for (const entry of waitlist) {
      await sendWhatsApp(entry.client.phone, {
        "1": `🚨 Slot Open with ${pro.name}!`,
        "2": `${slotTime} - Book inside 10 mins: ${appUrl}/waitlist/${slotId}`
      });
    }
  }

  // ── Slot Filled — notify remaining waitlisted clients (FR-27) ─────────────
  if (type === "slot_filled") {
    const waitlist = await prisma.waitlist.findMany({
      where: { slotId },
      include: { client: true },
    });

    for (const entry of waitlist) {
      await sendWhatsApp(entry.client.phone, {
        "1": `Slot filled with ${pro.name}`,
        "2": `${slotTime} was just booked by another waitlisted client.`
      });
    }
  }

  // ── Professional Cancellation — notify client (FR-23) ────────────────────
  if (type === "professional_cancel") {
    if (!clientId) {
      return NextResponse.json({ error: "clientId required for professional_cancel" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    await sendWhatsApp(client.phone, {
      "1": `❌ Cancelled by ${pro.name}`,
      "2": `${slotTime} (Full refund will be processed)`
    });
  }

  // ── Slot Filled — notify remaining waitlist (FR-27) ───────────────────────
  if (type === "slot_filled") {
    if (!clientId) {
      return NextResponse.json({ error: "clientId required for slot_filled" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    await sendWhatsApp(client.phone, {
      "1": `Slot filled with ${pro.name}`,
      "2": `${slotTime} — someone else booked it. Keep an eye out for the next opening!`,
    });
  }

  // ── Appointment Reminder — 1 hour before slot (FR-24) ────────────────────
  if (type === "reminder") {
    if (!clientId) {
      return NextResponse.json({ error: "clientId required for reminder" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    await sendWhatsApp(client.phone, {
      "1": `⏰ Appointment Reminder`,
      "2": `Coming up in 1 hour with ${pro.name} (${slotTime})`
    });
  }

  return NextResponse.json({ success: true, type });
}
