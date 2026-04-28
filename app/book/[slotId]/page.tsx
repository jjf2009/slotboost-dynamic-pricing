import { createClient } from "@/lib/supabase/server";
import { calculatePrice } from "@/lib/pricing";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { BookingForm } from "@/components/BookingForm";
import { Badge } from "@/components/ui/badge";
import { Lightning, Clock, MapPin } from "@phosphor-icons/react/dist/ssr";

interface Props {
  params: Promise<{ slotId: string }>;
}

export default async function BookingPage({ params }: Props) {
  const { slotId } = await params;
  const supabase = await createClient();

  const { data: slot } = await supabase
    .from("slots")
    .select("*, professionals(*)")
    .eq("id", slotId)
    .single();

  if (!slot || slot.status !== "available") notFound();

  const pro = slot.professionals;
  const result = calculatePrice({
    basePrice: pro.base_price,
    startTime: new Date(slot.start_time),
    demandIndex: slot.demand_index,
    dMax: pro.d_max,
    dCancelActive: slot.d_cancel_active,
    dCancelExpiry: slot.d_cancel_expires_at
      ? new Date(slot.d_cancel_expires_at)
      : undefined,
  });

  const slotTime = format(new Date(slot.start_time), "EEE, dd MMM · h:mm a");
  const discount = Math.round(result.dTotal * 100);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="bg-primary p-1.5 rounded-xl">
              <Lightning weight="fill" className="text-primary-foreground w-4 h-4" />
            </div>
            <span className="font-bold tracking-tight text-lg">
              Slot<span className="text-gradient">Boost</span>
            </span>
          </div>
          {discount > 0 && (
            <Badge className="bg-primary/10 text-primary border-0 font-bold px-4 py-1.5 mb-4">
              ⚡ {discount}% off — Limited Time
            </Badge>
          )}
          <h1 className="text-2xl font-bold tracking-tight mb-2">Book with {pro.name}</h1>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock weight="bold" className="w-4 h-4" />{slotTime}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin weight="bold" className="w-4 h-4" />{slot.duration_mins} min
            </span>
          </div>
        </div>
        <BookingForm
          slotId={slotId}
          pricingResult={result}
          basePrice={pro.base_price}
          professionalName={pro.name}
          slotTime={slotTime}
        />
      </div>
    </div>
  );
}
