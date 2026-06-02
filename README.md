# ⚡ SlotBoost: Dynamic Pricing for Service Professionals

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)

**SlotBoost** is an intelligent booking platform that transforms empty slots into revenue machines. Using time-sensitive, dynamic pricing, it helps service professionals fill last-minute appointments while offering clients exclusive deals.

---

## ✨ Features

### 🚀 Revenue Optimization
- **Lead-Time Discounts**: Automatically applies discounts (up to 25%) as slots approach their start time.
- **Peak/Off-Peak Heatmaps**: Configure a 7×24 demand index to adjust prices based on your busiest and slowest hours.
- **Smart D_max Cap**: Total control over your pricing floor. SlotBoost never discounts below your defined limit.

### 🔄 Intelligent Automation
- **Cancellation Recovery**: Instant flash deal alerts (e.g., 15% off for 10 minutes) to fill sudden openings.
- **Waitlist Autopilot**: Automatically notifies waitlisted clients via SMS/WhatsApp when a slot becomes available.
- **Live Price Updates**: Real-time pricing engine that adjusts as time passes.

### 🛠 Professional Tools
- **Slot Management**: Easy-to-use dashboard to add availability and set base prices.
- **Client Booking**: A seamless, mobile-first booking experience for your clients.
- **Notifications**: Integrated SMS and WhatsApp alerts for appointments and deals.

---

## 🛠 Tech Stack

- **Frontend**: [Next.js 15](https://nextjs.org/) (App Router), [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/)
- **Backend/Auth**: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side-rendering)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (via Supabase & [Neon](https://neon.tech/))
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Data Fetching**: [TanStack Query v5](https://tanstack.com/query/latest)
- **Icons**: [Phosphor Icons](https://phosphoricons.com/)
- **Validation**: [Zod](https://zod.dev/)

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
```

### 3. Set up Environment Variables
Create a `.env` file in the root directory and add your local MVP credentials:
```env
# Database
DATABASE_URL=your_postgres_connection_url
DIRECT_URL=your_direct_postgres_connection_url_if_available

# Auth
JWT_SECRET=your_generated_jwt_secret

# Twilio WhatsApp Sandbox
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

The local MVP uses Nominatim + OSRM for free geo-checking, so no paid maps key is required. Payment gateway keys are also not required because payments and Flex Credits are future scope.

To sync the Prisma schema to the connected database:

```bash
npx prisma db push
npx prisma generate
```


### 4. Run the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to see the app.

For the local demo, manually trigger dynamic pricing, flash-deal checks, and reminder checks:

```bash
curl http://localhost:3000/api/pricing/recalculate
```

---

## 📁 Project Structure

```text
├── app/                # Next.js App Router (Routes & Pages)
│   ├── (auth)/         # Authentication flow
│   ├── api/            # Backend API routes
│   ├── professional/   # Professional dashboard
│   ├── book/           # Client booking flow
│   └── waitlist/       # Waitlist management
├── components/         # Reusable UI components
│   └── ui/             # Shadcn UI primitives
├── hooks/              # Custom React hooks
├── lib/                # Utility functions & shared logic
├── store/              # Zustand state stores
├── types/              # TypeScript definitions
└── public/             # Static assets
```

---

## 🚢 Deployment

The easiest way to deploy is using the [Vercel Platform](https://vercel.com/new).

1. Connect your GitHub repository to Vercel.
2. Configure the environment variables in the Vercel dashboard.
3. Deploy!

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ❤️ by the SlotBoost Team
</p>
