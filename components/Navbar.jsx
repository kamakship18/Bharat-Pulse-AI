"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";

const links = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it Works" },
  { href: "#demo", label: "Demo" },
  { href: "#contact", label: "Contact" },
];

export function Navbar() {
  return (
    <motion.header
      className="sticky top-0 z-50 border-b border-white/30 glass-strong"
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-indigo-600 to-violet-700 text-sm font-bold text-white shadow-md transition-transform duration-200 group-hover:scale-105">
            BP
          </span>
          <span className="font-heading text-lg font-bold tracking-tight text-foreground">
            BharatPulse
          </span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="relative text-sm font-medium text-muted-foreground transition-colors hover:text-foreground after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:rounded-full after:bg-primary after:transition-all after:duration-300 hover:after:w-full"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/onboarding"
            className={cn(
              buttonVariants({ size: "lg" }),
              "btn-glow rounded-full px-6 font-semibold shadow-md"
            )}
          >
            <Zap className="mr-1.5 size-3.5" />
            Get Started
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
