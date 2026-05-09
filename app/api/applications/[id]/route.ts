import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/getUser";
import { ApplicationService } from "@/lib/services/application.service";
import { z } from "zod";
import { ApplicationStatus, ApplicationMethod } from "@prisma/client";

const updateApplicationSchema = z.object({
  company: z.string().optional(),
  role: z.string().optional(),
  status: z.nativeEnum(ApplicationStatus).optional(),
  method: z.nativeEnum(ApplicationMethod).optional(),
  appliedDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json();
  const parsed = updateApplicationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error },
      { status: 400 }
    );
  }

  try {
    const updated = await ApplicationService.updateApplication(
      id,
      user.userId,
      parsed.data
    );
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.message === "APPLICATION_NOT_FOUND") {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    await ApplicationService.deleteApplication(id, user.userId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "APPLICATION_NOT_FOUND") {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete application" }, { status: 500 });
  }
}
