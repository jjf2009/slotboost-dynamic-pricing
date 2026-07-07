import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

process.env.JWT_SECRET ??= "test-jwt-secret-for-vitest";
process.env.CRON_SECRET ??= "test-cron-secret";