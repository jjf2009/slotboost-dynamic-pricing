import { describe, it, expect, vi, beforeEach } from "vitest";
import { jsonRequest } from "../helpers/request";

const mockSlotFindUnique = vi.fn();
const mockClientFindUnique = vi.fn();
const mockSubscriberFindMany = vi.fn();
const mockWaitlistFindMany = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    slot: { findUnique: (...args: unknown[]) => mockSlotFindUnique(...args) },
    client: { findUnique: (...args: unknown[]) => mockClientFindUnique(...args) },
    subscriber: { findMany: (...args: unknown[]) => mockSubscriberFindMany(...args) },
    waitlist: { findMany: (...args: unknown[]) => mockWaitlistFindMany(...args) },
  },
}));

vi.mock("twilio", () => ({
  default: vi.fn(() => ({
    messages: { create: vi.fn().mockResolvedValue({ sid: "SM_TEST123", status: "queued" }) },
  })),
}));

import { POST } from "@/app/api/notifications/send/route";

const baseSlot = {
  id: "slot-n1",
  start_time: new Date("2026-07-10T10:00:00Z"),
  current_price: 850,
  professional: { id: "pro-1", name: "Alex Pro", base_price: 1000, phone: "+919999999999" },
};

describe("POST /api/notifications/send", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TWILIO_ACCOUNT_SID = "ACtest";
    process.env.TWILIO_AUTH_TOKEN = "testtoken";
    mockSlotFindUnique.mockResolvedValue(baseSlot);
  });

  it("returns 400 when type or slotId missing", async () => {
    const res = await POST(jsonRequest("http://localhost/api/notifications/send", "POST", { type: "confirmation" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when slot not found", async () => {
    mockSlotFindUnique.mockResolvedValue(null);
    const res = await POST(
      jsonRequest("http://localhost/api/notifications/send", "POST", {
        type: "flash_deal",
        slotId: "missing",
      }),
    );
    expect(res.status).toBe(404);
  });

  it("sends confirmation type successfully", async () => {
    mockClientFindUnique.mockResolvedValue({ id: "c1", phone: process.env.TEST_PHONE_NUMBER || "+919876543210", name: "Client" });
    const res = await POST(
      jsonRequest("http://localhost/api/notifications/send", "POST", {
        type: "confirmation",
        slotId: "slot-n1",
        clientId: "c1",
        price: 850,
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.type).toBe("confirmation");
  });

  it("handles slot_filled type (FR-27)", async () => {
    mockClientFindUnique.mockResolvedValue({ id: "c2", phone: "+919876543211", name: "Waitlisted" });
    const res = await POST(
      jsonRequest("http://localhost/api/notifications/send", "POST", {
        type: "slot_filled",
        slotId: "slot-n1",
        clientId: "c2",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe("slot_filled");
  });
});