import { describe, it, expect, vi, beforeEach } from "vitest";
import { jsonRequest } from "../helpers/request";
import { authCookieHeader } from "../helpers/auth";

vi.mock("@/lib/getUser", () => ({
  getUserFromRequest: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    professional: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { getUserFromRequest } from "@/lib/getUser";
import { PUT as profilePut } from "@/app/api/professional/profile/route";
import { PUT as heatmapPut } from "@/app/api/professional/heatmap/route";

describe("API Zod validation", () => {
  beforeEach(() => {
    vi.mocked(getUserFromRequest).mockResolvedValue({
      userId: "user-1",
      email: "pro@test.com",
      role: "professional",
    });
  });

  it("PUT /api/professional/profile rejects base_price below 100", async () => {
    const res = await profilePut(
      jsonRequest("http://localhost/api/professional/profile", "PUT", { base_price: 50 }),
    );
    expect(res.status).toBe(400);
  });

  it("PUT /api/professional/profile rejects d_max above 0.6", async () => {
    const res = await profilePut(
      jsonRequest("http://localhost/api/professional/profile", "PUT", { d_max: 0.9 }),
    );
    expect(res.status).toBe(400);
  });

  it("PUT /api/professional/heatmap rejects invalid key format", async () => {
    const res = await heatmapPut(
      jsonRequest(
        "http://localhost/api/professional/heatmap",
        "PUT",
        { invalid_key: 0.5 },
        { Cookie: authCookieHeader({ userId: "u1", email: "p@t.com", role: "professional" }) },
      ),
    );
    expect(res.status).toBe(400);
  });

  it("PUT /api/professional/heatmap rejects DI out of range", async () => {
    const res = await heatmapPut(
      jsonRequest("http://localhost/api/professional/heatmap", "PUT", { mon_09: 1.5 }),
    );
    expect(res.status).toBe(400);
  });
});