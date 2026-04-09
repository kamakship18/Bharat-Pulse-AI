"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { StepForm } from "@/components/StepForm";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sparkles, Shield, Zap, Globe } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen page-gradient">
      {/* Header */}
      <header className="border-b border-white/30 glass-strong">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandLogo size="sm" />
            <span className="font-heading font-bold">BharatPulse</span>
          </Link>
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-muted-foreground"
            )}
          >
            Home
          </Link>
        </div>
      </header>

      {/* Split layout */}
      <div className="mx-auto grid min-h-[calc(100vh-56px)] max-w-7xl lg:grid-cols-[1fr_1.15fr]">
        {/* LEFT — Decorative panel */}
        <div className="relative hidden overflow-hidden lg:block">
          {/* Gradient background — warm dreamy */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-rose-500" />

          {/* Animated decorative elements — pastel */}
          <motion.div
            className="absolute -left-20 top-20 h-[300px] w-[300px] rounded-full opacity-25"
            style={{ background: "radial-gradient(circle, oklch(0.90 0.10 50) 0%, transparent 70%)" }}
            animate={{ scale: [1, 1.15, 1], x: [0, 20, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-16 -right-16 h-[250px] w-[250px] rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, oklch(0.88 0.12 350) 0%, transparent 70%)" }}
            animate={{ scale: [1.1, 1, 1.1], y: [0, -15, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Glass panel content */}
          <div className="relative flex h-full flex-col justify-center px-10 py-16 xl:px-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm">
                <Sparkles className="size-3.5" />
                AI-Powered Setup
              </span>

              <h1 className="mt-6 font-heading text-4xl font-extrabold leading-tight tracking-tight text-white xl:text-5xl">
                Let&apos;s set up your{" "}
                <span className="bg-gradient-to-r from-amber-200 to-orange-200 bg-clip-text text-transparent">
                  AI workspace
                </span>
              </h1>

              <p className="mt-4 max-w-md text-lg leading-relaxed text-white/70">
                Tell us about your business — BharatPulse will tailor insights, alerts, and
                forecasts just for you.
              </p>

              {/* Feature highlights */}
              <div className="mt-10 space-y-4">
                {[
                  { icon: Zap, text: "Setup in under 2 minutes" },
                  { icon: Shield, text: "Your data stays private & secure" },
                  { icon: Globe, text: "Works for any Indian business type" },
                ].map((f) => (
                  <motion.div
                    key={f.text}
                    className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6, duration: 0.4 }}
                  >
                    <f.icon className="size-5 text-amber-300" strokeWidth={1.75} />
                    <span className="text-sm font-medium text-white/90">{f.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* RIGHT — Form panel */}
        <div className="flex items-start justify-center px-4 py-10 sm:px-8 lg:items-center lg:py-16">
          <div className="w-full max-w-lg">
            {/* Mobile-only heading */}
            <div className="mb-8 text-center lg:hidden">
              <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
                Welcome — let&apos;s set up your workspace
              </h1>
              <p className="mt-2 text-muted-foreground">
                Tell us about your business. You can change this later.
              </p>
            </div>
            <StepForm />
          </div>
        </div>
      </div>
    </div>
  );
}
