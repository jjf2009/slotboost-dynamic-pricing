import { NextRequest } from "next/server";

/**
 * Verifies cron invocations via Authorization: Bearer <CRON_SECRET>
 * or ?secret=<CRON_SECRET> query param (for Vercel cron GET requests).
 */
export function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  const querySecret = req.nextUrl.searchParams.get("secret");
  if (querySecret === secret) return true;

  return false;
}