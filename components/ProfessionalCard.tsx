import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Lightning,
  MapPin,
} from "@phosphor-icons/react/dist/ssr";

interface ProfessionalCardProps {
  id: string;
  name: string;
  serviceType: string | null;
  basePrice: number;
  availableSlots: number;
  isMobile: boolean;
}

export function ProfessionalCard({
  id,
  name,
  serviceType,
  basePrice,
  availableSlots,
  isMobile,
}: ProfessionalCardProps) {
  return (
    <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50">
      <CardContent className="pt-6 pb-5 px-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/60 to-chart-4/60 flex items-center justify-center text-base font-bold text-primary-foreground">
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">{name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                {serviceType && (
                  <Badge variant="secondary" className="text-xs">
                    {serviceType}
                  </Badge>
                )}
                {isMobile && (
                  <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                    <MapPin weight="fill" className="w-3 h-3" />
                    Mobile
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm text-muted-foreground">Base Price</p>
            <p className="text-xl font-bold">₹{basePrice}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Available</p>
            <div className="flex items-center gap-1.5">
              {availableSlots > 0 ? (
                <>
                  <Lightning weight="fill" className="w-4 h-4 text-primary" />
                  <span className="text-xl font-bold">{availableSlots}</span>
                  <span className="text-sm text-muted-foreground">slots</span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground font-medium">
                  No slots right now
                </span>
              )}
            </div>
          </div>
        </div>

        {/* CTA */}
        <Link href={`/client/professionals/${id}`}>
          <Button
            variant={availableSlots > 0 ? "default" : "outline"}
            className="w-full rounded-xl font-semibold gap-2 transition-transform group-hover:scale-[1.02]"
          >
            View Slots
            <ArrowRight weight="bold" className="w-4 h-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
