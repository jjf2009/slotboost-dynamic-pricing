import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { User, Briefcase, Lightning } from "@phosphor-icons/react/dist/ssr";
import { FlashDealToggle } from "@/components/flash-deal-toggle";
import { ClientSlotList } from "./slot-list";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProfessionalPage({ params }: Props) {
  const { id } = await params;

  // Fetch professional with their upcoming available slots
  const pro = await prisma.professional.findUnique({
    where: { id },
    include: {
      slots: {
        where: {
          status: "available",
          start_time: {
            gt: new Date(),
          },
        },
        orderBy: {
          start_time: "asc",
        },
      },
    },
  });

  if (!pro) {
    notFound();
  }

  // Format slots to match SlotCard expected structure
  const formattedSlots = pro.slots.map((slot) => ({
    ...slot,
    start_time: slot.start_time.toISOString(),
    d_cancel_expires_at: slot.d_cancel_expires_at?.toISOString(),
    professionals: {
      name: pro.name,
      base_price: pro.base_price,
      d_max: pro.d_max,
    },
  }));

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background">
        {/* Header section */}
        <div className="bg-muted/30 border-b border-border/50">
          <div className="max-w-6xl mx-auto px-6 py-16">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
              <div className="space-y-4">
                <Badge variant="secondary" className="px-3 py-1 font-medium text-xs rounded-full">
                  <Briefcase weight="fill" className="w-3.5 h-3.5 mr-1.5" />
                  {pro.service_type || "Professional Services"}
                </Badge>
                
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                  {pro.name}
                </h1>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <User weight="bold" className="w-4 h-4" />
                    Base Rate: ₹{pro.base_price}/session
                  </span>
                </div>
              </div>

              <div className="flex-shrink-0 bg-background border border-border/50 rounded-2xl p-6 shadow-sm max-w-sm w-full">
                <div className="flex items-start gap-4 mb-4">
                  <div className="bg-primary/10 p-3 rounded-xl">
                    <Lightning weight="fill" className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Flash Deals</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                      Opt-in to receive instant SMS or WhatsApp alerts when {pro.name} discounts their last-minute slots.
                    </p>
                  </div>
                </div>
                <FlashDealToggle professionalId={pro.id} />
              </div>
            </div>
          </div>
        </div>

        {/* Slots section */}
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Available Slots</h2>
            <Badge variant="outline" className="font-medium">
              {formattedSlots.length} upcoming
            </Badge>
          </div>
          
          <ClientSlotList slots={formattedSlots} />
        </div>
      </div>
    </>
  );
}
