import { getUserFromRequest } from "@/lib/getUser";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/auth/me → returns current user + profile (no Supabase)
export async function GET() {
  const user = await getUserFromRequest();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      created_at: true,
      professional: {
        select: {
          id: true,
          name: true,
          phone: true,
          service_type: true,
          base_price: true,
          d_max: true,
          heat_map: true,
          is_mobile: true,
        },
      },
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
    },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(dbUser);
}
