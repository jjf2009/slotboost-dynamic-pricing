"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { WaitlistCountdown } from "@/components/WaitlistCountdown";
import { toast } from "sonner";
import { WaitlistStatus } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function WaitlistPage() {
  const params = useParams();
  const slotId = params.slotId as string;
  const [data, setData] = useState<WaitlistStatus | null>(null);
  const [loading, setLoading] = useState(true);
  // Client details for the booking (collected via a small inline form)
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [booked, setBooked] = useState(false);

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

  // FR-26/27: Book within the 10-minute window
  const handleBook = async () => {
    if (!email.trim()) {
      toast.error("Please enter your email to book.");
      return;
    }

    try {
      const res = await fetch("/api/waitlist/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId,
          email: email.trim(),
          name: name.trim() || email.trim(),
          phone: phone.trim() || undefined,
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "Booking failed");
        return;
      }

      setBooked(true);
      toast.success(`🎉 Booked at ₹${result.price}! Confirmation details sent.`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };

  const handleExpire = useCallback(() => {
    toast.error("⏰ Deal expired! The offer window has closed.");
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Booking already completed
  if (booked) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center space-y-3">
          <p className="text-4xl">🎉</p>
          <h1 className="text-2xl font-bold">You&apos;re booked!</h1>
          <p className="text-muted-foreground">
            You&apos;ll receive a confirmation shortly. See you there!
          </p>
        </div>
      </div>
    );
  }

  // Offer not active (expired or slot already booked by someone else)
  if (!data || !data.offerActive) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center space-y-3">
          <p className="text-4xl">⏰</p>
          <h1 className="text-xl font-semibold">This deal is no longer available</h1>
          <p className="text-muted-foreground">
            The 10-minute offer window has closed or the slot was already booked.
          </p>
        </div>
      </div>
    );
  }

  // Calculate the expiration date from secondsRemaining
  const expiresAt = new Date(Date.now() + data.secondsRemaining * 1000);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-background">
      <div className="w-full max-w-md space-y-6">
        {/* Countdown card with price and book button */}
        <WaitlistCountdown
          expiresAt={expiresAt}
          slotId={slotId}
          price={data.currentPrice}
          professionalName={data.slot.professional?.name || "Professional"}
          onBook={handleBook}
          onExpire={handleExpire}
        />

        {/* Inline details form so we know who is booking */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Your Details
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="wl-email">Email *</Label>
            <Input
              id="wl-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wl-name">Name</Label>
            <Input
              id="wl-name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wl-phone">WhatsApp / Phone</Label>
            <Input
              id="wl-phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Required to receive the confirmation WhatsApp message.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
