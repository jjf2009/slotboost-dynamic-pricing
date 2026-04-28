import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Lightning,
  Clock,
  ChartLineUp,
  Bell,
  ArrowRight,
  Star,
  ShieldCheck,
  Percent,
} from "@phosphor-icons/react/dist/ssr";

export default function Home() {
  return (
    <>
      <Navbar />

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-chart-4/10 rounded-full blur-3xl animate-pulse-slow delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/30 rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto px-6 text-center pt-24">
          <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium rounded-full">
            <Lightning weight="fill" className="w-4 h-4 mr-1.5 text-primary" />
            Dynamic Pricing for Service Professionals
          </Badge>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
            Turn Empty Slots Into
            <br />
            <span className="text-gradient">Revenue Machines</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            SlotBoost uses intelligent, time-sensitive pricing to fill your last-minute
            appointments. Professionals earn more. Clients get exclusive deals.
            Everybody wins.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button
                size="lg"
                className="text-base font-bold px-8 py-6 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-95"
              >
                Start Boosting — Free
                <ArrowRight weight="bold" className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button
                variant="outline"
                size="lg"
                className="text-base font-semibold px-8 py-6 rounded-2xl"
              >
                See How It Works
              </Button>
            </a>
          </div>

          {/* Social proof */}
          <div className="mt-14 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/60 to-chart-4/60 border-2 border-background flex items-center justify-center text-xs font-bold text-primary-foreground"
                >
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <span>
              <strong className="text-foreground">2,400+</strong> professionals boosting revenue
            </span>
            <div className="hidden sm:flex items-center gap-1 text-yellow-500">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} weight="fill" className="w-4 h-4" />
              ))}
              <span className="text-muted-foreground ml-1">4.9/5</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-4 py-1.5 rounded-full">
              Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Pricing That Works While You Sleep
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Four intelligent discount layers that automatically optimize your revenue.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Clock,
                title: "Lead-Time Discounts",
                desc: "Up to 25% off as slots approach — filling seats that would go empty.",
                color: "text-primary",
                bg: "bg-primary/10",
              },
              {
                icon: ChartLineUp,
                title: "Peak/Off-Peak Pricing",
                desc: "Set demand indexes with a 7×24 heat map. Off-peak = auto discounts.",
                color: "text-chart-2",
                bg: "bg-chart-2/10",
              },
              {
                icon: Bell,
                title: "Cancellation Recovery",
                desc: "15% flash deal for 10 minutes. Waitlist autopilot fills cancellations instantly.",
                color: "text-chart-4",
                bg: "bg-chart-4/10",
              },
              {
                icon: Percent,
                title: "Smart D_max Cap",
                desc: "You set the maximum discount. SlotBoost never goes below your floor price.",
                color: "text-chart-3",
                bg: "bg-chart-3/10",
              },
            ].map((feat) => (
              <Card
                key={feat.title}
                className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50"
              >
                <CardContent className="pt-8 pb-6 px-6">
                  <div
                    className={`w-12 h-12 rounded-2xl ${feat.bg} flex items-center justify-center mb-5 transition-transform group-hover:scale-110`}
                  >
                    <feat.icon weight="duotone" className={`w-6 h-6 ${feat.color}`} />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{feat.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feat.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 bg-muted/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-4 py-1.5 rounded-full">
              How It Works
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Three Steps to Smarter Pricing
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Set Your Slots",
                desc: "Add your availability and base prices. Configure your heat map for demand patterns.",
              },
              {
                step: "02",
                title: "Prices Adjust Live",
                desc: "As time passes, SlotBoost applies intelligent discounts — capped at your D_max limit.",
              },
              {
                step: "03",
                title: "Clients Book & Save",
                desc: "Flash deal alerts go out via SMS/WhatsApp. Cancellations auto-fill from the waitlist.",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="text-7xl font-extrabold text-primary/10 mb-2">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing Section ─────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4 px-4 py-1.5 rounded-full">
            Pricing
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Simple, Fair Pricing
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-12">
            Start free. Upgrade when you&apos;re ready to scale.
          </p>

          <div className="grid sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <Card className="border-border/50 hover:shadow-lg transition-shadow">
              <CardContent className="pt-8 pb-6 px-8 text-left">
                <h3 className="text-lg font-bold mb-1">Starter</h3>
                <p className="text-muted-foreground text-sm mb-6">For solo professionals</p>
                <div className="text-4xl font-extrabold mb-6">
                  Free
                  <span className="text-base font-normal text-muted-foreground ml-2">forever</span>
                </div>
                <ul className="space-y-3 mb-8 text-sm">
                  {["Up to 20 slots/month", "SMS notifications", "Basic heat map", "D_max up to 30%"].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <ShieldCheck weight="fill" className="w-4 h-4 text-chart-2 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <Button variant="outline" className="w-full rounded-xl font-semibold">
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-primary/30 shadow-lg glow-brand relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-xl">
                POPULAR
              </div>
              <CardContent className="pt-8 pb-6 px-8 text-left">
                <h3 className="text-lg font-bold mb-1">Pro</h3>
                <p className="text-muted-foreground text-sm mb-6">For growing practices</p>
                <div className="text-4xl font-extrabold mb-6">
                  ₹999
                  <span className="text-base font-normal text-muted-foreground ml-2">/month</span>
                </div>
                <ul className="space-y-3 mb-8 text-sm">
                  {[
                    "Unlimited slots",
                    "SMS + WhatsApp alerts",
                    "Full heat map control",
                    "D_max up to 60%",
                    "Waitlist autopilot",
                    "Flex Credits system",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <ShieldCheck weight="fill" className="w-4 h-4 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <Button className="w-full rounded-xl font-bold shadow-md">
                    Start Free Trial
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-xl">
              <Lightning weight="fill" className="text-primary-foreground w-4 h-4" />
            </div>
            <span className="font-bold tracking-tight">
              Slot<span className="text-gradient">Boost</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} SlotBoost. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}
