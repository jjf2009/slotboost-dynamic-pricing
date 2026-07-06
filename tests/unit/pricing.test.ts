import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { calculatePrice } from "@/lib/pricing";

const BASE = 1000;
const D_MAX = 0.4;

function priceAtHoursFromNow(hours: number, overrides: Partial<Parameters<typeof calculatePrice>[0]> = {}) {
  const now = new Date("2026-07-06T12:00:00Z");
  vi.setSystemTime(now);
  const startTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
  return calculatePrice({
    basePrice: BASE,
    startTime,
    demandIndex: 0.5,
    dMax: D_MAX,
    dCancelActive: false,
    ...overrides,
  });
}

describe("calculatePrice", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("D_lead step function (FR-14)", () => {
    it("applies 0% when H >= 24", () => {
      expect(priceAtHoursFromNow(48).dLead).toBe(0);
      expect(priceAtHoursFromNow(24).dLead).toBe(0);
    });

    it("applies 10% when 12 <= H < 24", () => {
      expect(priceAtHoursFromNow(20).dLead).toBe(0.1);
      expect(priceAtHoursFromNow(12).dLead).toBe(0.1);
    });

    it("applies 15% when 6 <= H < 12", () => {
      expect(priceAtHoursFromNow(10).dLead).toBe(0.15);
    });

    it("applies 20% when 2 <= H < 6", () => {
      expect(priceAtHoursFromNow(4).dLead).toBe(0.2);
    });

    it("applies 25% when H < 2", () => {
      expect(priceAtHoursFromNow(1).dLead).toBe(0.25);
      expect(priceAtHoursFromNow(0.5).dLead).toBe(0.25);
    });
  });

  describe("D_peak (FR-15)", () => {
    it("applies max 15% off-peak discount when DI = 0", () => {
      const r = priceAtHoursFromNow(48, { demandIndex: 0 });
      expect(r.dPeak).toBe(0.15);
      expect(r.currentPrice).toBe(850);
    });

    it("applies 0% peak discount when DI = 1", () => {
      const r = priceAtHoursFromNow(48, { demandIndex: 1 });
      expect(r.dPeak).toBe(0);
      expect(r.currentPrice).toBe(1000);
    });
  });

  describe("D_cancel (FR-16)", () => {
    it("adds 15% when active and before expiry", () => {
      const now = new Date("2026-07-06T12:00:00Z");
      vi.setSystemTime(now);
      const r = calculatePrice({
        basePrice: BASE,
        startTime: new Date(now.getTime() + 48 * 60 * 60 * 1000),
        demandIndex: 1,
        dMax: 0.6,
        dCancelActive: true,
        dCancelExpiry: new Date(now.getTime() + 10 * 60 * 1000),
      });
      expect(r.dCancel).toBe(0.15);
      expect(r.currentPrice).toBe(850);
    });

    it("ignores D_cancel after expiry", () => {
      const now = new Date("2026-07-06T12:00:00Z");
      vi.setSystemTime(now);
      const r = calculatePrice({
        basePrice: BASE,
        startTime: new Date(now.getTime() + 48 * 60 * 60 * 1000),
        demandIndex: 1,
        dMax: 0.6,
        dCancelActive: true,
        dCancelExpiry: new Date(now.getTime() - 1000),
      });
      expect(r.dCancel).toBe(0);
    });
  });

  describe("D_max cap (FR-17)", () => {
    it("caps total discount at d_max", () => {
      const r = priceAtHoursFromNow(1, { demandIndex: 0, dMax: 0.2, dCancelActive: true, dCancelExpiry: new Date("2026-07-06T13:00:00Z") });
      expect(r.dTotal).toBe(0.2);
      expect(r.currentPrice).toBe(800);
    });

    it("allows zero discount room when d_max = 0", () => {
      const r = priceAtHoursFromNow(1, { demandIndex: 0, dMax: 0 });
      expect(r.dTotal).toBe(0);
      expect(r.currentPrice).toBe(1000);
    });
  });

  describe("monotonic discount as start time approaches", () => {
    it("dTotal never decreases as H shrinks across buckets", () => {
      const hours = [48, 20, 10, 4, 1];
      let prev = -1;
      for (const h of hours) {
        const d = priceAtHoursFromNow(h, { demandIndex: 0 }).dTotal;
        expect(d).toBeGreaterThanOrEqual(prev);
        prev = d;
      }
    });
  });

  describe("edge cases", () => {
    it("handles slot in the past (negative H still uses <2 bucket)", () => {
      const r = priceAtHoursFromNow(-1);
      expect(r.hoursRemaining).toBeLessThan(0);
      expect(r.dLead).toBe(0.25);
    });

    it("rounds current price to integer", () => {
      const r = priceAtHoursFromNow(20, { basePrice: 777, demandIndex: 0.33, dMax: 0.5 });
      expect(Number.isInteger(r.currentPrice)).toBe(true);
    });
  });
});