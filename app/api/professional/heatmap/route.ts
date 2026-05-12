import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/getUser";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Heat map is stored as a JSON object: { "mon_09": 0.8, "tue_14": 0.3, ... }
// Key format: "<day_abbr>_<hour_2digit>"  e.g. "mon_09", "fri_17"
// Value: 0.0 (no demand) – 1.0 (peak demand)
const heatMapSchema = z.record(
  z.string().regex(/^(mon|tue|wed|thu|fri|sat|sun)_\d{2}$/, "Invalid key format"),
  z.number().min(0).max(1)
);

// PUT /api/professional/heatmap → save DI values (FR-04)
export async function PUT(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user || user.role !== "professional") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = heatMapSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid heat map format", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await prisma.professional.update({
    where: { userId: user.userId },
    data: { heat_map: parsed.data },
  });

  return NextResponse.json({ heat_map: updated.heat_map });
}

// GET /api/professional/heatmap → retrieve current DI values
export async function GET() {
  const user = await getUserFromRequest();
  if (!user || user.role !== "professional") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const professional = await prisma.professional.findUnique({
    where: { userId: user.userId },
    select: { heat_map: true },
  });

  return NextResponse.json({ heat_map: professional?.heat_map ?? {} });
}
