import { getUserFromRequest } from "@/lib/getUser";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Lightning } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userPayload = await getUserFromRequest();

  if (!userPayload) {
    redirect("/login");
  }

  // Get client profile using Prisma
  const client = await prisma.client.findUnique({
    where: { userId: userPayload.userId },
  });

  if (!client) {
    redirect("/login");
  }

  const navItems = [
    { href: "/client/dashboard", label: "Dashboard" },
    { href: "/client/browse", label: "Browse" },
    { href: "/client/bookings", label: "My Bookings" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-6">
          <Link href="/client/dashboard" className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-xl">
              <Lightning weight="fill" className="text-primary-foreground w-4 h-4" />
            </div>
            <span className="font-bold tracking-tight text-lg">
              Slot<span className="text-gradient">Boost</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {client.name}
            </span>
            <form
              action={async () => {
                "use server";
                const { cookies } = await import("next/headers");
                (await cookies()).delete("token");
                redirect("/login");
              }}
            >
              <button
                type="submit"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
