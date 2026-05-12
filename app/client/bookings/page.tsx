import { redirect } from "next/navigation";
import { getUserFromRequest } from "@/lib/getUser";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { BookingCard } from "@/components/BookingCard";
import {
  CalendarCheck,
  Clock,
  XCircle,
} from "@phosphor-icons/react/dist/ssr";

export default async function MyBookingsPage() {
  const userPayload = await getUserFromRequest();
  if (!userPayload) redirect("/login");

  const client = await prisma.client.findUnique({
    where: { userId: userPayload.userId },
  });
  if (!client) redirect("/login");

  // Fetch all bookings
  const allBookings = await prisma.booking.findMany({
    where: { clientId: client.id },
    include: {
      slot: {
        include: {
          professional: {
            select: { name: true, service_type: true, base_price: true },
          },
        },
      },
    },
    orderBy: { booked_at: "desc" },
  });

  const now = new Date();

  const upcoming = allBookings.filter(
    (b) => b.status === "confirmed" && new Date(b.slot.start_time) > now
  );
  const past = allBookings.filter(
    (b) => b.status === "confirmed" && new Date(b.slot.start_time) <= now
  );
  const cancelled = allBookings.filter((b) => b.status === "cancelled");

  const sections = [
    {
      title: "Upcoming",
      icon: CalendarCheck,
      color: "text-primary",
      bookings: upcoming,
      emptyMessage: "No upcoming bookings.",
      emptyIcon: CalendarCheck,
    },
    {
      title: "Past",
      icon: Clock,
      color: "text-chart-2",
      bookings: past,
      emptyMessage: "No past bookings yet.",
      emptyIcon: Clock,
    },
    {
      title: "Cancelled",
      icon: XCircle,
      color: "text-destructive",
      bookings: cancelled,
      emptyMessage: "No cancelled bookings.",
      emptyIcon: XCircle,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Bookings</h1>
        <p className="text-muted-foreground mt-1">
          View and manage all your appointments.
        </p>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-3">
        <Badge variant="secondary" className="px-3 py-1.5 text-sm gap-1.5">
          <CalendarCheck weight="fill" className="w-4 h-4 text-primary" />
          {upcoming.length} Upcoming
        </Badge>
        <Badge variant="secondary" className="px-3 py-1.5 text-sm gap-1.5">
          <Clock weight="fill" className="w-4 h-4 text-chart-2" />
          {past.length} Completed
        </Badge>
        <Badge variant="secondary" className="px-3 py-1.5 text-sm gap-1.5">
          <XCircle weight="fill" className="w-4 h-4 text-destructive" />
          {cancelled.length} Cancelled
        </Badge>
      </div>

      {/* Booking sections */}
      {sections.map((section) => (
        <div key={section.title} className="space-y-4">
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <section.icon weight="fill" className={`w-5 h-5 ${section.color}`} />
            {section.title}
          </h2>

          {section.bookings.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border border-dashed border-border/50 rounded-2xl">
              <section.emptyIcon
                weight="duotone"
                className="w-10 h-10 mx-auto mb-2 opacity-40"
              />
              <p className="text-sm">{section.emptyMessage}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {section.bookings.map((booking) => {
                const slotStart = new Date(booking.slot.start_time);
                const hoursRemaining = (slotStart.getTime() - now.getTime()) / (1000 * 60 * 60);
                return (
                  <BookingCard
                    key={booking.id}
                    booking={{
                      ...booking,
                      booked_at: booking.booked_at.toISOString(),
                      cancelled_at: booking.cancelled_at?.toISOString() ?? null,
                      slot: {
                        ...booking.slot,
                        start_time: booking.slot.start_time.toISOString(),
                      },
                    }}
                    showActions={section.title === "Upcoming"}
                    isUpcoming={slotStart > now}
                    isWithinRecoveryWindow={hoursRemaining > 0 && hoursRemaining < 4}
                  />
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
