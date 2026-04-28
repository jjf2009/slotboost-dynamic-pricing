"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { HeatMapGrid } from "@/components/HeatMapGrid";
import { toast } from "sonner";

export default function HeatMapPage() {
  const [heatMap, setHeatMap] = useState<Record<string, number>>({});
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: professional } = await supabase
        .from("professionals")
        .select("id, heat_map")
        .eq("user_id", user.id)
        .single();

      if (professional) {
        setProfessionalId(professional.id);
        setHeatMap(professional.heat_map || {});
      }
      setLoading(false);
    }

    load();
  }, [supabase]);

  const handleSave = async (values: Record<string, number>) => {
    if (!professionalId) return;
    setSaving(true);

    const { error } = await supabase
      .from("professionals")
      .update({ heat_map: values })
      .eq("id", professionalId);

    if (error) {
      toast.error("Failed to save heat map");
    } else {
      toast.success("Heat map saved!");
      setHeatMap(values);
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Demand Heat Map
        </h1>
        <p className="text-muted-foreground">
          Set demand indexes for each hour of the week. Low demand = bigger
          discounts applied automatically.
        </p>
      </div>

      <HeatMapGrid
        initialValues={heatMap}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}
