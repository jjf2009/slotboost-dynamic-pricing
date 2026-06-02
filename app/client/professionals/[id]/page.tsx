import { redirect, notFound } from "next/navigation";
import { getUserFromRequest } from "@/lib/getUser";
import { prisma } from "@/lib/db";
import { calculatePrice } from "@/lib/pricing";
import { getDemandIndexFromHeatMap } from "@/lib/heatmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";
import {
  Lightning,
  Clock,
  ArrowLeft,
  MapPin,
  Users,
} from "@phosphor-icons/react/dist/ssr";
import { FlashDealToggle } from "@/components/flash-deal-toggle";
import { JoinWaitlistButton } from "@/components/JoinWaitlistButton";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProfessionalDetailPage({ params }: Props) {
  const { id } = await params;
  const userPayload = await getUserFromRequest();
  if (!userPayload) redirect("/login");

  const professional = await prisma.professional.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      service_type: true,
      base_price: true,
      d_max: true,
      is_mobile: true,
      heat_map: true,
    },
  });

  if (!professional) notFound();

  // Get all future slots (both available and booked)
  const slots = await prisma.slot.findMany({
    where: {
      professionalId: professional.id,
      start_time: { gt: new Date() },
    },
    include: {
      _count: { select: { waitlists: true } },
    },
    orderBy: { start_time: "asc" },
  });

  // Calculate live prices for each slot
  const slotsWithPricing = slots.map((slot) => {
    const demandIndex = getDemandIndexFromHeatMap(
      professional.heat_map,
      slot.start_time,
      slot.demand_index,
    );

    const pricing = calculatePrice({
      basePrice: professional.base_price,
      startTime: slot.start_time,
      demandIndex,
      dMax: professional.d_max,
      dCancelActive: slot.d_cancel_active,
      dCancelExpiry: slot.d_cancel_expires_at ?? undefined,
    });
    return { ...slot, pricing };
  });

  const availableSlots = slotsWithPricing.filter(
    (s) => s.status === "available",
  );
  const bookedSlots = slotsWithPricing.filter((s) => s.status === "booked");

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/client/browse"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft weight="bold" className="w-4 h-4" />
        Back to Browse
      </Link>

      {/* Professional header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-primary/60 to-chart-4/60 flex items-center justify-center text-xl font-bold text-primary-foreground">
            {professional.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {professional.name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              {professional.service_type && (
                <Badge variant="secondary">{professional.service_type}</Badge>
              )}
              <span className="text-sm text-muted-foreground">
                Base: ₹{professional.base_price}
              </span>
              {professional.is_mobile && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin weight="fill" className="w-3.5 h-3.5" />
                  Mobile
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Flash Deal Toggle (FR-10, FR-11) */}
        <FlashDealToggle professionalId={professional.id} />
      </div>

      {/* Available Slots */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightning weight="fill" className="w-5 h-5 text-primary" />
            Available Slots — Live Pricing
            {availableSlots.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {availableSlots.length} available
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availableSlots.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock
                weight="duotone"
                className="w-12 h-12 mx-auto mb-3 opacity-50"
              />
              <p className="font-medium">No available slots right now</p>
              <p className="text-sm mt-1">
                Subscribe to flash deals to get notified when new slots open up.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {availableSlots.map((slot) => {
                const discount = Math.round(slot.pricing.dTotal * 100);
                const isFlash = slot.pricing.dLead > 0;
                const isCancelDeal = slot.d_cancel_active;

                return (
                  <div
                    key={slot.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-5 first:pt-0 last:pb-0"
                  >
                    <div className="space-y-1.5">
                      <p className="font-semibold text-base">
                        {format(
                          new Date(slot.start_time),
                          "EEE, dd MMM · h:mm a",
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {slot.duration_mins} min session
                      </p>
                      <div className="flex items-center gap-2">
                        {isFlash && (
                          <Badge className="bg-primary/10 text-primary border-0 text-xs font-bold">
                            ⚡ Flash Deal
                          </Badge>
                        )}
                        {isCancelDeal && (
                          <Badge className="bg-chart-4/10 text-chart-4 border-0 text-xs font-bold animate-pulse">
                            🔥 Recovery Deal
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="text-right">
                        <p className="font-bold text-xl">
                          ₹{slot.pricing.currentPrice}
                        </p>
                        {discount > 0 && (
                          <p className="text-xs text-muted-foreground">
                            <span className="line-through">
                              ₹{professional.base_price}
                            </span>{" "}
                            ·{" "}
                            <span className="text-primary font-semibold">
                              {discount}% off
                            </span>
                          </p>
                        )}
                      </div>
                      <Link href={`/book/${slot.id}`}>
                        <Button className="rounded-xl font-bold shadow-sm whitespace-nowrap">
                          Book Now
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booked Slots (Join Waitlist) — FR-12 */}
      {bookedSlots.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users weight="fill" className="w-5 h-5 text-chart-4" />
              Fully Booked — Join Waitlist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/50">
              {bookedSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-5 first:pt-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="font-semibold">
                      {format(
                        new Date(slot.start_time),
                        "EEE, dd MMM · h:mm a",
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {slot.duration_mins} min · {slot._count.waitlists} on
                      waitlist
                    </p>
                  </div>
                  <JoinWaitlistButton slotId={slot.id} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
