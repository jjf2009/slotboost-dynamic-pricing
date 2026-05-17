"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PricingBreakdown } from "@/components/PricingBreakdown";
import { PricingResult } from "@/lib/pricing";
import { toast } from "sonner";
import { Spinner, ShieldCheck, Lightning } from "@phosphor-icons/react";

interface BookingFormProps {
  slotId: string;
  pricingResult: PricingResult;
  basePrice: number;
  professionalName: string;
  slotTime: string;
}

export function BookingForm({
  slotId,
  pricingResult,
  basePrice,
  professionalName,
  slotTime,
}: BookingFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [booked, setBooked] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/slots/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, name, email, phone }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Booking failed. Please try again.");
        return;
      }

      toast.success(`Booking confirmed at ₹${data.price}!`);
      setBooked(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (booked) {
    return (
      <Card className="border-chart-2/30 bg-chart-2/5">
        <CardContent className="pt-8 pb-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-chart-2/20 flex items-center justify-center mx-auto">
            <ShieldCheck weight="fill" className="w-8 h-8 text-chart-2" />
          </div>
          <h3 className="text-2xl font-bold">Booking Confirmed!</h3>
          <p className="text-muted-foreground">
            {professionalName} — {slotTime}
          </p>
          <p className="text-3xl font-extrabold">₹{pricingResult.currentPrice}</p>
          <p className="text-sm text-muted-foreground">
            A confirmation SMS has been sent to your phone.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightning weight="fill" className="w-5 h-5 text-primary" />
          Complete Your Booking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pricing summary */}
        <div className="bg-muted/50 rounded-xl p-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">You pay</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold">
                ₹{pricingResult.currentPrice}
              </span>
              {pricingResult.dTotal > 0 && (
                <span className="text-sm line-through text-muted-foreground">
                  ₹{basePrice}
                </span>
              )}
            </div>
          </div>
          <PricingBreakdown result={pricingResult} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="booking-name">Name</Label>
            <Input
              id="booking-name"
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="booking-email">Email</Label>
            <Input
              id="booking-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="booking-phone">Phone</Label>
            <Input
              id="booking-phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="h-11 rounded-xl"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 rounded-xl font-bold text-base shadow-md"
            disabled={loading}
          >
            {loading ? (
              <Spinner className="w-5 h-5 animate-spin" />
            ) : (
              `Book for ₹${pricingResult.currentPrice}`
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Price recalculated at time of booking. No stale price exploits.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
