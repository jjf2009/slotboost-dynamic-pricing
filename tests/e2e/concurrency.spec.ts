import { test, expect } from "@playwright/test";
import {
  bookSlotViaApi,
  createSlotViaApi,
  e2eRequiresDb,
  registerViaApi,
  testEmail,
} from "./helpers";

test.describe("Cross-client concurrency", () => {
  test.skip(!e2eRequiresDb, "DATABASE_URL required for E2E");

  test("only one client succeeds when racing the same slot", async ({ playwright }) => {
    const proContext = await playwright.request.newContext();
    await registerViaApi(proContext, "professional", "race-pro");
    const slotId = await createSlotViaApi(proContext, 5);

    const clientA = await playwright.request.newContext();
    const clientB = await playwright.request.newContext();

    const emailA = testEmail("race-a");
    const emailB = testEmail("race-b");

    const [resA, resB] = await Promise.all([
      bookSlotViaApi(clientA, slotId, emailA, "Client A"),
      bookSlotViaApi(clientB, slotId, emailB, "Client B"),
    ]);

    const statuses = [resA.status(), resB.status()];
    const resolved = await Promise.all(statuses);
    expect(resolved.filter((s) => s === 201)).toHaveLength(1);
    expect(resolved.filter((s) => s === 409)).toHaveLength(1);

    await proContext.dispose();
    await clientA.dispose();
    await clientB.dispose();
  });
});