"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus, Spinner } from "@phosphor-icons/react";
import { format } from "date-fns";

export default function NewSlotPage() {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [demandIndex, setDemandIndex] = useState(0.5);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get current user's professional profile
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      const { data: professional } = await supabase
        .from("professionals")
        .select("id, base_price")
        .eq("user_id", user.id)
        .single();

      if (!professional) {
        toast.error("Professional profile not found");
        return;
      }

      // Combine date + time
      const startTime = new Date(`${date}T${time}`);

      if (startTime <= new Date()) {
        toast.error("Slot must be in the future");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("slots").insert({
        professional_id: professional.id,
        start_time: startTime.toISOString(),
        duration_mins: duration,
        demand_index: demandIndex,
        current_price: professional.base_price,
        status: "available",
      });

      if (error) {
        toast.error("Failed to create slot: " + error.message);
        return;
      }

      toast.success("Slot created successfully!");
      router.push("/professional/dashboard");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
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
                  value={date}
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
                  value={time}
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
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                required
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Demand Index</Label>
                <span className="text-sm font-mono font-bold text-primary tabular-nums">
                  {demandIndex.toFixed(2)}
                </span>
              </div>
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={[demandIndex]}
                onValueChange={([v]) => setDemandIndex(v)}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
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
