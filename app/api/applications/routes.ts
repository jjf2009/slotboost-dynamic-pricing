import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/getUser";
import { ApplicationService } from "@/lib/services/application.service";
export const createApplicationSchema = z.object({
  company: z.string().min(1, { message: "Company is required" }),

  role: z.string().min(1, { message: "Role is required" }),

  status: z.enum(["APPLIED", "INTERVIEW", "OFFER", "REJECTED"]),

  method: z.enum(["COLD EMAIL", "OFFICAL MEANS"]),

  appliedDate: z.string().datetime({
    message: "Invalid date format",
  }),

  notes: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await getUserFromRequest();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const parsed = createApplicationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error },
      { status: 400 },
    );
  }

  const application = await ApplicationService.createApplication(
    parsed.data,
    user.userId,
  );

  return NextResponse.json(application, { status: 201 });
}
export async function GET() {
  try {
    const user = await getUserFromRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const applications = await ApplicationService.getUserApplications(
      user.userId,
    );

    return NextResponse.json(applications);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 },
    );
  }
}