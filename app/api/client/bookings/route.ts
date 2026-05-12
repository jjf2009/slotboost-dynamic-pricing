import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/getUser";
import { NextResponse } from "next/server";

// GET /api/client/bookings — returns the logged-in client's bookings
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

  const bookings = await prisma.booking.findMany({
    where: { clientId: client.id },
    include: {
      slot: {
        include: {
          professional: {
            select: { name: true, service_type: true, base_price: true },
          },
        },
      },
    },
    orderBy: { booked_at: "desc" },
  });

  return NextResponse.json(bookings);
}
