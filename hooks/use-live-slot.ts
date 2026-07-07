"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useLiveSlot<T>(slotId: string, initialSlot: T) {
  const [slot, setSlot] = useState<T>(initialSlot);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`slot-${slotId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "slots",
          filter: `id=eq.${slotId}`,
        },
        (payload) => setSlot(payload.new as T),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [slotId, supabase]);

  return slot;
}
