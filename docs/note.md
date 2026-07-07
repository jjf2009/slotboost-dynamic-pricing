Deployment-ready code changes are in place. Here's what landed and what you do next.
Code changes made
File	Change
package.json	Added "postinstall": "prisma generate" for Vercel builds
lib/db.ts	Set max: 1 on the pg Pool (serverless-friendly for Supabase)
app/api/pricing/recalculate/route.ts	Added runtime = "nodejs" and maxDuration = 10 (Hobby limit)
vercel.json	Cron changed to daily fallback 0 5 * (Hobby can't do every 15 min)
tsconfig.json	Excluded tests/ from production typecheck (fixes Vercel build)
npm run build and npm test both pass locally.

---
Your manual steps (Vercel + Supabase)
1. Supabase Postgres
Copy transaction pooler URL → DATABASE_URL (port 6543)
Copy direct URL → DIRECT_URL (port 5432)
Sync schema:

Copy code
  DIRECT_URL="your-direct-url" npx prisma db push
2. Generate secrets

Copy code
openssl rand -base64 32   # JWT_SECRET
openssl rand -base64 32   # CRON_SECRET
3. Vercel env vars (Production)
DATABASE_URL, DIRECT_URL, JWT_SECRET, CRON_SECRET
NEXT_PUBLIC_APP_URL = https://your-app.vercel.app
TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN (optional)
NODE_OPTIONS=--dns-result-order=ipv4first (if DB connection fails)
4. External cron (required on Hobby) — every 15 minutes:

Copy code
GET https://your-app.vercel.app/api/pricing/recalculate?secret=<CRON_SECRET>
Use cron-job.org or similar.

5. Deploy
Commit and push to GitHub → Vercel auto-deploys
6. Smoke test after deploy
Register at /register → should reach dashboard
curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/pricing/recalculate → 200
Want help setting up the external cron job or walking through the Vercel env var screen?