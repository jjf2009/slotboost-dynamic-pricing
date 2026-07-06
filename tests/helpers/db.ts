import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

let client: PrismaClient | null = null;
let pool: Pool | null = null;

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getTestPrisma(): PrismaClient | null {
  if (!hasDatabase()) return null;
  if (!client) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    client = new PrismaClient({ adapter });
  }
  return client;
}

/** IDs created during DB-backed tests — deleted in teardown (FK order). */
export const testTracker = {
  bookingIds: [] as string[],
  slotIds: [] as string[],
  waitlistIds: [] as string[],
  subscriberIds: [] as string[],
  clientIds: [] as string[],
  professionalIds: [] as string[],
  userIds: [] as string[],
};

export async function cleanupTrackedRecords(): Promise<void> {
  const prisma = getTestPrisma();
  if (!prisma) return;

  try {
    if (testTracker.bookingIds.length) {
      await prisma.booking.deleteMany({ where: { id: { in: testTracker.bookingIds } } });
    }
    if (testTracker.waitlistIds.length) {
      await prisma.waitlist.deleteMany({ where: { id: { in: testTracker.waitlistIds } } });
    }
    if (testTracker.subscriberIds.length) {
      await prisma.subscriber.deleteMany({ where: { id: { in: testTracker.subscriberIds } } });
    }
    if (testTracker.slotIds.length) {
      await prisma.booking.deleteMany({ where: { slotId: { in: testTracker.slotIds } } });
      await prisma.waitlist.deleteMany({ where: { slotId: { in: testTracker.slotIds } } });
      await prisma.slot.deleteMany({ where: { id: { in: testTracker.slotIds } } });
    }
    if (testTracker.clientIds.length) {
      await prisma.client.deleteMany({ where: { id: { in: testTracker.clientIds } } });
    }
    if (testTracker.professionalIds.length) {
      await prisma.professional.deleteMany({ where: { id: { in: testTracker.professionalIds } } });
    }
    if (testTracker.userIds.length) {
      await prisma.professional.deleteMany({ where: { userId: { in: testTracker.userIds } } });
      await prisma.client.deleteMany({ where: { userId: { in: testTracker.userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: testTracker.userIds } } });
    }
  } catch (err) {
    console.warn("[test cleanup] partial failure:", err);
  }

  testTracker.bookingIds = [];
  testTracker.slotIds = [];
  testTracker.waitlistIds = [];
  testTracker.subscriberIds = [];
  testTracker.clientIds = [];
  testTracker.professionalIds = [];
  testTracker.userIds = [];
}

export async function disconnectTestPrisma(): Promise<void> {
  if (client) {
    await client.$disconnect();
    client = null;
  }
  if (pool) {
    await pool.end();
    pool = null;
  }
}