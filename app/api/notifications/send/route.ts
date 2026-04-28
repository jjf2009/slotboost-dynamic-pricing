import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { type, slotId, clientId, price } = await req.json();

  const { data: slot } = await supabase
    .from("slots")
    .select("*, professionals(*)")
    .eq("id", slotId)
    .single();

  if (!slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  const pro = slot.professionals;
  const slotTime = format(new Date(slot.start_time), "dd MMM, h:mm a");

  // NOTE: In production, uncomment Twilio integration:
  // import { getTwilioClient, TWILIO_PHONE, TWILIO_WHATSAPP } from '@/lib/twilio'
  // const twilioClient = getTwilioClient()

  if (type === "confirmation") {
    const { data: clientData } = await supabase
      .from("clients")
      .select("phone")
      .eq("id", clientId)
      .single();

    const message = `✅ Booking confirmed! ${pro.name} on ${slotTime}. Price: ₹${price}. See you there!`;

    console.log(`[SMS → ${clientData?.phone}] ${message}`);

    // Production: twilioClient.messages.create({ body: message, from: TWILIO_PHONE, to: clientData.phone })
  }

  if (type === "flash_deal") {
    const { data: subs } = await supabase
      .from("subscribers")
      .select("phone, channel")
      .eq("professional_id", pro.id);

    const currentPrice = slot.current_price;
    const discount = Math.round(
      (1 - currentPrice / pro.base_price) * 100
    );
    const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/book/${slotId}`;

    for (const sub of subs ?? []) {
      const message = `⚡ Flash Deal! ${pro.name}'s ${slotTime} slot is now ₹${currentPrice} (${discount}% off ₹${pro.base_price}). Book now: ${bookingUrl}`;
      console.log(`[${sub.channel.toUpperCase()} → ${sub.phone}] ${message}`);

      // Production:
      // const from = sub.channel === 'whatsapp' ? TWILIO_WHATSAPP : TWILIO_PHONE
      // const to = sub.channel === 'whatsapp' ? `whatsapp:${sub.phone}` : sub.phone
      // await twilioClient.messages.create({ body: message, from, to }).catch(console.error)
    }
  }

  if (type === "waitlist_autopilot") {
    const { data: waitlist } = await supabase
      .from("waitlists")
      .select("clients(phone)")
      .eq("slot_id", slotId);

    const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/waitlist/${slotId}`;

    for (const entry of waitlist ?? []) {
      const phone = (entry.clients as any)?.phone;
      if (!phone) continue;

      const message = `🚨 Urgent! ${pro.name}'s ${slotTime} slot just opened at ₹${slot.current_price}. Valid 10 mins only: ${bookingUrl}`;
      console.log(`[SMS → ${phone}] ${message}`);

      // Production:
      // await twilioClient.messages.create({ body: message, from: TWILIO_PHONE, to: phone }).catch(console.error)
    }
  }

  return NextResponse.json({ success: true });
}
