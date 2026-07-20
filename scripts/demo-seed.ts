/**
 * Idempotent demo seed: 1 professional + 2 clients, fixed password/phone,
 * wipe only demo-owned operational data, optional clean slate for autopilot.
 *
 * Usage: npx tsx scripts/demo-seed.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  DEMO,
  DEMO_PASSWORD,
  DEMO_PHONE,
  printDemoCredentials,
} from "../tests/demo/credentials";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL is required. Set it in .env or .env.local");
    process.exit(1);
  }

  const pool = new Pool({ connectionString, max: 2 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  try {
    // ── Professional user + profile ──────────────────────────────────────
    const proUser = await upsertUser({
      prisma,
      email: DEMO.pro.email,
      name: DEMO.pro.name,
      role: "professional",
      passwordHash,
    });

    let professional = await prisma.professional.findUnique({
      where: { userId: proUser.id },
    });

    if (!professional) {
      professional = await prisma.professional.create({
        data: {
          userId: proUser.id,
          name: DEMO.pro.name,
          email: DEMO.pro.email,
          phone: DEMO_PHONE,
          service_type: DEMO.pro.serviceType,
          base_price: DEMO.pro.basePrice,
          d_max: DEMO.pro.dMax,
          heat_map: defaultHeatMap(),
        },
      });
    } else {
      professional = await prisma.professional.update({
        where: { id: professional.id },
        data: {
          name: DEMO.pro.name,
          email: DEMO.pro.email,
          phone: DEMO_PHONE,
          service_type: DEMO.pro.serviceType,
          base_price: DEMO.pro.basePrice,
          d_max: DEMO.pro.dMax,
          heat_map: professional.heat_map ?? defaultHeatMap(),
        },
      });
    }

    // ── Client A / B ─────────────────────────────────────────────────────
    for (const c of [DEMO.clientA, DEMO.clientB]) {
      const user = await upsertUser({
        prisma,
        email: c.email,
        name: c.name,
        role: "client",
        passwordHash,
      });

      const existing = await prisma.client.findFirst({
        where: { OR: [{ userId: user.id }, { email: c.email }] },
      });

      if (!existing) {
        await prisma.client.create({
          data: {
            userId: user.id,
            name: c.name,
            email: c.email,
            phone: DEMO_PHONE,
          },
        });
      } else {
        await prisma.client.update({
          where: { id: existing.id },
          data: {
            userId: user.id,
            name: c.name,
            email: c.email,
            phone: DEMO_PHONE,
          },
        });
      }
    }

    // ── Clean demo operational data only ─────────────────────────────────
    const demoClientEmails = [DEMO.clientA.email, DEMO.clientB.email];
    const demoClients = await prisma.client.findMany({
      where: { email: { in: demoClientEmails } },
      select: { id: true },
    });
    const demoClientIds = demoClients.map((c) => c.id);

    const proSlots = await prisma.slot.findMany({
      where: { professionalId: professional.id },
      select: { id: true },
    });
    const slotIds = proSlots.map((s) => s.id);

    if (slotIds.length) {
      await prisma.booking.deleteMany({ where: { slotId: { in: slotIds } } });
      await prisma.waitlist.deleteMany({ where: { slotId: { in: slotIds } } });
      await prisma.slot.deleteMany({ where: { id: { in: slotIds } } });
    }

    if (demoClientIds.length) {
      await prisma.booking.deleteMany({ where: { clientId: { in: demoClientIds } } });
      await prisma.waitlist.deleteMany({ where: { clientId: { in: demoClientIds } } });
      await prisma.subscriber.deleteMany({
        where: {
          OR: [
            { clientId: { in: demoClientIds } },
            { professionalId: professional.id },
          ],
        },
      });
    } else {
      await prisma.subscriber.deleteMany({
        where: { professionalId: professional.id },
      });
    }

    printDemoCredentials({ professionalId: professional.id });
    console.log("Clean slate: demo slots/bookings/waitlists cleared.");
    console.log("Run: npm run demo   (or npm run demo:fast after first build)");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function upsertUser(opts: {
  prisma: PrismaClient;
  email: string;
  name: string;
  role: "professional" | "client";
  passwordHash: string;
}) {
  const { prisma, email, name, role, passwordHash } = opts;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: { name, role, password_hash: passwordHash },
    });
  }
  return prisma.user.create({
    data: { name, email, role, password_hash: passwordHash },
  });
}

/** Simple low-demand heatmap so discounts are easy to show. */
function defaultHeatMap(): Record<string, number> {
  const map: Record<string, number> = {};
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  for (const day of days) {
    for (let h = 0; h < 24; h++) {
      const key = `${day}_${String(h).padStart(2, "0")}`;
      // Off-peak evenings / mid-day softer demand
      map[key] = h >= 18 || h < 9 ? 0.25 : 0.55;
    }
  }
  return map;
}

main().catch((err) => {
  console.error("Demo seed failed:", err);
  process.exit(1);
});
