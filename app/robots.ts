import type { MetadataRoute } from "next";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://slotboost-dynamic-pricing.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Allow all major search engines + AI crawlers
        userAgent: "*",
        allow: ["/", "/client", "/book", "/waitlist"],
        disallow: [
          "/api/",
          "/professional/",
          "/pro/",
          "/(auth)/",
          "/_next/",
          "/favicon.ico",
        ],
      },
      {
        // Explicitly allow GPTBot (ChatGPT) for GEO citations
        userAgent: "GPTBot",
        allow: ["/", "/client", "/book"],
      },
      {
        // Explicitly allow ClaudeBot for GEO citations
        userAgent: "ClaudeBot",
        allow: ["/", "/client", "/book"],
      },
      {
        // Explicitly allow PerplexityBot for GEO citations
        userAgent: "PerplexityBot",
        allow: ["/", "/client", "/book"],
      },
      {
        // Explicitly allow Google-Extended (Gemini)
        userAgent: "Google-Extended",
        allow: ["/", "/client", "/book"],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
