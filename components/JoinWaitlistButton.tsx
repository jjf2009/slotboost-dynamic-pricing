"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { UserPlus, Check, Spinner } from "@phosphor-icons/react";

interface JoinWaitlistButtonProps {
  slotId: string;
}

export function JoinWaitlistButton({ slotId }: JoinWaitlistButtonProps) {
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, email: "auto" }), // email will come from auth
      });

      const data = await res.json();

      if (res.status === 409) {
        // Already on waitlist
        setJoined(true);
        toast.info("You're already on the waitlist for this slot.");
        return;
      }

      if (!res.ok) {
        toast.error(data.error || "Failed to join waitlist");
        return;
      }

      setJoined(true);
      toast.success("You've joined the waitlist! We'll notify you if this slot opens up.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (joined) {
    return (
      <Button
        variant="secondary"
        className="rounded-xl font-semibold bg-chart-2/10 text-chart-2 border-chart-2/20 border gap-2"
        disabled
      >
        <Check weight="bold" className="w-4 h-4" />
        On Waitlist
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      className="rounded-xl font-semibold hover:border-chart-4 hover:text-chart-4 transition-colors gap-2"
      onClick={handleJoin}
      disabled={loading}
    >
      {loading ? (
        <Spinner className="w-4 h-4 animate-spin" />
      ) : (
        <UserPlus weight="bold" className="w-4 h-4" />
      )}
      Join Waitlist
    </Button>
  );
}
