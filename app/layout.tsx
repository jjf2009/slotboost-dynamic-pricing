import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://slotboost-dynamic-pricing.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "SlotBoost — Dynamic Pricing Platform for Service Professionals",
    template: "%s | SlotBoost",
  },
  description:
    "SlotBoost is an AI-powered dynamic pricing platform that helps service professionals fill last-minute appointment slots with intelligent time-sensitive discounts. Earn more revenue, automate waitlists, and send WhatsApp flash deal alerts — all in one dashboard.",
  keywords: [
    "dynamic pricing software",
    "appointment slot booking",
    "flash deal alerts",
    "service professional booking",
    "last-minute appointment deals",
    "salon booking software",
    "fitness class booking",
    "waitlist management",
    "WhatsApp appointment reminder",
    "revenue optimization for professionals",
    "time-sensitive pricing",
    "booking cancellation recovery",
    "SmartPricingEngine",
    "SPEM project",
    "dynamic pricing SaaS India",
    "appointment booking India",
  ],
  authors: [{ name: "SlotBoost Team", url: APP_URL }],
  creator: "SlotBoost",
  publisher: "SlotBoost",
  applicationName: "SlotBoost",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    alternateLocale: ["en_US", "en_GB"],
    url: APP_URL,
    siteName: "SlotBoost",
    title: "SlotBoost — Dynamic Pricing Platform for Service Professionals",
    description:
      "Turn empty appointment slots into revenue. SlotBoost applies intelligent time-sensitive discounts, WhatsApp flash deal alerts, and waitlist autopilot so service professionals never leave money on the table.",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "SlotBoost — Dynamic Pricing for Service Professionals",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SlotBoost — Turn Empty Slots Into Revenue",
    description:
      "AI-powered dynamic pricing for service professionals. Fill last-minute bookings with intelligent discounts and WhatsApp alerts.",
    images: ["/opengraph-image.png"],
    creator: "@slotboost",
  },
  alternates: {
    canonical: APP_URL,
  },
  category: "business",
  classification: "SaaS / Booking / Revenue Optimization",
};

// JSON-LD Structured Data for GEO (AI engine citation readiness)
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${APP_URL}/#website`,
      url: APP_URL,
      name: "SlotBoost",
      description:
        "Dynamic pricing platform for service professionals. Fill empty appointment slots with intelligent, time-sensitive discounts.",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${APP_URL}/client?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${APP_URL}/#software`,
      name: "SlotBoost",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: APP_URL,
      offers: {
        "@type": "AggregateOffer",
        lowPrice: "0",
        highPrice: "999",
        priceCurrency: "INR",
        offerCount: "2",
      },
      description:
        "SlotBoost is an AI-powered dynamic pricing SaaS for service professionals. It uses lead-time discounts, peak/off-peak heatmaps, cancellation recovery flash deals, and waitlist autopilot to maximise appointment revenue.",
      featureList: [
        "Lead-time dynamic discounts up to 25%",
        "Peak/off-peak demand heatmap (7×24 grid)",
        "Cancellation recovery flash deals (15% for 10 min)",
        "Waitlist autopilot with WhatsApp alerts via Twilio",
        "Configurable D_max discount cap",
        "15-minute server-side pricing cron job",
      ],
      author: {
        "@type": "Organization",
        name: "SlotBoost",
        url: APP_URL,
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${APP_URL}/#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "What is dynamic pricing for service professionals?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Dynamic pricing for service professionals automatically adjusts appointment slot prices based on lead time, demand patterns, and cancellations. Slots closer to their start time are discounted to fill empty bookings, while peak hours retain full pricing.",
          },
        },
        {
          "@type": "Question",
          name: "How does SlotBoost's cancellation recovery work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "When a booking is cancelled, SlotBoost instantly triggers a 15% flash deal for 10 minutes and simultaneously notifies all waitlisted clients via WhatsApp. If a waitlist client books within the window, the slot is filled automatically.",
          },
        },
        {
          "@type": "Question",
          name: "What is D_max in dynamic pricing?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "D_max is the maximum discount percentage a professional configures in SlotBoost. The pricing engine never applies a combined discount (lead-time + heatmap + cancellation) that exceeds the D_max cap, protecting the professional's minimum acceptable revenue.",
          },
        },
        {
          "@type": "Question",
          name: "Which service professionals can use SlotBoost?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "SlotBoost is built for any professional who operates time-bound appointments: salons, barbershops, fitness coaches, yoga instructors, physiotherapists, tutors, and independent consultants. If you have bookable time slots, SlotBoost can optimise them.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full scroll-smooth antialiased")}>
      <body
        className="min-h-full flex flex-col font-sans"
        suppressHydrationWarning={true}
      >
        {children}
        <Toaster richColors position="top-right" />
        {/* JSON-LD structured data for SEO & GEO (AI citation readiness) */}
        <Script
          id="json-ld-slotboost"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
