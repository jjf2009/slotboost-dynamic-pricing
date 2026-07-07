import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/getUser";
import { NextRequest, NextResponse } from "next/server";

// POST /api/waitlist/join → join the waitlist for a booked slot (FR-12)
export async function POST(req: NextRequest) {
  const { slotId, name, email, phone } = await req.json();

  if (!slotId || !email) {
    return NextResponse.json({ error: "slotId and email are required" }, { status: 400 });
  }

  const slot = await prisma.slot.findUnique({ where: { id: slotId } });
  if (!slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  if (slot.status === "available") {
    return NextResponse.json(
      { error: "Slot is available — please book directly instead of joining the waitlist." },
      { status: 409 }
    );
  }

  // Get or create client
  const authUser = await getUserFromRequest();
  let client = authUser?.userId
    ? await prisma.client.findUnique({ where: { userId: authUser.userId } })
    : null;

  if (!client) {
    client = await prisma.client.findUnique({ where: { email } });
  }

  if (!client) {
    client = await prisma.client.create({
      data: {
        name: name ?? email,
        email,
        phone: phone ?? null,
        userId: authUser?.userId ?? null,
      },
    });
  } else {
    const updateData: { name?: string; phone?: string | null; userId?: string | null } = {};
    if (name && name !== client.name) updateData.name = name;
    if (phone && phone !== client.phone) updateData.phone = phone;
    if (authUser?.userId && !client.userId) updateData.userId = authUser.userId;

    if (Object.keys(updateData).length > 0) {
      client = await prisma.client.update({
        where: { id: client.id },
        data: updateData,
      });
    }
  }

  // Join waitlist (@@unique on [slotId, clientId] prevents duplicates)
  try {
    const entry = await prisma.waitlist.create({
      data: { slotId, clientId: client.id },
    });
    return NextResponse.json({ success: true, waitlistEntry: entry }, { status: 201 });
  } catch {
    // Unique constraint violation = already on waitlist
    return NextResponse.json({ error: "Already on the waitlist for this slot" }, { status: 409 });
  }
}
