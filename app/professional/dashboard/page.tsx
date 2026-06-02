import { redirect } from "next/navigation";
import { calculatePrice } from "@/lib/pricing";
import { getDemandIndexFromHeatMap } from "@/lib/heatmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";
import {
  Lightning,
  CalendarPlus,
  CurrencyInr,
  Clock,
  ChartLineUp,
  Users,
} from "@phosphor-icons/react/dist/ssr";
import { getUserFromRequest } from "@/lib/getUser";
import { prisma } from "@/lib/db";
import { ProfessionalSettings } from "@/components/ProfessionalSettings";
import { RecentBookings } from "@/components/RecentBookings";

export default async function DashboardPage() {
  const userPayload = await getUserFromRequest();

  if (!userPayload) redirect("/login");

  // Get professional details using Prisma
  const professional = await prisma.professional.findUnique({
    where: { userId: userPayload.userId },
  });

  if (!professional) {
    // If user exists but is not a professional, redirect to home
    redirect("/");
  }

  // Get upcoming slots
  const slots = await prisma.slot.findMany({
    where: {
      professionalId: professional.id,
      start_time: {
        gte: new Date(),
      },
    },
    orderBy: { start_time: "asc" },
    take: 20,
  });

  // Get recent confirmed bookings
  const bookings = await prisma.booking.findMany({
    where: {
      slot: {
        professionalId: professional.id,
      },
      status: "confirmed",
    },
    include: {
      client: true,
      slot: true,
    },
    orderBy: { booked_at: "desc" },
    take: 5,
  });

  // Stats
  const availableSlots = slots.filter((s) => s.status === "available");
  const bookedSlots = slots.filter((s) => s.status === "booked");
  const totalRevenue = bookings.reduce(
    (sum, b) => sum + (b.price_paid || 0),
    0,
  );

  // Calculate live prices
  const slotsWithPrices = availableSlots.map((slot) => {
    const demandIndex = getDemandIndexFromHeatMap(
      professional.heat_map,
      slot.start_time,
      slot.demand_index,
    );

    const result = calculatePrice({
      basePrice: professional.base_price,
      startTime: new Date(slot.start_time),
      demandIndex,
      dMax: professional.d_max,
      dCancelActive: slot.d_cancel_active,
      dCancelExpiry: slot.d_cancel_expires_at
        ? new Date(slot.d_cancel_expires_at)
        : undefined,
    });
    return { ...slot, pricing: result };
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {professional.name}. Here&apos;s your slot overview.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ProfessionalSettings
            initialBasePrice={professional.base_price}
            initialDMax={professional.d_max}
          />
          <Link href="/professional/slots/new">
            <Button className="rounded-xl font-bold shadow-sm gap-2">
              <CalendarPlus weight="bold" className="w-4 h-4" />
              Create Slot
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Available Slots",
            value: availableSlots.length,
            icon: Clock,
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            label: "Booked Slots",
            value: bookedSlots.length,
            icon: Lightning,
            color: "text-chart-2",
            bg: "bg-chart-2/10",
          },
          {
            label: "Revenue (Recent)",
            value: `₹${totalRevenue.toLocaleString()}`,
            icon: CurrencyInr,
            color: "text-chart-4",
            bg: "bg-chart-4/10",
          },
          {
            label: "Base Price",
            value: `₹${professional.base_price}`,
            icon: ChartLineUp,
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
                  <stat.icon
                    weight="duotone"
                    className={`w-5 h-5 ${stat.color}`}
                  />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Available Slots with Live Prices */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightning weight="fill" className="w-5 h-5 text-primary" />
            Available Slots — Live Pricing
          </CardTitle>
        </CardHeader>
        <CardContent>
          {slotsWithPrices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock
                weight="duotone"
                className="w-12 h-12 mx-auto mb-3 opacity-50"
              />
              <p className="font-medium">No available slots</p>
              <p className="text-sm mt-1">
                Create your first slot to start receiving bookings.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {slotsWithPrices.map((slot) => {
                const discount = Math.round(slot.pricing.dTotal * 100);
                const isFlash = slot.pricing.dLead > 0;
                return (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold">
                        {format(
                          new Date(slot.start_time),
                          "EEE, dd MMM · h:mm a",
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {slot.duration_mins} min · DI:{" "}
                        {slot.demand_index.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {isFlash && (
                        <Badge className="bg-primary/10 text-primary border-0 text-xs font-bold">
                          ⚡ Flash
                        </Badge>
                      )}
                      <div className="text-right">
                        <p className="font-bold text-lg">
                          ₹{slot.pricing.currentPrice}
                        </p>
                        {discount > 0 && (
                          <p className="text-xs text-muted-foreground">
                            <span className="line-through">
                              ₹{professional.base_price}
                            </span>{" "}
                            · {discount}% off
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

      {/* Recent Bookings */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users weight="fill" className="w-5 h-5 text-chart-2" />
            Recent Bookings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RecentBookings bookings={bookings} />
        </CardContent>
      </Card>
    </div>
  );
}
