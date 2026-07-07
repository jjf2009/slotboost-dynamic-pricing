import { describe, it, expect, vi, beforeEach } from "vitest";
import { jsonRequest } from "../helpers/request";

const mockTransaction = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    slot: { findUnique: vi.fn() },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

vi.mock("@/lib/getUser", () => ({
  getUserFromRequest: vi.fn().mockResolvedValue(null),
}));

import { prisma } from "@/lib/db";
import { POST } from "@/app/api/slots/book/route";

describe("POST /api/slots/book", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.slot.findUnique).mockResolvedValue({
      id: "slot-b1",
      status: "available",
      start_time: new Date(Date.now() + 5 * 60 * 60 * 1000),
      demand_index: 0.5,
      d_cancel_active: false,
      d_cancel_expires_at: null,
      professional: { base_price: 1000, d_max: 0.4, heat_map: {}, is_mobile: false },
    } as never);
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  it("returns 400 when slotId or email missing", async () => {
    const res = await POST(jsonRequest("http://localhost/api/slots/book", "POST", { slotId: "x" }));
    expect(res.status).toBe(400);
  });

  it("returns 409 when slot is not available inside transaction", async () => {
    mockTransaction.mockImplementation(async () => {
      throw new Error("SLOT_NOT_AVAILABLE");
    });

    const res = await POST(
      jsonRequest("http://localhost/api/slots/book", "POST", {
        slotId: "slot-b1",
        email: "client@example.com",
        name: "Client",
      }),
    );
    expect(res.status).toBe(409);
  });

  it("returns 403 when geo blocks mobile professional", async () => {
    vi.mocked(prisma.slot.findUnique).mockResolvedValue({
      id: "slot-b1",
      status: "available",
      start_time: new Date(Date.now() + 5 * 60 * 60 * 1000),
      demand_index: 0.5,
      d_cancel_active: false,
      d_cancel_expires_at: null,
      professional: { base_price: 1000, d_max: 0.4, heat_map: {}, is_mobile: true },
    } as never);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ allowed: false, durationMinutes: 90 }),
    });

    const res = await POST(
      jsonRequest("http://localhost/api/slots/book", "POST", {
        slotId: "slot-b1",
        email: "client@example.com",
        clientLocation: "Mumbai",
      }),
    );
    expect(res.status).toBe(403);
  });
});