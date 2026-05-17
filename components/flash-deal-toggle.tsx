"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Bell, BellRinging, Lightning } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

interface FlashDealToggleProps {
  professionalId: string;
}

export function FlashDealToggle({ professionalId }: FlashDealToggleProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState("sms");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function checkSubscription() {
      try {
        const res = await fetch(`/api/subscribers?professionalId=${professionalId}`);
        if (res.ok) {
          const data = await res.json();
          setIsSubscribed(data.isSubscribed);
        }
      } catch (err) {
        console.error("Failed to fetch subscription status:", err);
      } finally {
        setIsLoading(false);
      }
    }
    checkSubscription();
  }, [professionalId]);

  const handleUnsubscribe = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/subscribers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professionalId }),
      });

      if (res.ok) {
        setIsSubscribed(false);
        toast.success("Unsubscribed successfully. You will no longer receive flash deal alerts.");
      } else if (res.status === 401) {
        router.push("/login");
      } else {
        toast.error("Failed to unsubscribe. Please try again.");
      }
    } catch {
      toast.error("An error occurred while unsubscribing.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professionalId, phone, channel }),
      });

      if (res.ok) {
        setIsSubscribed(true);
        setIsDialogOpen(false);
        toast.success(`Subscribed! You'll now receive flash deals via ${channel.toUpperCase()}.`);
      } else if (res.status === 401) {
        router.push("/login");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to subscribe.");
      }
    } catch {
      toast.error("An error occurred while subscribing.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Button variant="outline" className="w-full sm:w-auto" disabled>
        <Lightning className="w-4 h-4 mr-2 animate-pulse" />
        Loading...
      </Button>
    );
  }

  if (isSubscribed) {
    return (
      <Button
        variant="secondary"
        className="w-full sm:w-auto bg-primary/10 text-primary hover:bg-primary/20 transition-all font-semibold border-primary/20 border"
        onClick={handleUnsubscribe}
        disabled={isSubmitting}
      >
        <BellRinging className="w-5 h-5 mr-2 animate-pulse-slow" weight="fill" />
        Subscribed to Flash Deals
      </Button>
    );
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger render={<Button variant="outline" className="w-full sm:w-auto font-semibold hover:border-primary hover:text-primary transition-colors" />}>
        <Bell className="w-5 h-5 mr-2" weight="duotone" />
        Get Flash Deal Alerts
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightning weight="fill" className="text-primary w-5 h-5" />
            Never Miss a Deal
          </DialogTitle>
          <DialogDescription>
            Enter your phone number to receive instant SMS or WhatsApp alerts when this professional drops their prices.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubscribe} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="channel">Alert Channel</Label>
            <Select value={channel} onValueChange={(val) => setChannel(val || "sms")}>
              <SelectTrigger id="channel">
                <SelectValue placeholder="Select channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Subscribing..." : "Subscribe Now"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
