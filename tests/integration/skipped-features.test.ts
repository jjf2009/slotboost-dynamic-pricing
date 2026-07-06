import { describe, it } from "vitest";

/**
 * Features documented in SRS/README but not implemented in code.
 * Kept as explicit .skip() placeholders per TEST_PLAN.md §I.
 */

describe.skip("Flex Credits FR-31–33 (schema only)", () => {
  it("purchase subscription via Razorpay", () => {});
  it("enforce off-peak credit constraint", () => {});
  it("credit expiry notification", () => {});
});

describe.skip("PWA install / service worker (SRS §2.4)", () => {
  it("registers service worker", () => {});
  it("works offline", () => {});
});

describe.skip("Zustand authStore transitions", () => {
  it("store/authStore.ts is unused — no transitions to test", () => {});
});

describe.skip("Supabase Realtime live price sync", () => {
  it("hooks/use-live-slot.ts is dead code", () => {});
});