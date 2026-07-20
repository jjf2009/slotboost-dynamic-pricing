/**
 * College demo autopilot — fixed accounts, full professor story.
 * Prefer: npm run demo  (orchestrator, headed, production server)
 * Or:     npm run demo:e2e
 */
import { test, expect } from "@playwright/test";
import {
  DEMO,
  DEMO_PHONE,
  DEMO_SLOT_DEMAND_INDEX,
  DEMO_SLOT_HOURS_FROM_NOW,
  DEMO_STEPS,
} from "../demo/credentials";
import {
  formatLocalSlotDateTime,
  holdForQa,
  HOLD_MS,
  loginAs,
  narrate,
  pause,
  signOut,
  STEP_MS,
} from "../demo/login";
import type { Page } from "@playwright/test";

const requiresDb = !!process.env.DATABASE_URL;
const storyBudgetMs = 12 * 60_000; // story itself
const totalTimeoutMs = storyBudgetMs + HOLD_MS + 60_000;

async function openDemoProfessional(page: Page) {
  await expect(page.getByText(DEMO.pro.name).first()).toBeVisible({
    timeout: 15_000,
  });
  const card = page
    .locator("div")
    .filter({ hasText: DEMO.pro.name })
    .filter({
      has: page
        .getByRole("link", { name: /view slots/i })
        .or(page.getByRole("button", { name: /view slots/i })),
    })
    .first();
  const control = card
    .getByRole("link", { name: /view slots/i })
    .or(card.getByRole("button", { name: /view slots/i }))
    .first();
  await control.click();
  await page.waitForURL("**/client/professionals/**", { timeout: 30_000 });
}

test.describe.configure({ mode: "serial" });

