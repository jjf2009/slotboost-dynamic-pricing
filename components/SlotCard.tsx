"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calculatePrice } from "@/lib/pricing";
import { format } from "date-fns";
import { Lightning, Clock, ChartLineDown, Bell } from "@phosphor-icons/react";

interface SlotCardProps {
  slot: {
    id: string;
    start_time: string;
    duration_mins: number;
    demand_index: number;
    d_cancel_active: boolean;
    d_cancel_expires_at?: string;
    professionals: {
      name: string;
      base_price: number;
      d_max: number;
    };
  };
  onBook: (slotId: string) => void;
}

export function SlotCard({ slot, onBook }: SlotCardProps) {
  const pro = slot.professionals;
  const result = calculatePrice({
    basePrice: pro.base_price,
    startTime: new Date(slot.start_time),
    demandIndex: slot.demand_index,
    dMax: pro.d_max,
    dCancelActive: slot.d_cancel_active,
    dCancelExpiry: slot.d_cancel_expires_at
      ? new Date(slot.d_cancel_expires_at)
      : undefined,
  });

  const discount = Math.round(result.dTotal * 100);
  const isFlashDeal = result.dLead > 0;
  const isCancelDeal = result.dCancel > 0;

  return (
    <Card
      className={`group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${
        isCancelDeal
          ? "border-destructive/50 border-2"
          : isFlashDeal
          ? "border-primary/50 border-2"
          : "border-border/50"
      }`}
    >
      {/* Flash deal indicator */}
      {isFlashDeal && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-chart-4 to-primary" />
      )}

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            {format(new Date(slot.start_time), "EEE, dd MMM · h:mm a")}
          </CardTitle>
          {isFlashDeal && (
            <Badge className="bg-primary/10 text-primary border-0 font-bold gap-1">
              <Lightning weight="fill" className="w-3 h-3" />
              Flash
            </Badge>
          )}
          {isCancelDeal && (
            <Badge variant="destructive" className="font-bold gap-1">
              <Bell weight="fill" className="w-3 h-3" />
              Urgent
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {slot.duration_mins} min session with {pro.name}
        </p>
      </CardHeader>

      <CardContent className="space-y-3 pb-4">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-extrabold tracking-tight">
            ₹{result.currentPrice}
          </span>
          {discount > 0 && (
            <>
              <span className="text-base line-through text-muted-foreground">
                ₹{pro.base_price}
              </span>
              <Badge variant="destructive" className="text-xs font-bold">
                {discount}% off
              </Badge>
            </>
          )}
        </div>

        {/* Pricing breakdown */}
        {discount > 0 && (
          <div className="flex flex-wrap gap-2">
            {result.dLead > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">
                <Clock weight="bold" className="w-3.5 h-3.5 text-primary" />
                Last-minute −{Math.round(result.dLead * 100)}%
              </div>
            )}
            {result.dPeak > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">
                <ChartLineDown
                  weight="bold"
                  className="w-3.5 h-3.5 text-chart-2"
                />
                Off-peak −{Math.round(result.dPeak * 100)}%
              </div>
            )}
            {result.dCancel > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">
                <Bell weight="bold" className="w-3.5 h-3.5 text-destructive" />
                Cancellation −{Math.round(result.dCancel * 100)}%
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button
          className="w-full rounded-xl font-bold shadow-sm hover:shadow-md transition-all"
          onClick={() => onBook(slot.id)}
        >
          {isCancelDeal
            ? "🔔 Grab This Deal"
            : isFlashDeal
            ? "⚡ Book Flash Deal"
            : "Book Now"}
        </Button>
      </CardFooter>
    </Card>
  );
}
