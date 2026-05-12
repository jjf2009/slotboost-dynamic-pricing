import { redirect } from "next/navigation";
import { getUserFromRequest } from "@/lib/getUser";
import { prisma } from "@/lib/db";
import { calculatePrice } from "@/lib/pricing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";
import {
  Lightning,
  CalendarCheck,
  Clock,
  Bell,
  Users,
  MagnifyingGlass,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr";

export default async function ClientDashboardPage() {
  const userPayload = await getUserFromRequest();
  if (!userPayload) redirect("/login");

  const client = await prisma.client.findUnique({
    where: { userId: userPayload.userId },
  });
  if (!client) redirect("/login");

  // Upcoming confirmed bookings
  const upcomingBookings = await prisma.booking.findMany({
    where: {
      clientId: client.id,
      status: "confirmed",
      slot: { start_time: { gt: new Date() } },
    },
    include: {
      slot: {
        include: {
          professional: {
            select: { name: true, service_type: true, base_price: true },
          },
        },
      },
    },
    orderBy: { slot: { start_time: "asc" } },
    take: 5,
  });

  // Total bookings count
  const totalBookings = await prisma.booking.count({
    where: { clientId: client.id },
  });

  // Active waitlists
  const activeWaitlists = await prisma.waitlist.findMany({
    where: {
      clientId: client.id,
      slot: { start_time: { gt: new Date() } },
    },
    include: {
      slot: {
        include: {
          professional: {
            select: { name: true, service_type: true, base_price: true, d_max: true },
          },
        },
      },
    },
    orderBy: { slot: { start_time: "asc" } },
    take: 5,
  });

  // Flash-deal subscriptions count
  const subscriptionCount = await prisma.subscriber.count({
    where: { clientId: client.id },
  });

  // Attach live pricing to waitlisted slots
  const waitlistsWithPricing = activeWaitlists.map((entry) => {
    const slot = entry.slot;
    const pro = slot.professional;
    const pricing = calculatePrice({
      basePrice: pro.base_price,
      startTime: slot.start_time,
      demandIndex: slot.demand_index,
      dMax: pro.d_max,
      dCancelActive: slot.d_cancel_active,
      dCancelExpiry: slot.d_cancel_expires_at ?? undefined,
    });
    return { ...entry, pricing };
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {client.name}. Here&apos;s your booking overview.
          </p>
        </div>
        <Link href="/client/browse">
          <Button className="rounded-xl font-bold shadow-sm gap-2">
            <MagnifyingGlass weight="bold" className="w-4 h-4" />
            Browse Professionals
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Upcoming",
            value: upcomingBookings.length,
            icon: CalendarCheck,
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            label: "Total Bookings",
            value: totalBookings,
            icon: Lightning,
            color: "text-chart-2",
            bg: "bg-chart-2/10",
          },
          {
            label: "On Waitlists",
            value: activeWaitlists.length,
            icon: Users,
            color: "text-chart-4",
            bg: "bg-chart-4/10",
          },
          {
            label: "Flash Subscriptions",
            value: subscriptionCount,
            icon: Bell,
            color: "text-chart-3",
            bg: "bg-chart-3/10",
          },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground font-medium">
                  {stat.label}
                </span>
                <div
                  className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center`}
                >
                  <stat.icon weight="duotone" className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upcoming Bookings */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck weight="fill" className="w-5 h-5 text-primary" />
            Upcoming Bookings
          </CardTitle>
          <Link href="/client/bookings">
            <Button variant="ghost" size="sm" className="text-sm gap-1">
              View All <ArrowRight weight="bold" className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {upcomingBookings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarCheck weight="duotone" className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No upcoming bookings</p>
              <p className="text-sm mt-1">
                Browse professionals to find and book your first appointment.
              </p>
              <Link href="/client/browse">
                <Button variant="outline" className="mt-4 rounded-xl">
                  Browse Professionals
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {upcomingBookings.map((booking) => {
                const slot = booking.slot;
                const pro = slot.professional;
                return (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold">{pro.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(slot.start_time), "EEE, dd MMM · h:mm a")} ·{" "}
                        {slot.duration_mins} min
                      </p>
                      {pro.service_type && (
                        <Badge variant="secondary" className="text-xs">
                          {pro.service_type}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">₹{booking.price_paid}</p>
                      <Badge className="bg-chart-2/10 text-chart-2 border-0 text-xs font-bold">
                        Confirmed
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Waitlists */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock weight="fill" className="w-5 h-5 text-chart-4" />
            Active Waitlists
          </CardTitle>
        </CardHeader>
        <CardContent>
          {waitlistsWithPricing.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users weight="duotone" className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No active waitlists</p>
              <p className="text-sm mt-1">
                Join a waitlist on any fully-booked slot to get notified if it opens up.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {waitlistsWithPricing.map((entry) => {
                const slot = entry.slot;
                const pro = slot.professional;
                const discount = Math.round(entry.pricing.dTotal * 100);
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold">{pro.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(slot.start_time), "EEE, dd MMM · h:mm a")} ·{" "}
                        {slot.duration_mins} min
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {slot.d_cancel_active && (
                        <Badge className="bg-primary/10 text-primary border-0 text-xs font-bold animate-pulse">
                          ⚡ Recovery Deal
                        </Badge>
                      )}
                      <div className="text-right">
                        <p className="font-bold text-lg">₹{entry.pricing.currentPrice}</p>
                        {discount > 0 && (
                          <p className="text-xs text-muted-foreground">
                            <span className="line-through">₹{pro.base_price}</span> · {discount}% off
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
