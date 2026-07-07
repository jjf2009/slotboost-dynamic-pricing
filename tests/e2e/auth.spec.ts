import { test, expect } from "@playwright/test";
import { e2eRequiresDb, testEmail } from "./helpers";

test.describe("Authentication flows", () => {
  test.skip(!e2eRequiresDb, "DATABASE_URL required for E2E");

  test("professional can register via UI", async ({ page }) => {
    const email = testEmail("pro-ui");
    await page.goto("/register");
    await page.getByRole("button", { name: "Professional" }).click();
    await page.locator("#reg-name").fill("UI Pro");
    await page.locator("#reg-email").fill(email);
    await page.locator("#reg-phone").fill("9876543210");
    await page.locator("#reg-service").fill("Tutor");
    await page.locator("#reg-password").fill("testpass123");
    await Promise.all([
      page.waitForURL("**/professional/dashboard**", { timeout: 60_000 }),
      page.getByRole("button", { name: /create account/i }).click(),
    ]);
    await expect(page.getByText(/dashboard/i).first()).toBeVisible();
  });

  test("client can register and reach dashboard", async ({ page }) => {
    const email = testEmail("client-ui");
    await page.goto("/register");
    await page.getByRole("button", { name: "Client" }).click();
    await page.locator("#reg-name").fill("UI Client");
    await page.locator("#reg-email").fill(email);
    await page.locator("#reg-phone").fill("9876543211");
    await page.locator("#reg-password").fill("testpass123");
    await Promise.all([
      page.waitForURL("**/client/dashboard**", { timeout: 60_000 }),
      page.getByRole("button", { name: /create account/i }).click(),
    ]);
  });
});