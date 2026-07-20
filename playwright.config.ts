import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const baseURL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const isDemoAutopilot = process.env.DEMO_AUTOPILOT === "1";
const demoGpu = process.env.DEMO_GPU === "1";
const demoHeaded = process.env.DEMO_HEADED !== "0";
const stepMs = Number(process.env.DEMO_STEP_MS || "4500");
const holdMs = Number(process.env.DEMO_HOLD_MS || String(45 * 60 * 1000));

const gpuArgs = [
  "--enable-gpu",
  "--ignore-gpu-blocklist",
  "--enable-webgl",
  "--use-gl=angle",
];

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  // Demo: long story + Q&A hold; other e2e stay at 60s
  timeout: isDemoAutopilot ? 12 * 60_000 + holdMs : 60_000,
  use: {
    baseURL,
    trace: "on-first-retry",
    ...(isDemoAutopilot
      ? {
          headless: !demoHeaded,
          launchOptions: {
            // Visible typing/clicks — scale with DEMO_STEP_MS (min 500, max 1200)
            slowMo: demoHeaded
              ? Math.min(1200, Math.max(500, Math.floor(stepMs / 4)))
              : 0,
            args: demoGpu
              ? gpuArgs
              : ["--enable-gpu", "--ignore-gpu-blocklist"],
          },
          viewport: { width: 1280, height: 800 },
        }
      : {}),
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 5"] } },
  ],
  // Orchestrator already starts production server for npm run demo
  webServer: isDemoAutopilot
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
