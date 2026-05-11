"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Lightning, List, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How It Works" },
    { href: "#pricing", label: "Pricing" },
  ];

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl z-50">
      <nav
        className={`
          rounded-2xl px-5 py-3 flex items-center justify-between
          transition-all duration-500
          ${
            scrolled
              ? "glass border border-border/60 shadow-lg"
              : "bg-transparent"
          }
        `}
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group transition-transform hover:scale-[1.02] active:scale-95"
        >
          <div className="bg-primary p-1.5 rounded-xl transition-shadow group-hover:glow-brand">
            <Lightning weight="fill" className="text-primary-foreground w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            Slot<span className="text-gradient">Boost</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-muted-foreground hover:text-foreground font-medium text-sm transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="font-semibold">
              Sign in
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="font-semibold rounded-xl shadow-md hover:shadow-lg transition-shadow">
              Get Started
            </Button>
          </Link>
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="rounded-xl" />}>
              <List size={22} weight="bold" />
            </SheetTrigger>
            <SheetContent side="right" className="rounded-l-3xl w-[300px]">
              <SheetHeader className="pb-6 border-b">
                <SheetTitle className="flex items-center gap-2">
                  <div className="bg-primary p-1.5 rounded-xl">
                    <Lightning weight="fill" className="text-primary-foreground w-4 h-4" />
                  </div>
                  Slot<span className="text-gradient">Boost</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-2 mt-6">
                {navLinks.map((link) => (
                  <SheetClose 
                    key={link.label} 
                    render={
                      <a
                        href={link.href}
                        className="text-base font-medium text-muted-foreground hover:text-foreground px-3 py-2.5 rounded-xl hover:bg-accent transition-colors"
                      />
                    }
                  >
                    {link.label}
                  </SheetClose>
                ))}
                <hr className="my-3 border-border" />
                <SheetClose render={
                  <Link
                    href="/login"
                    className="text-base font-semibold text-foreground px-3 py-2.5 rounded-xl hover:bg-accent transition-colors"
                  />
                }>
                  Sign in
                </SheetClose>
                <SheetClose render={
                  <Link
                    href="/register"
                    className="bg-primary text-primary-foreground px-5 py-3 rounded-xl text-center font-bold shadow-lg"
                  />
                }>
                  Get Started
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}