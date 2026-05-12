import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/getUser";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  service_type: z.string().optional(),
  is_mobile: z.boolean().optional(),
  base_price: z.number().min(100).max(50000).optional(), // FR-02
  d_max: z.number().min(0).max(0.6).optional(),           // FR-03
});

// GET /api/professional/profile → get own profile
export async function GET() {
  const user = await getUserFromRequest();
  if (!user || user.role !== "professional") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const professional = await prisma.professional.findUnique({
    where: { userId: user.userId },
  });

  if (!professional) {
    return NextResponse.json({ error: "Professional profile not found" }, { status: 404 });
  }

  return NextResponse.json(professional);
}

// PUT /api/professional/profile → update base_price, d_max, service_type, is_mobile
export async function PUT(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user || user.role !== "professional") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = updateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const updated = await prisma.professional.update({
    where: { userId: user.userId },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}
