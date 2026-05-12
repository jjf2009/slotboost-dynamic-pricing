"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Spinner } from "@phosphor-icons/react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"professional" | "client">("professional");
  const [serviceType, setServiceType] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
          role,
          serviceType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      toast.success("Account created! Welcome to SlotBoost.");
      router.push(role === "professional" ? "/professional/dashboard" : "/");
      router.refresh();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Create your account</h1>
      <p className="text-muted-foreground mb-8">
        Start filling slots and boosting revenue today.
      </p>

      <form onSubmit={handleRegister} className="space-y-5">
        {/* Role toggle */}
        <div className="flex bg-muted rounded-xl p-1 gap-1">
          {(["professional", "client"] as const).map((r) => (
            <button
              key={r}
              type="button"
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                role === r
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setRole(r)}
            >
              {r === "professional" ? "Professional" : "Client"}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="reg-name">Full Name</Label>
          <Input
            id="reg-name"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-12 rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reg-email">Email</Label>
          <Input
            id="reg-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reg-phone">Phone</Label>
          <Input
            id="reg-phone"
            type="tel"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="h-12 rounded-xl"
          />
        </div>

        {role === "professional" && (
          <div className="space-y-2">
            <Label htmlFor="reg-service">Service Type</Label>
            <Input
              id="reg-service"
              placeholder="e.g. Dentist, Salon, Physiotherapy"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="reg-password">Password</Label>
          <Input
            id="reg-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="h-12 rounded-xl"
          />
        </div>

        <Button
          type="submit"
          className="w-full h-12 rounded-xl font-bold text-base shadow-md"
          disabled={loading}
        >
          {loading ? (
            <Spinner className="w-5 h-5 animate-spin" />
          ) : (
            "Create Account"
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-8">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-primary font-semibold hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}