import { describe, it, expect } from "vitest";
import { shouldSendFlashDealAlert } from "@/lib/flash-deal-trigger";

describe("shouldSendFlashDealAlert (FR-18)", () => {
  it("fires when H crosses below 24 hours", () => {
    expect(shouldSendFlashDealAlert(23.9, 24.1)).toBe(true);
  });

  it("does not fire when already below 24 hours without crossing 2h", () => {
    expect(shouldSendFlashDealAlert(20, 20.25)).toBe(false);
    expect(shouldSendFlashDealAlert(12, 12.25)).toBe(false);
  });

  it("fires when H crosses below 2 hours", () => {
    expect(shouldSendFlashDealAlert(1.9, 2.1)).toBe(true);
  });

  it("does not fire when already below 2 hours", () => {
    expect(shouldSendFlashDealAlert(1.5, 1.75)).toBe(false);
  });

  it("does not fire when H remains at or above 24 hours", () => {
    expect(shouldSendFlashDealAlert(48, 48.25)).toBe(false);
  });

  it("does not fire on unrelated price drops (e.g. D_peak change only)", () => {
    // Same lead-time bucket — no threshold crossed
    expect(shouldSendFlashDealAlert(8, 8.25)).toBe(false);
  });

  it("uses cron interval default when previous hours omitted", () => {
    // 23.75h now implies ~24h at previous 15-min tick → crossed 24h
    expect(shouldSendFlashDealAlert(23.75)).toBe(true);
    // 1.75h now implies ~2h at previous tick → crossed 2h
    expect(shouldSendFlashDealAlert(1.75)).toBe(true);
    // 20h — no threshold crossed from +0.25h
    expect(shouldSendFlashDealAlert(20)).toBe(false);
  });
});