test.describe("Demo autopilot — professor story", () => {
  test.skip(!requiresDb, "DATABASE_URL required for demo flow");
  test.setTimeout(totalTimeoutMs);

  test("full SlotBoost demo story", async ({ page }) => {
    let slotId = "";
    console.log(
      `\n⏱  Demo pace: ${STEP_MS}ms per pause · Q&A hold: ${Math.round(HOLD_MS / 60_000)} min\n`,
    );

    // ── 1. Professional login ────────────────────────────────────────────
    narrate(DEMO_STEPS[0]);
    await loginAs(page, DEMO.pro.email, "/professional/dashboard");
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
    await pause();

    // ── 2. Pricing settings ──────────────────────────────────────────────
    narrate(DEMO_STEPS[1]);
    await page.getByRole("button", { name: /settings/i }).click();
    await expect(page.getByText(/pricing settings/i)).toBeVisible();
    await page.locator("#basePrice").fill(String(DEMO.pro.basePrice));
    // Slider is hard to drive precisely; API set already seeded — still click Save
    await page.getByRole("button", { name: /save settings/i }).click();
    await pause();
    // Dialog may close on success
    await page.keyboard.press("Escape").catch(() => {});
    await pause(1000);

    // ── 3. Heat map ──────────────────────────────────────────────────────
    narrate(DEMO_STEPS[2]);
    await page.goto("/professional/heatmap");
    await expect(
      page.getByRole("heading", { name: /demand heat map/i }),
    ).toBeVisible({ timeout: 30_000 });
    await pause(2500);
    const saveHeat = page.getByRole("button", { name: /save heat map/i });
    if (await saveHeat.count()) {
      await saveHeat.click();
      await pause(1500);
    }

    // ── 4. Create slot (~3h, low demand) ─────────────────────────────────
    narrate(DEMO_STEPS[3]);
    const { date, time } = formatLocalSlotDateTime(DEMO_SLOT_HOURS_FROM_NOW);
    await page.goto("/professional/slots/new");
    await page.locator("#slot-date").fill(date);
    await page.locator("#slot-time").fill(time);
    await page.locator("#slot-duration").fill("60");
    const demandInput = page.locator("#demand-index");
    if (await demandInput.count()) {
      await demandInput.fill(String(DEMO_SLOT_DEMAND_INDEX));
    }
    await page.getByRole("button", { name: /create slot/i }).click();
    try {
      await page.waitForURL("**/professional/dashboard**", { timeout: 90_000 });
    } catch {
      // Server action may complete without client navigation under load
      await page.goto("/professional/dashboard");
    }
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible({
      timeout: 30_000,
    });
    await pause(2000);

    // Capture latest available slot id (requires professionalId)
    const meRes = await page.request.get("/api/auth/me");
    if (meRes.ok()) {
      const me = await meRes.json();
      const proId = me.professional?.id as string | undefined;
      if (proId) {
        const slotsRes = await page.request.get(
          `/api/slots?professionalId=${proId}`,
        );
        if (slotsRes.ok()) {
          const list = (await slotsRes.json()) as { id: string }[];
          if (Array.isArray(list) && list.length) {
            slotId = list[list.length - 1].id;
          }
        }
      }
    }

    await signOut(page);

    // ── 5. Client A: browse, subscribe, book ─────────────────────────────
    narrate(DEMO_STEPS[4]);
    await loginAs(page, DEMO.clientA.email, "/client/dashboard");
    await page.goto("/client/browse");
    await expect(
      page.getByRole("heading", { name: /browse professionals/i }),
    ).toBeVisible();
    await pause();

    // Open Demo Professional card → View Slots
    await expect(page.getByText(DEMO.pro.name).first()).toBeVisible({
      timeout: 15_000,
    });
    await openDemoProfessional(page);
    await pause();

    // Flash deal subscribe
    const flashBtn = page.getByRole("button", {
      name: /get flash deal alerts/i,
    });
    if (await flashBtn.count()) {
      await flashBtn.click();
      await page.locator("#phone").fill(DEMO_PHONE);
      await page.getByRole("button", { name: /subscribe now/i }).click();
      await pause(1500);
      await page.keyboard.press("Escape").catch(() => {});
    }
    await pause();

    // Book Now — first available
    const bookLink = page.locator('a[href^="/book/"]').first();
    await expect(bookLink).toBeVisible({ timeout: 20_000 });
    const href = await bookLink.getAttribute("href");
    if (href) {
      const m = href.match(/\/book\/([^/?#]+)/);
      if (m) slotId = m[1];
    }
    await bookLink.click();
    await page.waitForURL("**/book/**", { timeout: 30_000 });
    await pause();

    await page.locator("#booking-name").fill(DEMO.clientA.name);
    await page.locator("#booking-email").fill(DEMO.clientA.email);
    await page.locator("#booking-phone").fill(DEMO_PHONE);
    await page.getByRole("button", { name: /book for/i }).click();
    await expect(
      page.getByRole("heading", { name: /booking confirmed/i }),
    ).toBeVisible({ timeout: 20_000 });
    await pause(2500);

    await page.goto("/client/dashboard");
    await signOut(page);

    // ── 6. Client B joins waitlist ───────────────────────────────────────
    narrate(DEMO_STEPS[5]);
    await loginAs(page, DEMO.clientB.email, "/client/dashboard");
    await page.goto("/client/browse");
    await openDemoProfessional(page);
    await pause();

    const joinWaitlist = page
      .getByRole("button", { name: /join waitlist/i })
      .first();
    await expect(joinWaitlist).toBeVisible({ timeout: 20_000 });
    await joinWaitlist.click();
    await expect(
      page.getByRole("button", { name: /on waitlist/i }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await pause(2000);

    // Always refresh slotId from waitlists API after join
    const wl = await page.request.get("/api/client/waitlists");
    if (wl.ok()) {
      const data = await wl.json();
      const entries = Array.isArray(data) ? data : data.waitlists || [];
      if (entries[0]?.slotId) slotId = entries[0].slotId;
      else if (entries[0]?.slot?.id) slotId = entries[0].slot.id;
    }

    await signOut(page);

    // ── 7. Client A cancels ──────────────────────────────────────────────
    narrate(DEMO_STEPS[6]);
    await loginAs(page, DEMO.clientA.email, "/client/dashboard");
    await page.goto("/client/bookings");
    await expect(
      page.getByRole("heading", { name: /my bookings/i }),
    ).toBeVisible();
    await pause();

    await page.getByRole("button", { name: /^cancel$/i }).first().click();
    await expect(page.getByText(/cancel booking/i)).toBeVisible();
    await page.getByRole("button", { name: /yes, cancel/i }).click();
    await pause(2500);
    await signOut(page);

    // ── 8. Client B waitlist rebook ──────────────────────────────────────
    narrate(DEMO_STEPS[7]);
    expect(slotId, "slotId must be known for waitlist rebook").toBeTruthy();

    await page.goto(`/waitlist/${slotId}`);
    await expect(page.getByText(/flash cancellation deal/i)).toBeVisible({
      timeout: 20_000,
    });
    await pause();

    await page.locator("#wl-email").fill(DEMO.clientB.email);
    await page.locator("#wl-name").fill(DEMO.clientB.name);
    await page.locator("#wl-phone").fill(DEMO_PHONE);
    await page.getByRole("button", { name: /book this slot now/i }).click();
    await expect(page.getByRole("heading", { name: /you.?re booked/i })).toBeVisible({
      timeout: 20_000,
    });
    await pause(3000);

    // ── 9. Pro dashboard finale ──────────────────────────────────────────
    narrate(DEMO_STEPS[8]);
    await page.goto("/login");
    await loginAs(page, DEMO.pro.email, "/professional/dashboard");
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
    await pause(STEP_MS + 1500);

    // Keep Chromium open so you can demo live clicks / answer questions
    await holdForQa(page);
  });
});
