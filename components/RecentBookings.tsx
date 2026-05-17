"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Users, XCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Booking {
  id: string;
  price_paid: number;
  booked_at: string | Date;
  client: { name: string } | null;
  status: string;
}

interface RecentBookingsProps {
  bookings: Booking[];
}

export function RecentBookings({ bookings }: RecentBookingsProps) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const router = useRouter();

  if (!bookings || bookings.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Users weight="duotone" className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">No bookings yet</p>
        <p className="text-sm mt-1">Share your booking page to start receiving clients.</p>
      </div>
    );
  }

  const handleCancel = async (bookingId: string) => {
    setCancellingId(bookingId);
    try {
      const res = await fetch("/api/slots/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(
          data.withinRecovery 
            ? "Booking cancelled. Waitlist autopilot activated!" 
            : "Booking cancelled successfully. Refund initiated."
        );
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to cancel booking.");
      }
    } catch {
      toast.error("An error occurred while cancelling.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="divide-y divide-border/50">
      {bookings.map((booking) => (
        <div key={booking.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
          <div className="space-y-1">
            <p className="font-semibold">{booking.client?.name || "Client"}</p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(booking.booked_at), "dd MMM yyyy, h:mm a")}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="font-bold">
              ₹{booking.price_paid}
            </Badge>

            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" />}>
                <XCircle weight="fill" className="w-5 h-5" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to cancel this booking for <strong>{booking.client?.name || "this client"}</strong>? 
                    They will receive a full refund. If this cancellation is within the recovery window (4 hours), the <strong>Waitlist Autopilot</strong> will immediately notify waitlisted clients.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => handleCancel(booking.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={cancellingId === booking.id}
                  >
                    {cancellingId === booking.id ? "Cancelling..." : "Yes, Cancel Booking"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ))}
    </div>
  );
}
