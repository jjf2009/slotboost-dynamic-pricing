"use client";

import { useState, useEffect } from "react";
import { HeatMapGrid } from "@/components/HeatMapGrid";
import { toast } from "sonner";

export default function HeatMapPage() {
  const [heatMap, setHeatMap] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/professional/heatmap");
        const result = await res.json();

        if (!res.ok) {
          toast.error(result.error || "Failed to load heat map");
          return;
        }

        setHeatMap(result.heat_map || {});
      } catch {
        toast.error("Failed to load heat map");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const handleSave = async (values: Record<string, number>) => {
    setSaving(true);

    try {
      const res = await fetch("/api/professional/heatmap", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "Failed to save heat map");
        return;
      }

      toast.success("Heat map saved!");
      setHeatMap((result.heat_map as Record<string, number>) || values);
    } catch {
      toast.error("Failed to save heat map");
    } finally {
      setSaving(false);
    }
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
