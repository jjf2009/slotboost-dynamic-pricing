import type { Page } from "@playwright/test";
import { DEMO_PASSWORD, DEMO_STEPS, type DemoStep } from "./credentials";

/** Default ~4.5s between beats so you can talk without rushing. */
export const STEP_MS = Number(process.env.DEMO_STEP_MS || "4500");

/** How long to keep the browser open after the story (Q&A). Default 45 minutes. */
export const HOLD_MS = Number(
  process.env.DEMO_HOLD_MS || String(45 * 60 * 1000),
);

export async function pause(ms = STEP_MS) {
  await new Promise((r) => setTimeout(r, ms));
}

/** Hold the headed browser open so professors can keep looking / you can click around. */
export async function holdForQa(page: import("@playwright/test").Page) {
  const mins = Math.round(HOLD_MS / 60_000);
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  const loginUrl = `${base}/login`;

  console.log("");
  console.log("✅ Story complete — browser stays open for Q&A.");
  console.log(`   Holding ~${mins} minute(s). Click around freely.`);
  console.log("   Or stop the demo with Ctrl+C in the terminal.");
  console.log("");
  console.log("   Quick logins:");
  console.log("   Pro:      demo.pro@slotboost.test / DemoPass123");
  console.log("   Client A: demo.client.a@slotboost.test / DemoPass123");
  console.log("   Client B: demo.client.b@slotboost.test / DemoPass123");
  console.log(`   Login URL: ${loginUrl}`);
  console.log("");

  // Extra Firefox / Chrome windows for multi-role Q&A (does not close Chromium)
  openSystemBrowsers(loginUrl);

  // Keep page responsive; tick so Playwright does not think the test is stuck
  const end = Date.now() + HOLD_MS;
  while (Date.now() < end) {
    const slice = Math.min(15_000, end - Date.now());
    if (slice <= 0) break;
    await new Promise((r) => setTimeout(r, slice));
    try {
      await page.title();
    } catch {
      break; // user closed the window
    }
  }
}

function openSystemBrowsers(loginUrl: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { spawn, execSync } = require("child_process") as typeof import("child_process");
  const bins = [
    "firefox",
    "google-chrome",
    "google-chrome-stable",
    "chromium-browser",
    "chromium",
  ];
  for (const bin of bins) {
    try {
      execSync(`command -v ${bin}`, { stdio: "ignore" });
      spawn(bin, [loginUrl], { detached: true, stdio: "ignore" }).unref();
      console.log(`   Opened ${bin} for Q&A → ${loginUrl}`);
    } catch {
      /* not installed */
    }
  }
}

export function narrate(step: DemoStep | number) {
  const s =
    typeof step === "number"
      ? DEMO_STEPS.find((d) => d.id === step)
      : step;
  if (!s) return;
  console.log("");
  console.log(`▶ STEP ${s.id} — ${s.title}`);
  console.log(`   SAY: "${s.say}"`);
  console.log("");
}

export async function loginAs(
  page: Page,
  email: string,
  expectedPath: "/professional/dashboard" | "/client/dashboard",
) {
  await page.goto("/login");
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(DEMO_PASSWORD);
  await Promise.all([
    page.waitForURL(`**${expectedPath}**`, { timeout: 60_000 }),
    page.getByRole("button", { name: /sign in/i }).click(),
  ]);
  await pause();
}

export async function signOut(page: Page) {
  // Layout uses a form button "Sign Out"
  const btn = page.getByRole("button", { name: /sign out/i });
  if (await btn.count()) {
    await Promise.all([
      page.waitForURL("**/login**", { timeout: 30_000 }),
      btn.click(),
    ]);
  } else {
    // Fallback: clear cookie via API
    await page.request.post("/api/auth/logout");
    await page.goto("/login");
  }
  await pause(800);
}

export function formatLocalSlotDateTime(hoursFromNow: number) {
  // Round to next 5 minutes so HTML time inputs accept clean values
  const start = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  start.setSeconds(0, 0);
  start.setMinutes(Math.ceil(start.getMinutes() / 5) * 5);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    time: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
  };
}
