import { prisma } from "@/lib/db";
import { calculatePrice } from "@/lib/pricing";
import { getDemandIndexFromHeatMap } from "@/lib/heatmap";
import { NextResponse } from "next/server";

// GET /api/pricing/recalculate
// Recalculates prices for all open slots in the next 24 hours.
// Also fires 1-hour appointment reminders (FR-24).
// Called by a cron job every 15 minutes (vercel.json).
export async function GET() {
  const now = new Date();
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // ── 1. Pricing engine — recalculate all open slots (FR-13) ──────────────
  const slots = await prisma.slot.findMany({
    where: {
      status: "available",
      start_time: { gt: now, lte: in24h },
    },
    include: { professional: true },
  });

  let updated = 0;
  let flashAlertsSent = 0;
  const errors: string[] = [];

  for (const slot of slots) {
    try {
      const oldPrice = slot.current_price;

      const result = calculatePrice({
        basePrice: slot.professional.base_price,
        startTime: slot.start_time,
        demandIndex: getDemandIndexFromHeatMap(
          slot.professional.heat_map,
          slot.start_time,
          slot.demand_index,
        ),
        dMax: slot.professional.d_max,
        dCancelActive: slot.d_cancel_active,
        dCancelExpiry: slot.d_cancel_expires_at ?? undefined,
      });

      await prisma.slot.update({
        where: { id: slot.id },
        data: { current_price: result.currentPrice },
      });

      updated++;

      // Detect first-time D_lead activation → send flash deal (FR-18)
      const justDropped =
        oldPrice !== null && result.currentPrice < oldPrice && result.dLead > 0;
      if (justDropped) {
        fetch(`${appUrl}/api/notifications/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "flash_deal", slotId: slot.id }),
        }).catch(console.error);
        flashAlertsSent++;
      }

      // Clean up expired D_cancel (if window has passed, reset it)
      if (
        slot.d_cancel_active &&
        slot.d_cancel_expires_at &&
        now > slot.d_cancel_expires_at
      ) {
        await prisma.slot.update({
          where: { id: slot.id },
          data: { d_cancel_active: false, d_cancel_expires_at: null },
        });
      }
    } catch (err: unknown) {
      const error = err as Error;
      // Don't let one bad slot crash the entire engine (NFR-08)
      errors.push(`Slot ${slot.id}: ${error.message}`);
    }
  }

  // ── 2. Reminder check — booked slots starting in 45–75 min (FR-24) ──────
  // Uses raw SQL because reminder_sent is a new column that requires a DB migration.
  // Run `npx prisma db push` once, then you can switch back to the typed Prisma query.
  const in45min = new Date(Date.now() + 45 * 60 * 1000);
  const in75min = new Date(Date.now() + 75 * 60 * 1000);

  type ReminderRow = { id: string; client_id: string };
  let bookedSlotsNeedingReminder: ReminderRow[] = [];

  try {
    bookedSlotsNeedingReminder = await prisma.$queryRaw<ReminderRow[]>`
      SELECT s.id, b.client_id
      FROM   slots s
      JOIN   bookings b ON b.slot_id = s.id AND b.status = 'confirmed'
      WHERE  s.status = 'booked'
        AND  (s.reminder_sent IS NULL OR s.reminder_sent = false)
        AND  s.start_time >= ${in45min}
        AND  s.start_time <= ${in75min}
      LIMIT  50
    `;
  } catch {
    // Column doesn't exist yet — migration hasn't run. Skip reminders silently.
    bookedSlotsNeedingReminder = [];
  }

  let remindersSent = 0;

  for (const row of bookedSlotsNeedingReminder) {
    try {
      fetch(`${appUrl}/api/notifications/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "reminder",
          slotId: row.id,
          clientId: row.client_id,
        }),
      }).catch(console.error);

      // Mark reminder_sent = true via raw SQL (same reason as above)
      await prisma.$executeRaw`
        UPDATE slots SET reminder_sent = true WHERE id = ${row.id}
      `;

      remindersSent++;
    } catch (err: unknown) {
      const error = err as Error;
      errors.push(`Reminder for slot ${row.id}: ${error.message}`);
    }
  }

  return NextResponse.json({
    updated,
    flashAlertsSent,
    remindersSent,
    errors,
    timestamp: now.toISOString(),
  });
}
