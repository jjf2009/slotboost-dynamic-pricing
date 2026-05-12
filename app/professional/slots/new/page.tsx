"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus, Spinner } from "@phosphor-icons/react";
import { createSlotAction } from "@/app/actions/slots";
import { format } from "date-fns";

export default function NewSlotPage() {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [demandIndex, setDemandIndex] = useState(0.5);
  const [price, setPrice] = useState(500);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createSlotAction({
        date,
        time,
        duration,
        demandIndex,
      });

      toast.success("Slot created successfully!");
      router.push("/professional/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Create New Slot</h1>
      <p className="text-muted-foreground mb-8">
        Add an available appointment slot for clients to book.
      </p>

      <Card className="border-border/50 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarPlus weight="fill" className="w-5 h-5 text-primary" />
            Slot Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slot-date">Date</Label>
                <Input
                  id="slot-date"
                  type="date"
                  value={date ?? ""}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  min={format(new Date(), "yyyy-MM-dd")}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slot-time">Time</Label>
                <Input
                  id="slot-time"
                  type="time"
                  value={time ?? ""}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slot-duration">Duration (minutes)</Label>
              <Input
                id="slot-duration"
                type="number"
                min={15}
                max={240}
                step={15}
                value={duration ?? ""}
                onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                required
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slot-price">Starting Price (₹)</Label>
              <Input
                id="slot-price"
                type="number"
                min={0}
                value={price ?? ""}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                required
                className="h-11 rounded-xl font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="demand-index">Demand Index (0 to 1)</Label>
              <Input
                id="demand-index"
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={demandIndex ?? ""}
                onChange={(e) => setDemandIndex(parseFloat(e.target.value) || 0)}
                required
                className="h-11 rounded-xl font-mono font-bold"
              />
              <div className="flex justify-between text-xs text-muted-foreground px-1 pt-1">
                <span>0 = Dead hour (max discount)</span>
                <span>1 = Peak demand (no discount)</span>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl font-bold text-base shadow-md"
              disabled={loading}
            >
              {loading ? (
                <Spinner className="w-5 h-5 animate-spin" />
              ) : (
                "Create Slot"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
