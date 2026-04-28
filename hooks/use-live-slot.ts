"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useLiveSlot(slotId: string, initialSlot: any) {
  const [slot, setSlot] = useState(initialSlot);
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
        (payload) => setSlot(payload.new)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [slotId, supabase]);

  return slot;
}
