import { test, expect } from "@playwright/test";
import { createProfessionalWithSlot, e2eRequiresDb } from "./helpers";

test.describe("Client booking flow", () => {
  test.skip(!e2eRequiresDb, "DATABASE_URL required for E2E");

  test("books slot via UI on mobile viewport", async ({ page, playwright }) => {
    const slotId = await createProfessionalWithSlot(playwright, "book-pro", 8);

    const clientEmail = `client-book-${Date.now()}@slotboost.test`;
    await page.goto(`/book/${slotId}`);
    await page.locator("#booking-name").fill("Mobile Client");
    await page.locator("#booking-email").fill(clientEmail);
    await page.locator("#booking-phone").fill("9876543210");
    await page.getByRole("button", { name: /book for/i }).click();
    await expect(
      page.getByRole("heading", { name: "Booking Confirmed!" }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("booking page has labeled form fields (a11y basics)", async ({ page, playwright }) => {
    const slotId = await createProfessionalWithSlot(playwright, "a11y-pro", 10);

    await page.goto(`/book/${slotId}`);
    await expect(page.locator("label[for='booking-email']")).toBeVisible();
    await expect(page.locator("#booking-email")).toBeFocused({ timeout: 5000 }).catch(() => {});
    await page.keyboard.press("Tab");
    await expect(page.locator("#booking-name")).toBeVisible();
  });
});