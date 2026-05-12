"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightning, Timer } from "@phosphor-icons/react";

interface WaitlistCountdownProps {
  expiresAt: Date;
  slotId: string;
  price: number;
  professionalName: string;
  onBook: () => void;
  onExpire: () => void;
}

export function WaitlistCountdown({
  expiresAt,
  price,
  professionalName,
  onBook,
  onExpire,
}: WaitlistCountdownProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    setSecondsLeft(Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)));
  }, [expiresAt]);

  useEffect(() => {
    const interval = setInterval(() => {
      const s = Math.max(
        0,
        Math.floor((expiresAt.getTime() - Date.now()) / 1000)
      );
      setSecondsLeft(s);
      if (s === 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const isUrgent = secondsLeft < 60;
  const progress = (secondsLeft / 600) * 100; // 10 minutes = 600 seconds

  return (
    <Card
      className={`relative overflow-hidden border-2 transition-all ${
        isUrgent
          ? "border-destructive shadow-[0_0_30px_rgba(239,68,68,0.2)]"
          : "border-primary/50 shadow-xl"
      }`}
    >
      {/* Animated top bar */}
      <div className="h-1.5 bg-muted">
        <div
          className={`h-full transition-all duration-1000 ease-linear rounded-r ${
            isUrgent ? "bg-destructive" : "bg-primary"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightning weight="fill" className="w-5 h-5 text-primary" />
            <span>Flash Cancellation Deal</span>
          </div>
          <Badge
            variant={isUrgent ? "destructive" : "outline"}
            className="text-xl font-mono px-4 py-1.5 tabular-nums"
          >
            <Timer weight="bold" className="w-5 h-5 mr-1" />
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        <div>
          <p className="text-sm text-muted-foreground mb-1">
            {professionalName}
          </p>
          <p className="text-4xl font-extrabold tracking-tight">₹{price}</p>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          {secondsLeft > 0
            ? "This cancellation deal expires when the timer runs out. First to book wins!"
            : "This deal has expired. The slot may no longer be available."}
        </p>

        <Button
          className="w-full h-14 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
          size="lg"
          disabled={secondsLeft === 0}
          onClick={onBook}
        >
          {secondsLeft === 0 ? "Offer Expired" : "⚡ Book This Slot Now"}
        </Button>
      </CardContent>
    </Card>
  );
}
