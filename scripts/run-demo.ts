/**
 * One-command college demo orchestrator:
 *   seed → (optional) production build → start server → headed Playwright story
 *
 * Usage:
 *   npm run demo
 *   npm run demo:fast   # skip rebuild when .next exists
 */
import { config } from "dotenv";
import { resolve } from "path";
import { spawn, execSync, type ChildProcess } from "child_process";
import { existsSync } from "fs";
import http from "http";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const ROOT = process.cwd();
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SKIP_BUILD =
  process.env.DEMO_SKIP_BUILD === "1" || process.argv.includes("--fast");
const HEADED = process.env.DEMO_HEADED !== "0";

function log(msg: string) {
  console.log(msg);
}

function fail(msg: string): never {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

function detectNvidia(): boolean {
  try {
    execSync("nvidia-smi -L", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function run(cmd: string, args: string[], env: NodeJS.ProcessEnv = process.env) {
  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn(cmd, args, {
      cwd: ROOT,
      env,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`));
    });
  });
}

function waitForServer(url: string, timeoutMs = 180_000): Promise<void> {
  const start = Date.now();
  return new Promise((resolvePromise, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolvePromise();
          return;
        }
        retry();
      });
      req.on("error", retry);
      req.setTimeout(3000, () => {
        req.destroy();
        retry();
      });
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Server not ready at ${url} within ${timeoutMs}ms`));
        return;
      }
      setTimeout(tick, 1500);
    };
    tick();
  });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    fail("DATABASE_URL is required in .env or .env.local");
  }
  if (!process.env.JWT_SECRET) {
    log("⚠️  JWT_SECRET not set — falling back to dev secret (ok for local demo).");
  }

  const hasGpu = detectNvidia();
  log("");
  log("╔══════════════════════════════════════════════════╗");
  log("║     SlotBoost — College Demo Autopilot           ║");
  log("╚══════════════════════════════════════════════════╝");
  log(`  Target:  ${BASE_URL}`);
  log(`  GPU:     ${hasGpu ? "NVIDIA detected" : "not found (CPU browser OK)"}`);
  log(`  Build:   ${SKIP_BUILD ? "skip (DEMO_SKIP_BUILD / --fast)" : "full production build"}`);
  log("");

  // Base env for seed / GPU browser. Do NOT force NODE_ENV here — seed is fine
  // under development. Build/start must force production (see below).
  const demoEnv: NodeJS.ProcessEnv = {
    ...process.env,
    NEXT_PUBLIC_APP_URL: BASE_URL,
    // Slow enough to narrate; override with DEMO_STEP_MS=6000 if you talk slowly
    DEMO_STEP_MS: process.env.DEMO_STEP_MS || "4500",
    // Keep headed browser open after story (ms). Default 45 minutes.
    DEMO_HOLD_MS: process.env.DEMO_HOLD_MS || String(45 * 60 * 1000),
  };
  if (hasGpu) {
    demoEnv.__NV_PRIME_RENDER_OFFLOAD = "1";
    demoEnv.__GLX_VENDOR_LIBRARY_NAME = "nvidia";
    demoEnv.VDPAU_DRIVER = "nvidia";
  }

  // .env often sets NODE_ENV=development — that breaks `next build` (useContext prerender errors)
  const productionEnv: NodeJS.ProcessEnv = {
    ...demoEnv,
    NODE_ENV: "production",
  };

  // 1) Seed
  log("[1/4] Seeding demo accounts (pro + client A/B, phone 8421012788)...");
  await run("npx", ["tsx", "scripts/demo-seed.ts"], demoEnv);

  // 2) Build (production = fast page loads; Next does not run on GPU)
  const hasNext = existsSync(resolve(ROOT, ".next"));
  if (!SKIP_BUILD || !hasNext) {
    log("[2/4] Building production app (fast loads vs next dev)...");
    if (process.env.NODE_ENV && process.env.NODE_ENV !== "production") {
      log(`     (overriding NODE_ENV=${process.env.NODE_ENV} → production for build)`);
    }
    await run("npm", ["run", "build"], productionEnv);
  } else {
    log("[2/4] Skipping build — using existing .next");
  }

  // 3) Start production server
  log(`[3/4] Starting production server on ${BASE_URL}...`);
  try {
    const port = new URL(BASE_URL).port || "3000";
    execSync(`fuser -k ${port}/tcp 2>/dev/null || true`, { stdio: "ignore" });
    // brief pause so the port is free
    await new Promise((r) => setTimeout(r, 800));
  } catch {
    /* ignore */
  }

  let server: ChildProcess | null = spawn("npm", ["run", "start"], {
    cwd: ROOT,
    env: productionEnv,
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });

  server.stdout?.on("data", (d) => process.stdout.write(d));
  server.stderr?.on("data", (d) => process.stderr.write(d));

  const shutdown = () => {
    if (server && !server.killed) {
      server.kill("SIGTERM");
      server = null;
    }
  };
  process.on("SIGINT", () => {
    log("\nStopping demo server...");
    shutdown();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    shutdown();
    process.exit(0);
  });

  try {
    await waitForServer(BASE_URL);
  } catch (err) {
    shutdown();
    fail(String(err));
  }
  log("     Demo server ready.");

  // 4) Headed Playwright autopilot (slow + hold browser open for Q&A)
  log("[4/4] Opening demo autopilot browser...");
  log(`     Pace: ${demoEnv.DEMO_STEP_MS}ms pauses · narrate the SAY lines`);
  log("     After the story, Chromium STAYS OPEN for Q&A (default 45 min).\n");

  const pwArgs = [
    "playwright",
    "test",
    "tests/e2e/demo-flow.spec.ts",
    "--project=chromium",
    "--workers=1",
    "--timeout=0", // allow long Q&A hold (test also sets its own timeout)
  ];
  if (HEADED) {
    pwArgs.push("--headed");
  }

  // Chromium GPU-friendly launch via env consumed in playwright config when DEMO_GPU=1
  const autopilotEnv: NodeJS.ProcessEnv = {
    ...demoEnv,
    DEMO_GPU: hasGpu ? "1" : "0",
    DEMO_AUTOPILOT: "1",
    DEMO_HEADED: HEADED ? "1" : "0",
  };

  try {
    await run("npx", pwArgs, autopilotEnv);
  } catch {
    log("\n⚠️  Autopilot finished with errors — check the browser / logs above.");
    log("   Server is still running for manual recovery.\n");
  }

  log("");
  log("✅ Demo story finished — server still running for Q&A.");
  log(`   Local:    ${BASE_URL}/login`);
  log("   Pro:      demo.pro@slotboost.test / DemoPass123");
  log("   Client A: demo.client.a@slotboost.test / DemoPass123");
  log("   Client B: demo.client.b@slotboost.test / DemoPass123");
  log("");
  log("   Tip: For deployed site Q&A, open the Vercel URL in Firefox/Chrome");
  log("   with the same logins (seed production DB once if accounts missing).");
  log("   Press Ctrl+C to stop the local server.");
  log("");

  // Keep process alive until Ctrl+C
  await new Promise(() => {});
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
