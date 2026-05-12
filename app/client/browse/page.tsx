import { redirect } from "next/navigation";
import { getUserFromRequest } from "@/lib/getUser";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { ProfessionalCard } from "@/components/ProfessionalCard";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";

export default async function BrowsePage() {
  const userPayload = await getUserFromRequest();
  if (!userPayload) redirect("/login");

  const professionals = await prisma.professional.findMany({
    select: {
      id: true,
      name: true,
      service_type: true,
      base_price: true,
      is_mobile: true,
      _count: {
        select: {
          slots: {
            where: {
              status: "available",
              start_time: { gt: new Date() },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Extract unique service types for display
  const serviceTypes = [
    ...new Set(
      professionals
        .map((p) => p.service_type)
        .filter((s): s is string => !!s)
    ),
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Browse Professionals</h1>
        <p className="text-muted-foreground mt-1">
          Find service professionals with live dynamic pricing on their slots.
        </p>
      </div>

      {/* Service type filter badges */}
      {serviceTypes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="px-3 py-1.5 rounded-full text-sm font-medium">
            All
          </Badge>
          {serviceTypes.map((type) => (
            <Badge
              key={type}
              variant="outline"
              className="px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer hover:bg-accent transition-colors"
            >
              {type}
            </Badge>
          ))}
        </div>
      )}

      {/* Professional cards grid */}
      {professionals.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <MagnifyingGlass weight="duotone" className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No professionals found</p>
          <p className="text-sm mt-1">Check back later for available service professionals.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {professionals.map((pro) => (
            <ProfessionalCard
              key={pro.id}
              id={pro.id}
              name={pro.name}
              serviceType={pro.service_type}
              basePrice={pro.base_price}
              availableSlots={pro._count.slots}
              isMobile={pro.is_mobile}
            />
          ))}
        </div>
      )}
    </div>
  );
}
