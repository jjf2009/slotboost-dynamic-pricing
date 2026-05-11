import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/getUser";
import { prisma } from "@/lib/db";

export async function GET() {
  const userPayload = await getUserFromRequest();

  if (!userPayload) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userPayload.userId },
    select: {
      id: true,
      name: true,
      email: true,
      created_at: true,
    }
  });

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const professional = await prisma.professional.findUnique({
    where: { userId: user.id }
  });

  return NextResponse.json({
    user,
    role: userPayload.role,
    professional
  });
}
