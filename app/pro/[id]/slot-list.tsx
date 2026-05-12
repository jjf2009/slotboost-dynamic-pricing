"use client";

import { SlotCard } from "@/components/SlotCard";
import { useRouter } from "next/navigation";

interface ClientSlotListProps {
  slots: any[];
}

export function ClientSlotList({ slots }: ClientSlotListProps) {
  const router = useRouter();

  if (slots.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl border-border/50 bg-muted/20">
        <p>No available slots right now.</p>
        <p className="text-sm mt-1">Please check back later.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {slots.map((slot) => (
        <SlotCard
          key={slot.id}
          slot={slot}
          onBook={(id) => router.push(`/book/${id}`)}
        />
      ))}
    </div>
  );
}
