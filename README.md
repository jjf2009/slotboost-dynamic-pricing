# ⚡ SlotBoost — Dynamic Pricing Platform for Service Professionals

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)

> **Stop losing money to empty appointment slots.** SlotBoost uses intelligent, time-sensitive dynamic pricing to fill last-minute bookings — so service professionals earn more, and clients get exclusive deals.

---

## 🧠 What is SlotBoost?

**SlotBoost** is a full-stack SaaS web application that acts as an **AI-powered revenue optimizer** for service professionals — salons, barbershops, yoga studios, fitness coaches, physiotherapists, tutors, and consultants.

Instead of watching appointment slots go unfilled and revenue disappear, SlotBoost automatically applies **multi-layer dynamic discounts** as slots approach their start time. Clients receive **WhatsApp flash deal alerts**, and a **waitlist autopilot** fills cancellations within minutes.

This project is the implementation of the **Smart Pricing Engine for Micro-businesses (SPEM)** — an academic and practical study in dynamic pricing algorithms applied to the service industry.

---

## ✨ Core Features

### 📉 Multi-Layer Dynamic Pricing Engine

| Discount Layer | Mechanism | Cap |
|---|---|---|
| **Lead-Time Discount** | Increases as appointment approaches | Up to 25% |
| **Peak/Off-Peak Heatmap** | 7×24 demand index configured per professional | Configurable |
| **Cancellation Flash Deal** | Triggers instantly on cancellation | 15% for 10 min |
| **D_max Cap** | Hard ceiling on combined discounts | Set by professional |

### 🤖 Intelligent Automation
- **15-minute pricing cron**: Prices recalculated server-side every 15 minutes
- **Cancellation recovery**: Flash deal window activates automatically with WhatsApp blast
- **Waitlist autopilot**: Queued clients get WhatsApp alerts when slots reopen after cancellation

### 📱 Professional Dashboard
- Add availability and set base prices
- Configure a 7×24 demand heatmap (peak vs. off-peak hours)
- Set D_max discount floor to protect minimum acceptable revenue
- View booking history and revenue analytics

### 👤 Client Booking Flow
- Mobile-first browse & book experience
- See real-time discounted prices
- Join waitlist for full slots
- Receive WhatsApp confirmations and flash deal alerts

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 (App Router), React 19 |
| **Styling** | Tailwind CSS 4, Shadcn UI |
| **Auth** | JWT in httpOnly cookies (`jsonwebtoken` + `jose`) |
| **Database** | PostgreSQL via Prisma ORM |
| **Client State** | TanStack Query v5 |
| **Geo Routing** | OSRM + Nominatim (no Maps API key needed) |
| **Notifications** | Twilio WhatsApp Sandbox |
| **Icons** | Phosphor Icons |
| **Validation** | Zod |
| **Testing** | Vitest (unit + integration), Playwright (E2E) |
| **Deployment** | Vercel |

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/jjf2009/slotboost-dynamic-pricing.git
cd slotboost-dynamic-pricing
```

### 2. Install dependencies
```bash
npm install
npx prisma generate
```

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```env
# Database
DATABASE_URL=your_postgres_connection_string
DIRECT_URL=your_postgres_direct_connection_string

# Auth
JWT_SECRET=your_jwt_secret_min_32_chars

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Cron job protection
CRON_SECRET=your_generated_cron_secret

# Twilio WhatsApp Sandbox
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### 4. Sync database and start dev server
```bash
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### 5. Trigger pricing recalculation locally
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/pricing/recalculate
```

---

## 📁 Project Structure

```text
slotboost-dynamic-pricing/
├── app/
│   ├── (auth)/             # Login & register pages (JWT API)
│   ├── api/
│   │   ├── pricing/        # Recalculate endpoint (cron-triggered)
│   │   ├── notifications/  # Twilio WhatsApp send
│   │   ├── geo/            # OSRM + Nominatim proximity check
│   │   └── waitlist/       # Waitlist book & notify
│   ├── professional/       # Professional dashboard (slot mgmt, heatmap)
│   ├── client/             # Client browse & booking experience
│   ├── book/               # Public booking page
│   ├── waitlist/           # 10-minute waitlist flash deal page
│   ├── layout.tsx          # Root layout (SEO metadata + JSON-LD)
│   ├── page.tsx            # Landing page
│   ├── robots.ts           # SEO robots rules + AI crawler access
│   └── sitemap.ts          # Dynamic XML sitemap
├── components/             # Reusable UI components (Shadcn-based)
├── lib/
│   ├── pricing.ts          # Core dynamic pricing algorithm
│   ├── heatmap.ts          # 7×24 demand index calculator
│   ├── auth.ts             # JWT sign & verify
│   └── prisma.ts           # Prisma client singleton
├── prisma/
│   └── schema.prisma       # Database schema
├── public/
│   └── llms.txt            # GEO: AI engine product description
├── docs/                   # SRS, design doc, test plan, deployment guide
├── tests/                  # Vitest unit & integration tests
└── types/                  # Shared TypeScript interfaces
```

---

## 🔐 Auth Flow

1. `POST /api/register` or `POST /api/login` — validates via Zod, hashes passwords with bcrypt (12 rounds), signs JWT
2. Token stored in an httpOnly `token` cookie (XSS-safe)
3. Protected routes call `getUserFromRequest()` → `verifyToken()` in `lib/auth.ts`
4. `POST /api/auth/logout` — clears the cookie

---

## 📋 Waitlist Booking Rules

- `POST /api/waitlist/book` is **only for clients already on the waitlist** for that slot during an active `D_cancel` window
- Non-waitlisted clients receive **403 Forbidden**
- After a successful waitlist booking, remaining waitlisted clients receive a `slot_filled` WhatsApp via `/api/notifications/send`

---

## 🧪 Running Tests

```bash
# Unit + integration tests
npm test

# Specific suites
npm run test:unit
npm run test:integration

# E2E (Playwright)
npm run test:e2e

# Coverage report
npm run test:coverage
```

---

## 🚢 Deployment

Deploy on [Vercel](https://vercel.com/new):

1. Import the `slotboost-dynamic-pricing` repository
2. Set all environment variables from `.env.example`
3. The pricing cron is configured in `vercel.json` — append `?secret=<CRON_SECRET>` to the cron path

---

## 🔍 SEO & GEO Optimization

SlotBoost is optimized for both traditional search engines and AI engine citation (Generative Engine Optimization):

- **Full Next.js Metadata API** — Open Graph, Twitter Cards, canonical URLs
- **Schema.org JSON-LD** — `WebSite`, `SoftwareApplication`, and `FAQPage` schemas
- **Dynamic `sitemap.xml`** — all public routes with priority and changefreq
- **`robots.ts`** — explicitly allows GPTBot, ClaudeBot, PerplexityBot, and Google-Extended
- **`/llms.txt`** — structured product description for AI engine crawlers

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ❤️ — <strong>SlotBoost</strong> | <a href="https://github.com/jjf2009/slotboost-dynamic-pricing">GitHub</a>
</p>