import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockFindMany = vi.fn();
const mockSlotUpdate = vi.fn();
const mockQueryRaw = vi.fn();
const mockExecuteRaw = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    slot: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      update: (...args: unknown[]) => mockSlotUpdate(...args),
    },
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
    $executeRaw: (...args: unknown[]) => mockExecuteRaw(...args),
  },
}));

import { GET } from "@/app/api/pricing/recalculate/route";

describe("GET /api/pricing/recalculate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
    mockFindMany.mockResolvedValue([]);
    mockQueryRaw.mockResolvedValue([]);
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  it("returns 401 without cron secret", async () => {
    const req = new NextRequest("http://localhost:3000/api/pricing/recalculate");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 200 with Bearer cron secret", async () => {
    const req = new NextRequest("http://localhost:3000/api/pricing/recalculate", {
      headers: { authorization: "Bearer test-cron-secret" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.updated).toBe(0);
  });

  it("recalculates slot price and may fire flash deal on threshold cross", async () => {
    const startTime = new Date(Date.now() + 23.8 * 60 * 60 * 1000);
    mockFindMany.mockResolvedValue([
      {
        id: "slot-cron-1",
        current_price: 1000,
        start_time: startTime,
        demand_index: 0.5,
        d_cancel_active: false,
        d_cancel_expires_at: null,
        professional: { base_price: 1000, d_max: 0.4, heat_map: {} },
      },
    ]);
    mockSlotUpdate.mockResolvedValue({});

    const req = new NextRequest(
      "http://localhost:3000/api/pricing/recalculate?secret=test-cron-secret",
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockSlotUpdate).toHaveBeenCalled();
    const body = await res.json();
    expect(body.updated).toBe(1);
  });
});