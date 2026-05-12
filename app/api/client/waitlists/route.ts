import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/getUser";
import { calculatePrice } from "@/lib/pricing";
import { NextResponse } from "next/server";

// GET /api/client/waitlists — returns slots the client is waitlisted on
export async function GET() {
  const user = await getUserFromRequest();
  if (!user || user.role !== "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await prisma.client.findUnique({
    where: { userId: user.userId },
  });

  if (!client) {
    return NextResponse.json({ error: "Client profile not found" }, { status: 404 });
  }

  const waitlists = await prisma.waitlist.findMany({
    where: { clientId: client.id },
    include: {
      slot: {
        include: {
          professional: {
            select: { name: true, service_type: true, base_price: true, d_max: true },
          },
        },
      },
    },
    orderBy: { joined_at: "desc" },
  });

  // Attach live pricing to each waitlisted slot
  const waitlistsWithPricing = waitlists.map((entry) => {
    const slot = entry.slot;
    const pro = slot.professional;
    const pricing = calculatePrice({
      basePrice: pro.base_price,
      startTime: slot.start_time,
      demandIndex: slot.demand_index,
      dMax: pro.d_max,
      dCancelActive: slot.d_cancel_active,
      dCancelExpiry: slot.d_cancel_expires_at ?? undefined,
    });
    return { ...entry, live_price: pricing };
  });

  return NextResponse.json(waitlistsWithPricing);
}
