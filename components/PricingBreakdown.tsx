import { PricingResult } from "@/lib/pricing";
import { Clock, ChartLineDown, Bell, Gauge } from "@phosphor-icons/react";

interface PricingBreakdownProps {
  result: PricingResult;
  basePrice: number;
}

export function PricingBreakdown({ result, basePrice }: PricingBreakdownProps) {
  const discount = Math.round(result.dTotal * 100);

  if (discount === 0) return null;

  const items = [
    {
      label: "Lead-Time Discount",
      value: result.dLead,
      icon: Clock,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Off-Peak Discount",
      value: result.dPeak,
      icon: ChartLineDown,
      color: "text-chart-2",
      bg: "bg-chart-2/10",
    },
    {
      label: "Cancellation Discount",
      value: result.dCancel,
      icon: Bell,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Gauge weight="bold" className="w-4 h-4" />
        Price Breakdown
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.label}
            className={`flex items-center justify-between ${item.bg} px-3 py-2 rounded-lg`}
          >
            <div className="flex items-center gap-2 text-sm">
              <item.icon weight="bold" className={`w-4 h-4 ${item.color}`} />
              <span className="text-foreground">{item.label}</span>
            </div>
            <span className={`text-sm font-bold ${item.color}`}>
              −{Math.round(item.value * 100)}%
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <span className="text-sm text-muted-foreground">
          Total Discount (capped at D_max)
        </span>
        <span className="text-sm font-bold text-foreground">
          −{discount}% = ₹{result.currentPrice}
        </span>
      </div>
    </div>
  );
}
