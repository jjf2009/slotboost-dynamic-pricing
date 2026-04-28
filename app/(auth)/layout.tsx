import { Lightning } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/90 via-primary to-chart-4/80 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <Link href="/" className="flex items-center gap-3 mb-12">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
              <Lightning weight="fill" className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">SlotBoost</span>
          </Link>
          <h2 className="text-4xl font-bold leading-tight mb-6">
            Fill every slot.
            <br />
            Maximize every hour.
          </h2>
          <p className="text-white/80 text-lg leading-relaxed max-w-md">
            Join thousands of service professionals using dynamic pricing to turn
            empty appointments into revenue.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link
            href="/"
            className="flex lg:hidden items-center gap-2 mb-10"
          >
            <div className="bg-primary p-1.5 rounded-xl">
              <Lightning weight="fill" className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Slot<span className="text-gradient">Boost</span>
            </span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
