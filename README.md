# ⚡ SlotBoost: Dynamic Pricing for Service Professionals

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)

**SlotBoost** is an intelligent booking platform that transforms empty slots into revenue machines. Using time-sensitive, dynamic pricing, it helps service professionals fill last-minute appointments while offering clients exclusive deals.

---

## ✨ Features

### 🚀 Revenue Optimization
- **Lead-Time Discounts**: Automatically applies discounts (up to 25%) as slots approach their start time.
- **Peak/Off-Peak Heatmaps**: Configure a 7×24 demand index to adjust prices based on your busiest and slowest hours.
- **Smart D_max Cap**: Caps total discount percentage — SlotBoost never discounts beyond the professional's configured D_max.

### 🔄 Intelligent Automation
- **Cancellation Recovery**: Flash deal window (15% D_cancel, 10 minutes) to fill sudden openings.
- **Waitlist Autopilot**: Notifies waitlisted clients via WhatsApp when a slot reopens after cancellation.
- **Dynamic Pricing**: Prices are recalculated by a 15-minute cron job and computed server-side on each page load or booking action (no live push subscription).

### 🛠 Professional Tools
- **Slot Management**: Dashboard to add availability and set base prices.
- **Client Booking**: Mobile-first booking experience for clients.
- **Notifications**: WhatsApp alerts via Twilio sandbox templates for confirmations, flash deals, waitlist, and reminders.

---

## 🛠 Tech Stack

- **Frontend**: [Next.js 15](https://nextjs.org/) (App Router), [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/)
- **Auth**: JWT in httpOnly cookies (`jsonwebtoken` sign, `jose` verify) — see `lib/getUser.ts`, `lib/services/auth.service.ts`
- **Database**: [PostgreSQL](https://www.postgresql.org/) via [Prisma](https://www.prisma.io/) (`prisma/schema.prisma`)
- **Data Fetching**: [TanStack Query v5](https://tanstack.com/query/latest) (client components)
- **Geo routing**: [OSRM](https://router.project-osrm.org/) + [Nominatim](https://nominatim.openstreetmap.org/) (free, no Maps API key) — `app/api/geo/check/route.ts`
- **Notifications**: [Twilio](https://www.twilio.com/) WhatsApp sandbox — `app/api/notifications/send/route.ts`
- **Icons**: [Phosphor Icons](https://phosphoricons.com/)
- **Validation**: [Zod](https://zod.dev/) on selected API routes

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/jjf2009/SlotBoost.git
cd SlotBoost
```

### 2. Install dependencies
```bash
npm install
npx prisma generate
```

### 3. Set up Environment Variables
Create a `.env.local` file in the root directory (see `.env.example`):

```env
# Prisma / PostgreSQL
DATABASE_URL=your_postgres_connection_string
DIRECT_URL=your_postgres_direct_connection_string
JWT_SECRET=your_jwt_secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Cron — protects GET /api/pricing/recalculate
CRON_SECRET=your_generated_cron_secret

# Twilio WhatsApp Sandbox
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### 4. Sync database and run
```bash
npx prisma db push
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to see the app.

### 5. Trigger pricing cron locally
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/pricing/recalculate
# or: curl "http://localhost:3000/api/pricing/recalculate?secret=$CRON_SECRET"
```

---

## 📁 Project Structure

```text
├── app/                # Next.js App Router (Routes & Pages)
│   ├── (auth)/         # Login / register (JWT API)
│   ├── api/            # Backend API routes
│   ├── professional/   # Professional dashboard
│   ├── client/         # Client browse & bookings
│   ├── book/           # Public booking page
│   └── waitlist/       # 10-minute waitlist offer page
├── components/         # Reusable UI components
├── lib/                # pricing.ts, heatmap.ts, auth, Prisma client
├── prisma/             # schema.prisma
├── tests/              # Vitest unit & integration tests
└── types/              # Shared TypeScript types
```

---

## 🔐 Auth flow (as implemented)

1. `POST /api/register` or `POST /api/login` validates input (Zod), hashes passwords with bcrypt (12 rounds), and signs a JWT.
2. The token is stored in an httpOnly `token` cookie.
3. Protected routes read the cookie via `getUserFromRequest()` → `verifyToken()` in `lib/auth.ts`.
4. `POST /api/auth/logout` clears the cookie.

---

## 📋 Waitlist booking rules (as implemented)

- `POST /api/waitlist/book` is only for clients **already on the waitlist** for that slot during an active D_cancel window.
- Non-waitlisted clients receive **403**.
- After a successful waitlist booking, remaining waitlisted clients receive a `slot_filled` WhatsApp via `/api/notifications/send`.

---

## 🚢 Deployment

Deploy on [Vercel](https://vercel.com/new). Set all env vars from `.env.example`. The pricing cron is configured in `vercel.json` — append `?secret=<CRON_SECRET>` to the cron path or invoke with `Authorization: Bearer`.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ❤️ by the SlotBoost Team
</p>