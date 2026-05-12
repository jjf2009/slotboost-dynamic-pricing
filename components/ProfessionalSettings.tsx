"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Gear } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

interface ProfessionalSettingsProps {
  initialBasePrice: number;
  initialDMax: number;
}

export function ProfessionalSettings({ initialBasePrice, initialDMax }: ProfessionalSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [basePrice, setBasePrice] = useState(initialBasePrice);
  const [dMax, setDMax] = useState(initialDMax * 100); // convert 0.4 to 40
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (basePrice < 100 || basePrice > 50000) {
      toast.error("Base price must be between ₹100 and ₹50,000");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/professional/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          base_price: Number(basePrice),
          d_max: dMax / 100 // convert 40 back to 0.4
        }),
      });

      if (res.ok) {
        toast.success("Settings updated successfully!");
        setIsOpen(false);
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update settings");
      }
    } catch {
      toast.error("An error occurred while saving.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl font-bold shadow-sm gap-2">
          <Gear weight="bold" className="w-4 h-4" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Pricing Settings</DialogTitle>
          <DialogDescription>
            Update your base rate and the maximum discount limit for your dynamic pricing engine.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-3">
            <Label htmlFor="basePrice" className="text-sm font-semibold">
              Base Price (₹)
            </Label>
            <Input
              id="basePrice"
              type="number"
              min={100}
              max={50000}
              value={basePrice}
              onChange={(e) => setBasePrice(Number(e.target.value))}
              required
            />
            <p className="text-xs text-muted-foreground">
              Your standard, undiscounted rate. Minimum ₹100.
            </p>
          </div>
          
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Maximum Discount (D_max)</Label>
              <span className="font-bold text-primary">{dMax}%</span>
            </div>
            <Slider
              value={[dMax]}
              onValueChange={(vals) => setDMax(vals[0])}
              max={60}
              min={0}
              step={5}
              className="py-2"
            />
            <p className="text-xs text-muted-foreground leading-relaxed">
              This acts as a floor price. SlotBoost will never discount your service below <strong>₹{Math.round(basePrice * (1 - dMax / 100))}</strong>.
            </p>
          </div>
          
          <DialogFooter className="pt-4 border-t border-border/50">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Settings"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
