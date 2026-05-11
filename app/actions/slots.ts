"use server";

import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/getUser";
import { revalidatePath } from "next/cache";

export async function createSlotAction(formData: {
  date: string;
  time: string;
  duration: number;
  demandIndex: number;
  price: number;
}) {
  const userPayload = await getUserFromRequest();

  if (!userPayload) {
    throw new Error("Unauthorized");
  }

  const professional = await prisma.professional.findUnique({
    where: { userId: userPayload.userId },
  });

  if (!professional) {
    throw new Error("Professional profile not found");
  }

  // Combine date + time
  const startTime = new Date(`${formData.date}T${formData.time}`);

  if (startTime <= new Date()) {
    throw new Error("Slot must be in the future");
  }

  const slot = await prisma.slot.create({
    data: {
      professionalId: professional.id,
      start_time: startTime,
      duration_mins: formData.duration,
      demand_index: formData.demandIndex,
      current_price: formData.price,
      status: "available",
    },
  });

  revalidatePath("/professional/dashboard");
  return slot;
}
