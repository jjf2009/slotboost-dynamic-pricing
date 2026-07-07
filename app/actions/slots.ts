"use server";

import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/getUser";
import { calculatePrice } from "@/lib/pricing";
import { revalidatePath } from "next/cache";

export async function createSlotAction(formData: {
  date: string;
  time: string;
  duration: number;
  demandIndex: number;
}) {
  const userPayload = await getUserFromRequest();

  if (!userPayload || userPayload.role !== "professional") {
    throw new Error("Unauthorized");
  }

  const professional = await prisma.professional.findUnique({
    where: { userId: userPayload.userId },
  });

  if (!professional) {
    throw new Error("Professional profile not found");
  }

  const startTime = new Date(`${formData.date}T${formData.time}`);
  if (startTime <= new Date()) {
    throw new Error("Slot must be in the future");
  }

  const heatMap =
    professional.heat_map &&
    typeof professional.heat_map === "object" &&
    !Array.isArray(professional.heat_map)
      ? (professional.heat_map as Record<string, number>)
      : {};
  const heatMapKey = `${["mon", "tue", "wed", "thu", "fri", "sat", "sun"][(startTime.getDay() + 6) % 7]}_${String(startTime.getHours()).padStart(2, "0")}`;
  const demandIndex = heatMap[heatMapKey] ?? formData.demandIndex ?? 0.5;

  // Calculate initial price using the pricing engine
  const { currentPrice } = calculatePrice({
    basePrice: professional.base_price,
    startTime,
    demandIndex,
    dMax: professional.d_max,
    dCancelActive: false,
  });

  const slot = await prisma.slot.create({
    data: {
      professionalId: professional.id,
      start_time: startTime,
      duration_mins: formData.duration ?? 60,
      demand_index: demandIndex,
      current_price: currentPrice,
      status: "available",
    },
  });

  revalidatePath("/professional/dashboard");
  return slot;
}

export async function deleteSlotAction(slotId: string) {
  const userPayload = await getUserFromRequest();

  if (!userPayload || userPayload.role !== "professional") {
    throw new Error("Unauthorized");
  }

  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
    include: { professional: true },
  });

  if (!slot) throw new Error("Slot not found");
  if (slot.professional.userId !== userPayload.userId)
    throw new Error("Forbidden");

  // FR-06: Block deletion if slot is booked
  if (slot.status === "booked") {
    throw new Error("Cannot delete a slot that has an active booking.");
  }

  await prisma.slot.delete({ where: { id: slotId } });
  revalidatePath("/professional/dashboard");
  return { success: true };
}
