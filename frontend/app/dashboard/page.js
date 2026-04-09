"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartCard } from "@/components/ChartCard";
import { AlertCard } from "@/components/AlertCard";
import { RecommendationCard } from "@/components/RecommendationCard";
import { ProfilePanel } from "@/components/ProfilePanel";
import { UploadModal } from "@/components/UploadModal";
import {
  salesTrend,
  stockByBranch,
  categoryBreakdown,
  demoAlerts,
  demoRecommendations,
  STORAGE_KEY,
} from "@/lib/mock-data";
import {
  FileSpreadsheet,
  ImageIcon,
  LayoutDashboard,
  Sparkles,
  Zap,
  Upload,
  Brain,
  ArrowRight,
  Database,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const defaultProfile = {
  businessName: "Your business",
  location: "India",
  businessType: "MSME",
  features: {
    expiry: true,
    stock: true,
    demand: true,
    whatsapp: false,
    ocr: true,
    multi: true,
  },
};

export default function DashboardPage() {
  const [hasData, setHasData] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [profile, setProfile] = useState(defaultProfile);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      setProfile({
        businessName: data.businessName || defaultProfile.businessName,
        location: data.location || defaultProfile.location,
        businessType: data.businessType || defaultProfile.businessType,
        features: { ...defaultProfile.features, ...(data.features || {}) },
      });
    } catch {
      /* ignore */
    }
  }, []);

  const charts = useMemo(
    () => (
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Sales trend"
          description="Last 6 months (demo)"
          type="line"
          data={salesTrend}
        />
        <ChartCard
          title="Stock by branch"
          description="Units on hand"
          type="bar"
          data={stockByBranch}
        />
        <div className="lg:col-span-2">
          <ChartCard
            title="Category mix"
            description="Share of assortment"
            type="pie"
            data={categoryBreakdown}
            dataKey="value"
            xKey="name"
          />
        </div>
      </div>
    ),
    []
  );

  return (
    <div className="min-h-screen page-gradient">
      {/* Dashboard Header */}
      <header className="sticky top-0 z-40 border-b border-white/30 glass-strong">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex shrink-0 items-center">
              <BrandLogo size="md" />
            </Link>
            <div>
              <h1 className="font-heading text-lg font-bold leading-none">
                Dashboard
              </h1>
              <p className="text-xs text-muted-foreground">BharatPulse AI</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link href="/manage-data">
              <Button
                type="button"
                variant="outline"
                className="rounded-full bg-white/70 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:shadow-md"
              >
                <Database className="mr-2 size-4" />
                Manage Data
              </Button>
            </Link>
            <Button
              type="button"
              variant="outline"
              className="rounded-full bg-white/70 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:shadow-md"
              onClick={() => setModalOpen(true)}
            >
              <FileSpreadsheet className="mr-2 size-4" />
              Upload Data
            </Button>
            <Button
              type="button"
              className="btn-glow rounded-full shadow-md"
              onClick={() => setModalOpen(true)}
            >
              <ImageIcon className="mr-2 size-4" />
              Upload Images
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[1fr_320px] lg:items-start lg:px-6">
        <motion.div
          className="min-w-0 space-y-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {/* ─── Personalized Greeting ─── */}
          <motion.div
            className="flex flex-wrap items-center justify-between gap-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <div>
              <h2 className="font-heading text-3xl font-extrabold tracking-tight">
                Welcome back, {profile.businessName} 👋
              </h2>
              <div className="mt-2 flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary/10 to-violet-500/10 px-3 py-1 text-xs font-bold text-primary">
                  {profile.businessType}
                </span>
                <span className="text-sm text-muted-foreground">{profile.location}</span>
              </div>
            </div>

            {/* AI Status Indicator */}
            {hasData && (
              <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-2 shadow-sm">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                </span>
                <span className="text-xs font-semibold text-emerald-700">
                  AI analyzing
                  <span className="dot-blink-1"> .</span>
                  <span className="dot-blink-2">.</span>
                  <span className="dot-blink-3">.</span>
                </span>
              </div>
            )}
          </motion.div>

          {!hasData ? (
            /* ─── Empty State ─── */
            <Card className="relative overflow-hidden rounded-3xl border-2 border-dashed border-primary/20 bg-white/60 py-20 shadow-lg backdrop-blur-md">
              {/* Decorative blobs */}
              <div className="pointer-events-none absolute -left-16 -top-16 h-[200px] w-[200px] rounded-full bg-primary/5 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-16 -right-16 h-[200px] w-[200px] rounded-full bg-violet-500/5 blur-3xl" />

              <CardContent className="relative flex flex-col items-center text-center">
                <motion.span
                  className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/15 to-violet-500/15 text-primary shadow-sm"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <LayoutDashboard className="size-12" strokeWidth={1.25} />
                </motion.span>
                <CardTitle className="mt-8 text-2xl font-extrabold">
                  No data uploaded yet
                </CardTitle>
                <p className="mt-3 max-w-md text-base text-muted-foreground">
                  Connect a sheet or drop ledger images — we&apos;ll populate alerts,
                  charts, and AI recommendations instantly.
                </p>
                <div className="mt-10 flex flex-wrap justify-center gap-4">
                  <Button
                    type="button"
                    className="btn-glow rounded-full px-8 py-3 text-base font-semibold shadow-lg"
                    onClick={() => setModalOpen(true)}
                  >
                    <Sparkles className="mr-2 size-4" />
                    Upload to see insights
                  </Button>
                  <Link
                    href="/onboarding"
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "rounded-full bg-white/70 px-6 backdrop-blur-sm transition-all hover:bg-white hover:shadow-md"
                    )}
                  >
                    Review onboarding
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* ─── ALERTS + RECOMMENDATIONS (TOP — most important) ─── */}
              <motion.div
                className="grid gap-6 lg:grid-cols-2"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
              >
                <AlertCard title="Alerts" items={demoAlerts} />
                <RecommendationCard title="Recommendations" items={demoRecommendations} />
              </motion.div>

              {/* ─── AI Insight Banner ─── */}
              <motion.div
                className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-50 via-violet-50 to-purple-50 border border-primary/10 px-5 py-4 shadow-sm"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4 }}
              >
                <Brain className="size-5 text-primary animate-ai-pulse" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-primary">AI Insight</p>
                  <p className="text-xs text-muted-foreground">
                    Wedding season detected in your region — sweets & dry fruits demand trending +28%. Consider stocking up.
                  </p>
                </div>
                <Button variant="outline" size="sm" className="rounded-full text-xs bg-white/80 hover:bg-white">
                  View Details
                </Button>
              </motion.div>

              {/* ─── Charts ─── */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                {charts}
              </motion.div>
            </>
          )}
        </motion.div>

        <ProfilePanel
          businessName={profile.businessName}
          location={profile.location}
          businessType={profile.businessType}
          features={profile.features}
          className="hidden lg:block"
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-10 lg:hidden lg:px-6">
        <ProfilePanel
          businessName={profile.businessName}
          location={profile.location}
          businessType={profile.businessType}
          features={profile.features}
        />
      </div>

      <UploadModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onComplete={() => {
          setHasData(true);
          setModalOpen(false);
        }}
      />
    </div>
  );
}
