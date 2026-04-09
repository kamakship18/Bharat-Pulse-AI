"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Play, Zap, Sparkles } from "lucide-react";
import { OrbitVisualization } from "./OrbitVisualization";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-20 sm:px-6 sm:pt-28 lg:pt-32">
      {/* ── Animated gradient blobs — dreamy pastel ── */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        {/* Rose-pink blob — top left */}
        <motion.div
          className="absolute -left-32 -top-20 h-[550px] w-[550px] rounded-full opacity-60"
          style={{
            background:
              "radial-gradient(circle, oklch(0.88 0.12 350 / 0.65) 0%, oklch(0.92 0.08 340 / 0.25) 45%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.1, 1], x: [0, 35, 0], opacity: [0.5, 0.7, 0.5] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Warm peach/saffron blob — top right */}
        <motion.div
          className="absolute -right-20 -top-10 h-[500px] w-[500px] rounded-full opacity-55"
          style={{
            background:
              "radial-gradient(circle, oklch(0.90 0.11 50 / 0.55) 0%, oklch(0.94 0.07 40 / 0.2) 45%, transparent 70%)",
          }}
          animate={{ scale: [1.05, 1, 1.05], y: [0, 30, 0], opacity: [0.45, 0.65, 0.45] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Lavender blob — center */}
        <motion.div
          className="absolute left-1/3 top-1/4 h-[450px] w-[450px] rounded-full opacity-40"
          style={{
            background:
              "radial-gradient(circle, oklch(0.86 0.09 290 / 0.45) 0%, oklch(0.92 0.05 280 / 0.15) 50%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.08, 1], x: [-20, 20, -20] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Soft sky-blue blob — bottom right */}
        <motion.div
          className="absolute -bottom-24 right-1/4 h-[400px] w-[400px] rounded-full opacity-35"
          style={{
            background:
              "radial-gradient(circle, oklch(0.90 0.07 230 / 0.40) 0%, transparent 60%)",
          }}
          animate={{ scale: [1.03, 0.97, 1.03], x: [10, -10, 10] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Radial vignette — warm tinted */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_oklch(0.985_0.008_340_/_0.8)_70%)]" />
      </div>

      {/* ── HERO CONTENT — 2 column split ── */}
      <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-8 lg:flex-row lg:items-center lg:gap-4">

        {/* ── LEFT COLUMN: Text + CTA ── */}
        <div className="flex-1 text-center lg:text-left">
          {/* Badge */}
          <motion.p
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 px-4 py-1.5 text-xs font-semibold text-primary shadow-md backdrop-blur-md"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.5 }}
          >
            <Sparkles className="size-3.5" />
            AI Decision Layer for Indian MSMEs
          </motion.p>

          {/* Heading */}
          <motion.h1
            className="text-glow font-heading text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-[3.5rem] xl:text-6xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            Stop Losing Money{" "}
            <span className="bg-gradient-to-r from-primary via-violet-600 to-primary bg-clip-text text-transparent">
              Silently.
            </span>
            <br />
            <span className="relative mt-2 inline-block">
              <span className="relative z-10">Start Making Smarter Decisions.</span>
              <motion.span
                className="absolute -bottom-2 left-0 right-0 z-0 h-4 origin-left rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, oklch(0.85 0.12 55 / 0.7), oklch(0.80 0.08 55 / 0.3))",
                }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.7, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl lg:mx-0"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            Turn your Google Sheets into an{" "}
            <span className="font-semibold text-foreground">AI-powered business advisor</span> —
            alerts, forecasts, and branch-level clarity without a heavy ERP.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row lg:justify-start sm:gap-5"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <Link
              href="/onboarding"
              className={cn(
                buttonVariants({ size: "lg" }),
                "btn-glow h-13 min-w-[180px] rounded-full px-10 text-base font-semibold shadow-lg"
              )}
            >
              <Zap className="mr-2 size-4" />
              Get Started Free
            </Link>
            <a
              href="#demo"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-13 min-w-[180px] rounded-full border-border/80 bg-white/80 px-10 text-base font-medium backdrop-blur-md transition-all hover:bg-white hover:shadow-lg"
              )}
            >
              <Play className="mr-2 size-4 fill-primary/20 text-primary" />
              Watch Demo
            </a>
          </motion.div>

          {/* Social proof micro-stats */}
          <motion.div
            className="mt-10 flex items-center justify-center gap-8 lg:justify-start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.6 }}
          >
            {[
              { value: "500+", label: "Businesses" },
              { value: "₹2.1 Cr", label: "Saved" },
              { value: "99.5%", label: "Uptime" },
            ].map((stat) => (
              <div key={stat.label} className="text-center lg:text-left">
                <p className="text-lg font-extrabold text-foreground sm:text-xl">{stat.value}</p>
                <p className="text-[11px] font-medium text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ── RIGHT COLUMN: Orbit Visualization ── */}
        <motion.div
          className="relative flex flex-1 items-center justify-center lg:justify-end"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Ambient glow behind the whole orbit — warm pastel */}
          <div
            className="pointer-events-none absolute h-[450px] w-[450px] rounded-full opacity-25"
            style={{
              background:
                "radial-gradient(circle, oklch(0.88 0.10 350 / 0.35) 0%, oklch(0.90 0.06 290 / 0.15) 40%, transparent 65%)",
            }}
          />
          <OrbitVisualization className="relative z-10 w-[340px] sm:w-[420px] lg:w-[480px] xl:w-[520px]" />
        </motion.div>
      </div>
    </section>
  );
}
