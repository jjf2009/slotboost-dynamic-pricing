import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CancelBookingDialog } from "@/components/CancelBookingDialog";

interface BookingCardProps {
  booking: {
    id: string;
    price_paid: number;
    status: string;
    booked_at: string | Date;
    cancelled_at: string | Date | null;
    slot: {
      start_time: string | Date;
      duration_mins: number;
      professional: {
        name: string;
        service_type: string | null;
        base_price: number;
      };
    };
  };
  showActions?: boolean;
  /** Whether the slot starts within the 4-hour recovery window — computed server-side */
  isUpcoming?: boolean;
  isWithinRecoveryWindow?: boolean;
}

export function BookingCard({
  booking,
  showActions = true,
  isUpcoming = false,
  isWithinRecoveryWindow = false,
}: BookingCardProps) {
  const slot = booking.slot;
  const pro = slot.professional;
  const slotTime = format(new Date(slot.start_time), "EEE, dd MMM · h:mm a");
  const isConfirmed = booking.status === "confirmed";
  const isCancelled = booking.status === "cancelled";

  const savings = pro.base_price - booking.price_paid;
  const savingsPercent = Math.round((savings / pro.base_price) * 100);

  return (
    <Card
      className={`border-border/50 transition-all ${
        isCancelled ? "opacity-60" : "hover:shadow-md"
      }`}
    >
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left: details */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-base">{pro.name}</p>
              {pro.service_type && (
                <Badge variant="secondary" className="text-xs">
                  {pro.service_type}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{slotTime} · {slot.duration_mins} min</p>

            {/* Status badges */}
            <div className="flex items-center gap-2 pt-1">
              {isConfirmed && isUpcoming && (
                <Badge className="bg-chart-2/10 text-chart-2 border-0 text-xs font-bold">
                  Upcoming
                </Badge>
              )}
              {isConfirmed && !isUpcoming && (
                <Badge variant="secondary" className="text-xs font-medium">
                  Completed
                </Badge>
              )}
              {isCancelled && (
                <Badge className="bg-destructive/10 text-destructive border-0 text-xs font-bold">
                  Cancelled
                </Badge>
              )}
              {savings > 0 && isConfirmed && (
                <Badge className="bg-primary/10 text-primary border-0 text-xs font-bold">
                  Saved {savingsPercent}%
                </Badge>
              )}
            </div>
          </div>

          {/* Right: price + actions */}
          <div className="text-right shrink-0 space-y-2">
            <div>
              <p className="font-bold text-xl">₹{booking.price_paid}</p>
              {savings > 0 && (
                <p className="text-xs text-muted-foreground">
                  <span className="line-through">₹{pro.base_price}</span>
                </p>
              )}
            </div>
            {showActions && isConfirmed && isUpcoming && (
              <CancelBookingDialog
                bookingId={booking.id}
                professionalName={pro.name}
                slotTime={slotTime}
                isWithinRecoveryWindow={isWithinRecoveryWindow}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
