import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockTransaction = vi.fn();
const mockWaitlistFindMany = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => mockTransaction(...args),
    waitlist: {
      findMany: (...args: unknown[]) => mockWaitlistFindMany(...args),
    },
  },
}));

vi.mock("@/lib/getUser", () => ({
  getUserFromRequest: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/pricing", () => ({
  calculatePrice: vi.fn().mockReturnValue({ currentPrice: 850 }),
}));

vi.mock("@/lib/heatmap", () => ({
  getDemandIndexFromHeatMap: vi.fn().mockReturnValue(0.5),
}));

import { POST } from "@/app/api/waitlist/book/route";

const activeSlot = {
  id: "slot-1",
  status: "available",
  start_time: new Date(Date.now() + 2 * 60 * 60 * 1000),
  demand_index: 0.5,
  d_cancel_active: true,
  d_cancel_expires_at: new Date(Date.now() + 10 * 60 * 1000),
  professional: {
    base_price: 1000,
    d_max: 0.4,
    heat_map: {},
  },
};

function makePost(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/waitlist/book", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/waitlist/book", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWaitlistFindMany.mockResolvedValue([]);
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  it("returns 403 when client is not on the waitlist (test.md Module 11)", async () => {
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        slot: {
          findUnique: vi.fn().mockResolvedValue(activeSlot),
        },
        client: {
          findUnique: vi.fn().mockResolvedValue({
            id: "client-1",
            email: "stranger@example.com",
            name: "Stranger",
            phone: null,
            userId: null,
          }),
          create: vi.fn(),
          update: vi.fn(),
        },
        waitlist: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
        booking: { create: vi.fn() },
      };
      return fn(tx);
    });

    const res = await POST(
      makePost({
        slotId: "slot-1",
        email: "stranger@example.com",
        name: "Stranger",
      }),
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/waitlist/i);
  });

  it("returns 201 when client is on the waitlist", async () => {
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        slot: {
          findUnique: vi.fn().mockResolvedValue(activeSlot),
          update: vi.fn(),
        },
        client: {
          findUnique: vi.fn().mockResolvedValue({
            id: "client-2",
            email: "waitlisted@example.com",
            name: "Waitlisted",
            phone: "+919876543210",
            userId: null,
          }),
          create: vi.fn(),
          update: vi.fn(),
        },
        waitlist: {
          findUnique: vi.fn().mockResolvedValue({ id: "wl-1", slotId: "slot-1", clientId: "client-2" }),
          deleteMany: vi.fn(),
        },
        booking: {
          create: vi.fn().mockResolvedValue({
            id: "booking-1",
            slotId: "slot-1",
            clientId: "client-2",
            price_paid: 850,
            status: "confirmed",
          }),
        },
      };
      return fn(tx);
    });

    const res = await POST(
      makePost({
        slotId: "slot-1",
        email: "waitlisted@example.com",
        name: "Waitlisted",
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.price).toBe(850);
  });
});