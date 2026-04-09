"use client";

import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Footer } from "@/components/Footer";
import { FeatureCard } from "@/components/FeatureCard";
import { AnimatedSection, StaggerContainer, StaggerItem } from "@/components/AnimatedSection";
import { CountUp } from "@/components/CountUp";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FileSpreadsheet,
  TrendingDown,
  Package,
  Upload,
  Cpu,
  Sparkles,
  Bell,
  Lightbulb,
  GitBranch,
  ScanLine,
  Mic,
  ArrowRight,
  Zap,
  ThermometerSun,
  Pill,
  Cake,
  Store,
} from "lucide-react";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1 page-gradient">
        <Hero />

        {/* ─── PROBLEM SECTION ─── */}
        <AnimatedSection className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6" id="problem">
          {/* Radial glow behind section */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full opacity-40 blur-3xl" style={{ background: 'radial-gradient(circle, oklch(0.90 0.09 350 / 0.5), oklch(0.92 0.06 290 / 0.2), transparent)' }} />
          </div>

          <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-primary">
            The problem
          </p>
          <h2 className="mt-3 text-center font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">
            Silent leakage{" "}
            <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">adds up</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-muted-foreground">
            Static sheets don&apos;t warn you before money walks out the door.
          </p>

          <StaggerContainer className="mt-14 grid gap-8 md:grid-cols-3">
            <StaggerItem>
              <FeatureCard
                icon={FileSpreadsheet}
                title="Data stays static"
                description="Registers and Sheets hold numbers — not foresight. No signal when SKUs turn into losses."
                index={0}
              />
            </StaggerItem>
            <StaggerItem>
              <FeatureCard
                icon={TrendingDown}
                title="No proactive insight"
                description="Expiry, stock-outs, and branch imbalance stay invisible until margin is already gone."
                index={1}
              />
            </StaggerItem>
            <StaggerItem>
              <FeatureCard
                icon={Package}
                title="Inventory and timing risk"
                description="Overstock ties cash; understock kills sales — especially around weather, events, and seasons."
                index={2}
              />
            </StaggerItem>
          </StaggerContainer>
        </AnimatedSection>

        {/* ─── HOW IT WORKS — VISUAL FLOW ─── */}
        <AnimatedSection
          className="relative overflow-hidden py-24"
          id="how"
        >
          {/* Section background — warm pastel wash */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-b from-rose-50/40 via-white/80 to-violet-50/30" />
            <div className="absolute left-1/4 top-1/3 h-[300px] w-[300px] rounded-full opacity-30 blur-3xl" style={{ background: 'radial-gradient(circle, oklch(0.90 0.10 50 / 0.5), transparent)' }} />
            <div className="absolute right-1/4 bottom-1/4 h-[280px] w-[280px] rounded-full opacity-25 blur-3xl" style={{ background: 'radial-gradient(circle, oklch(0.88 0.08 290 / 0.4), transparent)' }} />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-primary">
              How BharatPulse helps
            </p>
            <h2 className="mt-3 text-center font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">
              From sheet to{" "}
              <span className="bg-gradient-to-r from-primary to-violet-600 bg-clip-text text-transparent">
                decisions
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-muted-foreground">
              Upload once — get an AI layer that watches stock, time, and branches for you.
            </p>

            {/* Steps with connectors */}
            <div className="mt-16 grid gap-6 md:grid-cols-3 md:gap-0">
              {[
                {
                  step: "01",
                  title: "Upload data",
                  body: "Google Sheet, Excel, or a photo of your ledger — we structure it.",
                  icon: Upload,
                  gradient: "from-amber-500 to-orange-600",
                },
                {
                  step: "02",
                  title: "AI processes",
                  body: "Embeddings + signals (weather, events) surface risk & opportunity.",
                  icon: Cpu,
                  gradient: "from-indigo-500 to-violet-600",
                },
                {
                  step: "03",
                  title: "Get insights",
                  body: "Action nudges for expiry, transfers, and demand — per branch.",
                  icon: Sparkles,
                  gradient: "from-emerald-500 to-teal-600",
                },
              ].map((s, i) => (
                <StaggerItem
                  key={s.step}
                  className="relative flex flex-col items-center text-center md:px-6"
                >
                  {/* Connector arrows (between steps) */}
                  {i < 2 && (
                    <div className="pointer-events-none absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 translate-x-1/2 md:block">
                      <div className="flex items-center gap-1">
                        <div className="h-[2px] w-8 bg-gradient-to-r from-primary/40 to-primary/20" />
                        <ArrowRight className="size-4 text-primary/50" />
                      </div>
                    </div>
                  )}

                  {/* Step number */}
                  <span className="text-7xl font-black text-primary/8">{s.step}</span>

                  {/* Icon circle */}
                  <div
                    className={cn(
                      "mt-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg",
                      "transition-transform duration-300 hover:scale-110",
                      s.gradient
                    )}
                  >
                    <s.icon className="size-7" strokeWidth={1.75} />
                  </div>

                  {/* AI processing dots for step 2 */}
                  {i === 1 && (
                    <div className="mt-3 flex gap-1">
                      <span className="dot-blink-1 h-1.5 w-1.5 rounded-full bg-primary/60" />
                      <span className="dot-blink-2 h-1.5 w-1.5 rounded-full bg-primary/60" />
                      <span className="dot-blink-3 h-1.5 w-1.5 rounded-full bg-primary/60" />
                    </div>
                  )}

                  <h3 className="mt-4 font-heading text-xl font-bold">{s.title}</h3>
                  <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-muted-foreground">
                    {s.body}
                  </p>
                </StaggerItem>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* ─── FEATURES SECTION ─── */}
        <AnimatedSection className="mx-auto max-w-6xl px-4 py-24 sm:px-6" id="features">
          <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Features
          </p>
          <h2 className="mt-3 text-center font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">
            Built for{" "}
            <span className="bg-gradient-to-r from-saffron to-india-green bg-clip-text text-transparent">
              real Indian
            </span>{" "}
            operations
          </h2>
          <StaggerContainer className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Bell, title: "Smart alerts", description: "Expiry windows, stock risk, and demand spikes — surfaced before they cost you.", index: 0 },
              { icon: Lightbulb, title: "AI recommendations", description: "Offers, transfers, and buys explained in plain language your staff can act on.", index: 1 },
              { icon: GitBranch, title: "Multi-branch insights", description: "See imbalance across outlets and move stock instead of placing fresh orders.", index: 2 },
              { icon: ScanLine, title: "Image → data (OCR)", description: "Snap a bahi-khata or invoice — structured rows without manual typing.", index: 3 },
              { icon: Mic, title: "Voice input (roadmap)", description: "Regional language voice notes feeding the same decision layer — Bhashini-ready.", index: 4 },
              { icon: Sparkles, title: "Ghost revenue recovery", description: "Quantify profit you were about to lose — the demo judges remember.", index: 5 },
            ].map((f) => (
              <StaggerItem key={f.title}>
                <FeatureCard {...f} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </AnimatedSection>

        {/* ─── REAL SCENARIOS — INDIA STORIES ─── */}
        <AnimatedSection className="relative overflow-hidden py-24" id="scenarios">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50/30 via-rose-50/20 to-violet-50/15" />
            <div className="absolute right-0 top-0 h-[350px] w-[350px] rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, oklch(0.90 0.09 50), transparent)' }} />
          </div>
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Real scenarios
            </p>
            <h2 className="mt-3 text-center font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">
              AI that understands{" "}
              <span className="bg-gradient-to-r from-saffron to-primary bg-clip-text text-transparent">
                Bharat
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-muted-foreground">
              Real examples from Indian businesses — this is what intelligent inventory looks like.
            </p>

            <StaggerContainer className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: ThermometerSun,
                  type: "Kirana Store",
                  scenario: "Summer heatwave incoming in Punjab",
                  insight: "\"Stock up on Cold Drinks and Glucose. Move chocolate to the cooler — it will melt.\"",
                  gradient: "from-orange-500 to-red-500",
                  bg: "from-orange-50/80 to-red-50/40",
                },
                {
                  icon: Pill,
                  type: "Pharmacy",
                  scenario: "₹8,000 worth of syrups expiring in 10 days",
                  insight: "\"Send automated Loyalty Discount to top 10 patients via WhatsApp before write-off.\"",
                  gradient: "from-emerald-500 to-teal-600",
                  bg: "from-emerald-50/80 to-teal-50/40",
                },
                {
                  icon: Cake,
                  type: "Bakery Franchise",
                  scenario: "Branch A has extra bread; Branch B is out",
                  insight: "\"Don't order new. Move 40 units from Branch A to B via the 2 PM van.\"",
                  gradient: "from-violet-500 to-indigo-600",
                  bg: "from-violet-50/80 to-indigo-50/40",
                },
              ].map((s) => (
                <StaggerItem key={s.type}>
                  <div className={cn(
                    "group relative overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br p-7 shadow-lg backdrop-blur-sm",
                    "transition-all duration-300 hover:shadow-2xl hover:-translate-y-1",
                    "gradient-border-top",
                    s.bg
                  )}>
                    <div className={cn(
                      "mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md",
                      "transition-transform duration-300 group-hover:scale-110",
                      s.gradient
                    )}>
                      <s.icon className="size-5" strokeWidth={1.75} />
                    </div>
                    <span className="inline-block rounded-full bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                      {s.type}
                    </span>
                    <h3 className="mt-3 font-heading text-base font-bold leading-snug">
                      {s.scenario}
                    </h3>
                    <p className="mt-3 rounded-xl bg-white/60 px-3 py-2.5 text-sm italic leading-relaxed text-primary/90 backdrop-blur-sm">
                      💡 {s.insight}
                    </p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </AnimatedSection>

        {/* ─── GHOST REVENUE ─── */}
        <AnimatedSection
          className="relative overflow-hidden py-28"
          id="demo"
        >
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-50/40 via-white to-lavender-50/30" />
            <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-3xl" style={{ background: 'radial-gradient(circle, oklch(0.88 0.10 350 / 0.4), oklch(0.90 0.06 290 / 0.15), transparent)' }} />
          </div>
          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Demo highlight
            </p>
            <h2 className="mt-3 font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">
              Ghost revenue{" "}
              <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                recovery
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Not cash you have —{" "}
              <span className="font-semibold text-foreground">loss you avoided</span>{" "}
              because the AI saw demand, expiry, and branch imbalance early.
            </p>

            {/* Big number card */}
            <div className="mt-12 inline-flex flex-col items-center rounded-3xl border border-white/60 bg-white/80 px-12 py-14 shadow-2xl ring-1 ring-primary/10 backdrop-blur-md">
              <div className="relative">
                {/* Glow ring */}
                <div className="absolute inset-0 -z-10 animate-pulse-glow rounded-full bg-primary/15" style={{ margin: "-30px" }} />
                <span className="text-7xl font-black tracking-tight text-primary sm:text-8xl">
                  <CountUp value={22400} prefix="₹" duration={2.4} />
                </span>
              </div>
              <p className="mt-3 text-xl font-bold text-foreground">Found</p>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Example: extra milk before a local mela, clearing expiring stock with a
                targeted offer, shifting fast movers to the right branch.
              </p>
            </div>

            {/* Stats */}
            <StaggerContainer className="mt-14 grid max-w-3xl mx-auto grid-cols-1 gap-6 sm:grid-cols-3">
              {[
                { label: "MSMEs in India", value: 60, suffix: "M+", sub: "Stories we serve" },
                {
                  label: "Annual silent leakage",
                  value: 1.5,
                  suffix: "L Cr",
                  sub: "Why this matters",
                  decimals: 1,
                },
                { label: "Data sources", value: 3, suffix: "+", sub: "Sheets, Excel, images" },
              ].map((stat) => (
                <StaggerItem key={stat.label}>
                  <div className="rounded-2xl border border-white/60 bg-white/70 px-5 py-7 shadow-lg backdrop-blur-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="mt-3 text-4xl font-black text-primary">
                      <CountUp
                        value={stat.value}
                        suffix={stat.suffix}
                        duration={2}
                        decimals={stat.decimals ?? 0}
                      />
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </AnimatedSection>

        {/* ─── CTA SECTION ─── */}
        <AnimatedSection className="mx-auto max-w-6xl px-4 pb-28 pt-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-r from-rose-100/40 via-white/80 to-violet-100/40 px-8 py-20 text-center shadow-xl ring-1 ring-rose-200/30 backdrop-blur-md">
            {/* Decorative blobs — pastel */}
            <div className="pointer-events-none absolute -left-20 -top-20 h-[220px] w-[220px] rounded-full opacity-40 blur-3xl" style={{ background: 'radial-gradient(circle, oklch(0.90 0.10 50), transparent)' }} />
            <div className="pointer-events-none absolute -bottom-20 -right-20 h-[220px] w-[220px] rounded-full opacity-35 blur-3xl" style={{ background: 'radial-gradient(circle, oklch(0.88 0.08 290), transparent)' }} />

            <h2 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
              Start optimizing your business{" "}
              <span className="bg-gradient-to-r from-primary to-violet-600 bg-clip-text text-transparent">today</span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
              Onboard in minutes — connect data when your backend is ready.
            </p>
            <Link
              href="/onboarding"
              className={cn(
                buttonVariants({ size: "lg" }),
                "btn-glow mt-10 inline-flex rounded-full px-12 text-base font-semibold shadow-lg"
              )}
            >
              <Zap className="mr-2 size-4" />
              Get Started Free
            </Link>
          </div>
        </AnimatedSection>
      </main>
      <Footer />
    </>
  );
}
