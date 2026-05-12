import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/getUser";
import { NextRequest, NextResponse } from "next/server";

// GET /api/professionals — list all professionals with available slot counts
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const serviceType = searchParams.get("serviceType");

  const where: Record<string, unknown> = {};
  if (serviceType) {
    where.service_type = { contains: serviceType, mode: "insensitive" };
  }

  const professionals = await prisma.professional.findMany({
    where,
    select: {
      id: true,
      name: true,
      service_type: true,
      base_price: true,
      d_max: true,
      is_mobile: true,
      _count: {
        select: {
          slots: {
            where: {
              status: "available",
              start_time: { gt: new Date() },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(professionals);
}
