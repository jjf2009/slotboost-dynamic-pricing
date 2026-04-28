"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { calculatePrice } from "@/lib/pricing";
import { WaitlistCountdown } from "@/components/WaitlistCountdown";
import { toast } from "sonner";

export default function WaitlistPage() {
  const params = useParams();
  const slotId = params.slotId as string;
  const supabase = createClient();
  const [slot, setSlot] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("slots")
        .select("*, professionals(*)")
        .eq("id", slotId)
        .single();
      setSlot(data);
      setLoading(false);
    }
    load();
  }, [slotId, supabase]);

  const handleBook = async () => {
    try {
      const res = await fetch("/api/slots/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Booking failed");
        return;
      }
      toast.success(`Booked at ₹${data.price}!`);
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

  if (!slot || !slot.d_cancel_active) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-muted-foreground text-center">
          This deal is no longer available.
        </p>
      </div>
    );
  }

  const pro = slot.professionals;
  const result = calculatePrice({
    basePrice: pro.base_price,
    startTime: new Date(slot.start_time),
    demandIndex: slot.demand_index,
    dMax: pro.d_max,
    dCancelActive: true,
    dCancelExpiry: slot.d_cancel_expires_at
      ? new Date(slot.d_cancel_expires_at)
      : undefined,
  });

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-background">
      <div className="w-full max-w-md">
        <WaitlistCountdown
          expiresAt={new Date(slot.d_cancel_expires_at)}
          slotId={slotId}
          price={result.currentPrice}
          professionalName={pro.name}
          onBook={handleBook}
          onExpire={handleExpire}
        />
      </div>
    </div>
  );
}
