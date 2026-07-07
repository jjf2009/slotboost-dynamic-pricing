import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";

function makeRequest(url: string, headers?: Record<string, string>) {
  return new NextRequest(url, { headers });
}

describe("verifyCronSecret", () => {
  const original = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = "test-cron-secret";
  });

  afterEach(() => {
    process.env.CRON_SECRET = original;
  });

  it("returns false when CRON_SECRET is not configured", () => {
    delete process.env.CRON_SECRET;
    const req = makeRequest("http://localhost:3000/api/pricing/recalculate");
    expect(verifyCronSecret(req)).toBe(false);
  });

  it("accepts Authorization: Bearer header", () => {
    const req = makeRequest("http://localhost:3000/api/pricing/recalculate", {
      authorization: "Bearer test-cron-secret",
    });
    expect(verifyCronSecret(req)).toBe(true);
  });

  it("accepts ?secret= query param", () => {
    const req = makeRequest(
      "http://localhost:3000/api/pricing/recalculate?secret=test-cron-secret",
    );
    expect(verifyCronSecret(req)).toBe(true);
  });

  it("rejects missing or wrong secret", () => {
    const req = makeRequest("http://localhost:3000/api/pricing/recalculate");
    expect(verifyCronSecret(req)).toBe(false);

    const badHeader = makeRequest("http://localhost:3000/api/pricing/recalculate", {
      authorization: "Bearer wrong",
    });
    expect(verifyCronSecret(badHeader)).toBe(false);
  });
});