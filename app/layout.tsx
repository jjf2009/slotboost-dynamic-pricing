import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "SlotBoost — Dynamic Pricing for Service Professionals",
  description:
    "Fill empty appointment slots with intelligent, time-sensitive pricing. Professionals earn more, clients save more.",
  keywords: [
    "dynamic pricing",
    "appointment booking",
    "flash deals",
    "service professionals",
    "slot booking",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full scroll-smooth antialiased", inter.variable)}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
