import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/getUser";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const subscribeSchema = z.object({
  professionalId: z.string().uuid(),
  phone: z.string().min(10),
  channel: z.enum(["sms", "whatsapp"]).default("sms"),
});

// POST /api/subscribers → subscribe to flash deals (FR-10)
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const { professionalId, phone, channel } = parsed.data;

  // Find the client profile for this user
  const client = await prisma.client.findUnique({ where: { userId: user.userId } });
  if (!client) {
    return NextResponse.json({ error: "Client profile not found" }, { status: 404 });
  }

  try {
    const subscriber = await prisma.subscriber.create({
      data: { professionalId, clientId: client.id, phone, channel },
    });
    return NextResponse.json({ success: true, subscriber }, { status: 201 });
  } catch {
    // Unique constraint: [professionalId, clientId]
    return NextResponse.json({ error: "Already subscribed to this professional" }, { status: 409 });
  }
}

// DELETE /api/subscribers → unsubscribe from flash deals (FR-11)
export async function DELETE(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { professionalId } = await req.json();
  if (!professionalId) {
    return NextResponse.json({ error: "professionalId is required" }, { status: 400 });
  }

  const client = await prisma.client.findUnique({ where: { userId: user.userId } });
  if (!client) {
    return NextResponse.json({ error: "Client profile not found" }, { status: 404 });
  }

  const deleted = await prisma.subscriber.deleteMany({
    where: { professionalId, clientId: client.id },
  });

  // FR-11: removal must be reflected immediately (synchronous delete above guarantees it)
  return NextResponse.json({ success: true, removed: deleted.count });
}

// GET /api/subscribers?professionalId=xyz
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ isSubscribed: false });
  }

  const { searchParams } = new URL(req.url);
  const professionalId = searchParams.get("professionalId");
  if (!professionalId) {
    return NextResponse.json({ error: "professionalId is required" }, { status: 400 });
  }

  const client = await prisma.client.findUnique({ where: { userId: user.userId } });
  if (!client) {
    return NextResponse.json({ isSubscribed: false });
  }

  const subscriber = await prisma.subscriber.findUnique({
    where: {
      professionalId_clientId: {
        professionalId,
        clientId: client.id,
      },
    },
  });

  return NextResponse.json({ isSubscribed: !!subscriber });
}
