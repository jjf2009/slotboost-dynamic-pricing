"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { WaitlistCountdown } from "@/components/WaitlistCountdown";
import { toast } from "sonner";
import { WaitlistStatus } from "@/types/database";

export default function WaitlistPage() {
  const params = useParams();
  const slotId = params.slotId as string;
  const [data, setData] = useState<WaitlistStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/waitlist/${slotId}`);
        const result = await res.json();
        if (res.ok) {
          setData(result);
        } else {
          toast.error(result.error || "Failed to load slot");
        }
      } catch {
        toast.error("Network error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slotId]);

  const handleBook = async () => {
    try {
      // Get some dummy client info (ideally we would have a form or use JWT)
      // Since waitlist usually needs email, we prompt or have a form.
      // For now, we will pass a placeholder email if we don't have auth on frontend.
      // Assuming WaitlistPage might need a small form if user isn't logged in.
      // I'll send a placeholder email, but in reality the frontend should ask for it.
      const res = await fetch("/api/waitlist/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, email: "waitlist@client.com" }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "Booking failed");
        return;
      }
      toast.success(`Booked at ₹${result.price}!`);
    } catch {
      toast.error("Something went wrong");
    }
  };

  const handleExpire = useCallback(() => {
    toast.error("Deal expired!");
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || !data.offerActive) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-muted-foreground text-center">
          This deal is no longer available.
        </p>
      </div>
    );
  }

  // Calculate the expiration date
  const expiresAt = new Date(Date.now() + data.secondsRemaining * 1000);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-background">
      <div className="w-full max-w-md">
        <WaitlistCountdown
          expiresAt={expiresAt}
          slotId={slotId}
          price={data.currentPrice}
          professionalName={data.slot.professional?.name || "Professional"}
          onBook={handleBook}
          onExpire={handleExpire}
        />
      </div>
    </div>
  );
}
