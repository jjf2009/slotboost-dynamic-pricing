import { describe, it, expect } from "vitest";
import {
  getHeatMapKey,
  normalizeHeatMap,
  getDemandIndexFromHeatMap,
} from "@/lib/heatmap";

describe("heatmap utilities", () => {
  it("getHeatMapKey returns mon_09 for Monday 9am local time", () => {
    // 2026-07-06 is a Monday
    const monday9am = new Date(2026, 6, 6, 9, 0, 0);
    expect(getHeatMapKey(monday9am)).toBe("mon_09");
  });

  it("normalizeHeatMap converts legacy Mon-9 keys", () => {
    const normalized = normalizeHeatMap({ "Mon-9": 0.2, "fri_17": 0.9 });
    expect(normalized.mon_09).toBe(0.2);
    expect(normalized.fri_17).toBe(0.9);
  });

  it("getDemandIndexFromHeatMap reads configured cell", () => {
    const start = new Date(2026, 6, 6, 9, 0, 0);
    const di = getDemandIndexFromHeatMap({ mon_09: 0.2 }, start, 0.5);
    expect(di).toBe(0.2);
  });

  it("getDemandIndexFromHeatMap falls back when cell missing", () => {
    const start = new Date(2026, 6, 6, 9, 0, 0);
    expect(getDemandIndexFromHeatMap({}, start, 0.5)).toBe(0.5);
  });

  it("normalizeHeatMap ignores non-numeric values", () => {
    const normalized = normalizeHeatMap({ mon_09: "bad" as unknown as number });
    expect(normalized.mon_09).toBeUndefined();
  });
});