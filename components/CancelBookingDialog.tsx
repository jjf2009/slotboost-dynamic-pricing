"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Warning, Spinner } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

interface CancelBookingDialogProps {
  bookingId: string;
  professionalName: string;
  slotTime: string;
  isWithinRecoveryWindow: boolean;
}

export function CancelBookingDialog({
  bookingId,
  professionalName,
  slotTime,
  isWithinRecoveryWindow,
}: CancelBookingDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCancel = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/slots/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to cancel booking");
        return;
      }

      toast.success("Booking cancelled successfully.");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 font-semibold text-sm"
        >
          Cancel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Warning weight="fill" className="text-destructive w-5 h-5" />
            Cancel Booking
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel your booking with{" "}
            <strong>{professionalName}</strong> on <strong>{slotTime}</strong>?
          </DialogDescription>
        </DialogHeader>

        {isWithinRecoveryWindow && (
          <div className="bg-chart-4/10 border border-chart-4/20 rounded-xl p-4 text-sm">
            <p className="font-semibold text-chart-4 mb-1">⚡ Recovery Window Active</p>
            <p className="text-muted-foreground">
              This slot starts in less than 4 hours. Cancelling now will trigger a{" "}
              <strong>15% flash deal</strong> for waitlisted clients for 10 minutes.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 pt-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
            Keep Booking
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <Spinner className="w-4 h-4 animate-spin" />
            ) : null}
            Yes, Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
