import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/geo/check/route";
import { jsonRequest } from "../helpers/request";

describe("POST /api/geo/check", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("allows booking when origin or destination missing (fallback)", async () => {
    const res = await POST(jsonRequest("http://localhost/api/geo/check", "POST", {}));
    const body = await res.json();
    expect(body.allowed).toBe(true);
    expect(body.fallback).toBe(true);
  });

  it("blocks when travel exceeds 30 minutes", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        json: async () => [{ lat: "15.49", lon: "73.82" }],
      })
      .mockResolvedValueOnce({
        json: async () => [{ lat: "19.07", lon: "72.87" }],
      })
      .mockResolvedValueOnce({
        json: async () => ({
          code: "Ok",
          routes: [{ duration: 90 * 60, distance: 500000 }],
        }),
      });

    const res = await POST(
      jsonRequest("http://localhost/api/geo/check", "POST", {
        origin: "Panaji, Goa",
        destination: "Mumbai, India",
      }),
    );
    const body = await res.json();
    expect(body.allowed).toBe(false);
    expect(body.durationMinutes).toBeGreaterThan(30);
  });

  it("allows when geocoding fails (fallback FR-30)", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ json: async () => [] });

    const res = await POST(
      jsonRequest("http://localhost/api/geo/check", "POST", {
        origin: "invalid-place-xyz",
        destination: "also-invalid",
      }),
    );
    const body = await res.json();
    expect(body.allowed).toBe(true);
    expect(body.fallback).toBe(true);
  });
});