"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FloppyDisk } from "@phosphor-icons/react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const HOURS = Array.from({ length: 24 }, (_, i) =>
  i === 0 ? "12a" : i < 12 ? `${i}a` : i === 12 ? "12p" : `${i - 12}p`
);

type HeatMap = Record<string, number>;

interface HeatMapGridProps {
  initialValues: HeatMap;
  onSave: (values: HeatMap) => void;
  saving?: boolean;
}

export function HeatMapGrid({ initialValues, onSave, saving }: HeatMapGridProps) {
  const [values, setValues] = useState<HeatMap>(initialValues);
  const [selected, setSelected] = useState<string | null>(null);

  const getColor = (di: number) => {
    if (di >= 0.8) return "bg-chart-2";
    if (di >= 0.5) return "bg-chart-5";
    if (di >= 0.2) return "bg-primary/70";
    return "bg-destructive/70";
  };

  const key = (dayIndex: number, hour: number) =>
    `${DAY_KEYS[dayIndex]}_${hour.toString().padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      {/* Grid */}
      <div className="overflow-x-auto rounded-xl border border-border/50 p-4 bg-card">
        <div
          className="grid gap-[3px]"
          style={{ gridTemplateColumns: `56px repeat(24, minmax(28px, 1fr))` }}
        >
          {/* Hour headers */}
          <div />
          {HOURS.map((h, i) => (
            <div
              key={i}
              className="text-[10px] text-center text-muted-foreground font-medium"
            >
              {i % 3 === 0 ? h : ""}
            </div>
          ))}

          {/* Day rows */}
          {DAYS.map((day, dayIndex) => (
            <div key={day} className="contents">
              <div
                className="text-xs font-semibold flex items-center text-muted-foreground"
              >
                {day}
              </div>
              {Array.from({ length: 24 }, (_, hour) => {
                const k = key(dayIndex, hour);
                const di = values[k] ?? 0.5;
                return (
                  <button
                    key={k}
                    className={`h-7 rounded-md transition-all ${getColor(di)} ${
                      selected === k
                        ? "ring-2 ring-foreground ring-offset-1 ring-offset-background scale-110 z-10"
                        : "hover:scale-105 hover:ring-1 hover:ring-foreground/30"
                    }`}
                    onClick={() => setSelected(k)}
                    title={`${day} ${HOURS[hour]}: DI = ${di.toFixed(2)}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Slider for selected cell */}
      {selected && (
        <div className="border rounded-xl p-5 space-y-4 bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              {DAYS[DAY_KEYS.indexOf(selected.split("_")[0])]} at{" "}
              {HOURS[parseInt(selected.split("_")[1])]}
            </p>
            <Badge variant="outline" className="font-mono tabular-nums">
              DI: {(values[selected] ?? 0.5).toFixed(2)}
            </Badge>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.05}
            value={[values[selected] ?? 0.5]}
            onValueChange={(val) => {
              const nextValue = typeof val === "number" ? val : val[0];
              setValues((prev) => ({ ...prev, [selected]: nextValue ?? 0.5 }));
            }}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0 = Dead hour (max discount)</span>
            <span>1 = Peak demand (no discount)</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs items-center">
        {[
          { color: "bg-chart-2", label: "Peak (≥ 0.8)" },
          { color: "bg-chart-5", label: "Medium (≥ 0.5)" },
          { color: "bg-primary/70", label: "Low (≥ 0.2)" },
          { color: "bg-destructive/70", label: "Dead (< 0.2)" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 ${color} rounded inline-block`} />
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      <Button
        onClick={() => onSave(values)}
        disabled={saving}
        className="rounded-xl font-bold shadow-sm"
      >
        <FloppyDisk weight="bold" className="w-4 h-4 mr-2" />
        {saving ? "Saving..." : "Save Heat Map"}
      </Button>
    </div>
  );
}
