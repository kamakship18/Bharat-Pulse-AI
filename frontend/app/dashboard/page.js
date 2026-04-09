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
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { addUpload, getPrediction } from "@/lib/api";
import {
  salesTrend,
  stockByBranch,
  categoryBreakdown,
  demoAlerts,
  demoRecommendations,
  demandTrending,
  branchComparison,
  stockHealth,
  fallbackPrediction,
  STORAGE_KEY,
} from "@/lib/mock-data";
import {
  LayoutDashboard,
  Sparkles,
  Upload,
  Brain,
  ArrowRight,
  Database,
  Plus,
  TrendingUp,
  Package,
  AlertTriangle,
  Clock,
  CheckCircle2,
  MapPin,
  BarChart3,
  ShieldAlert,
  Activity,
  LogOut,
  CloudSun,
  Calendar,
  Zap,
  RefreshCw,
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

/* ─── Stock Health Card ─── */
function StockHealthPanel() {
  const items = [
    { label: "Total Products", value: stockHealth.totalProducts, icon: Package, color: "text-primary", bg: "bg-primary/5" },
    { label: "Expiring Soon", value: stockHealth.expiringItems, icon: Clock, color: "text-red-600", bg: "bg-red-50" },
    { label: "Low Stock", value: stockHealth.lowStockItems, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Healthy", value: stockHealth.healthyItems, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <Card className="overflow-hidden rounded-2xl border-white/50 bg-white/70 shadow-lg backdrop-blur-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <Activity className="size-4 text-primary" />
          Stock Health Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`rounded-xl ${item.bg} p-3.5 transition-all hover:shadow-md`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{item.label}</p>
                    <p className={`mt-1 text-2xl font-extrabold ${item.color}`}>{item.value}</p>
                  </div>
                  <Icon className={`size-5 ${item.color} opacity-60`} />
                </div>
              </div>
            );
          })}
        </div>
        {/* Value bar */}
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-gradient-to-r from-primary/5 to-violet-500/5 px-4 py-3">
          <BarChart3 className="size-4 text-primary" />
          <div>
            <p className="text-xs font-bold text-primary">Total Inventory Value</p>
            <p className="text-lg font-extrabold text-foreground">{stockHealth.totalValue}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs font-bold text-muted-foreground">{stockHealth.totalUnits} units</p>
            <p className="text-[10px] text-muted-foreground">across 3 branches</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Branch Comparison ─── */
function BranchComparisonPanel() {
  const riskColors = {
    red: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200/40" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200/40" },
    green: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200/40" },
  };

  return (
    <Card className="overflow-hidden rounded-2xl border-white/50 bg-white/70 shadow-lg backdrop-blur-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <MapPin className="size-4 text-primary" />
          Branch Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {branchComparison.map((b) => {
          const rc = riskColors[b.riskColor];
          return (
            <div
              key={b.branch}
              className={`rounded-xl border ${rc.border} ${rc.bg}/30 bg-white/70 p-4 transition-all hover:shadow-md hover:-translate-y-0.5`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className={`size-3.5 ${rc.text}`} />
                  <span className="text-sm font-bold">{b.branch}</span>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${rc.bg} ${rc.text}`}>
                  {b.riskScore} Risk
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground">Stock</p>
                  <p className="text-sm font-bold">{b.totalStock}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Expiring</p>
                  <p className={`text-sm font-bold ${b.expiringItems > 0 ? "text-red-600" : "text-emerald-600"}`}>{b.expiringItems}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Revenue</p>
                  <p className="text-sm font-bold text-primary">{b.revenue}</p>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/* ─── Weather & Events Signal Panel ─── */
function SignalsPanel({ signals }) {
  if (!signals) return null;
  const { weather, events } = signals;

  const conditionEmoji = {
    heatwave: "🔥", warm: "☀️", rainy: "🌧️", cold: "❄️",
    humid: "💧", pleasant: "🌤️",
  };

  return (
    <Card className="overflow-hidden rounded-2xl border-white/50 bg-white/70 shadow-lg backdrop-blur-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <Zap className="size-4 text-primary" />
          External Signals (Live)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Weather */}
        <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-blue-50 to-sky-50 p-3.5">
          <CloudSun className="size-5 text-blue-600" />
          <div className="flex-1">
            <p className="text-xs font-bold text-blue-900">Weather</p>
            <p className="text-[10px] text-blue-700/70">{weather?.description || "N/A"}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-extrabold text-blue-700">
              {conditionEmoji[weather?.condition] || "🌡️"} {weather?.temperature || "--"}°C
            </p>
            <p className="text-[10px] font-medium text-blue-600 capitalize">{weather?.condition || "unknown"}</p>
          </div>
        </div>

        {/* Upcoming Events */}
        {events?.festivals?.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              <Calendar className="size-3" /> Upcoming Events
            </p>
            {events.festivals.slice(0, 3).map((f, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2">
                <div>
                  <p className="text-xs font-bold text-amber-900">{f.name}</p>
                  <p className="text-[10px] text-amber-700/70">{f.date}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  f.daysUntil <= 3 ? "bg-red-100 text-red-700" :
                  f.daysUntil <= 7 ? "bg-amber-100 text-amber-700" :
                  "bg-emerald-100 text-emerald-700"
                }`}>
                  {f.daysUntil === 0 ? "Today!" : `${f.daysUntil}d away`}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Active Seasonal */}
        {events?.seasonal?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {events.seasonal.map((s, i) => (
              <span key={i} className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700">
                {s.name} ({s.multiplier}x)
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Predictive Demand Trending ─── */
function PredictiveDemandPanel({ insights }) {
  const items = insights && insights.length > 0 ? insights : demandTrending;

  return (
    <Card className="overflow-hidden rounded-2xl border-white/50 bg-white/70 shadow-lg backdrop-blur-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <TrendingUp className="size-4 text-primary" />
          AI Demand Forecast
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {items.map((item, i) => (
          <motion.div
            key={item.product}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-3 rounded-xl bg-white/60 border border-border/20 px-3.5 py-2.5 transition-all hover:bg-white/90 hover:shadow-sm"
          >
            <span className="text-lg">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">{item.product}</p>
              <p className="text-[10px] text-muted-foreground">{item.reason}</p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600">
              {item.demand || item.demandChange}
            </span>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ─── Main Dashboard ─── */
function DashboardContent() {
  const { user, logout, refreshUser } = useAuth();
  const [hasData, setHasData] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [profile, setProfile] = useState(defaultProfile);
  const [prediction, setPrediction] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);

  useEffect(() => {
    // Populate profile from backend user data first, then fallback to sessionStorage
    if (user?.businessData?.name) {
      setProfile({
        businessName: user.businessData.name || defaultProfile.businessName,
        location: user.businessData.location || defaultProfile.location,
        businessType: user.businessData.type || defaultProfile.businessType,
        features: { ...defaultProfile.features, ...(user.businessData.features || {}) },
      });
      if (user.uploads?.length > 0) {
        setHasData(true);
      }
    } else {
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
    }

    // Check sessionStorage uploads as fallback
    try {
      const uploads = sessionStorage.getItem("bharat-pulse-uploads");
      if (uploads && JSON.parse(uploads).length > 0) {
        setHasData(true);
      }
    } catch {}
  }, [user]);

  // ── Fetch Predictive Intelligence ─────────────────────────────────────────
  const fetchPredictions = async (loc) => {
    setPredictionLoading(true);
    try {
      const data = await getPrediction(loc || profile.location || "Chandigarh");
      if (data && data.success !== false) {
        setPrediction(data);
      }
    } catch (err) {
      console.warn("[Dashboard] Prediction API unavailable:", err.message);
      setPrediction(fallbackPrediction);
    } finally {
      setPredictionLoading(false);
    }
  };

  useEffect(() => {
    if (hasData) {
      fetchPredictions(profile.location);
    }
  }, [hasData, profile.location]);

  // Derive alerts / recommendations from prediction or fallback
  const liveAlerts = prediction?.alerts?.map((a, i) => ({
    id: a.id || `pa_${i}`,
    title: a.title,
    detail: a.detail,
    severity: a.severity,
  })) || demoAlerts;

  const liveRecommendations = prediction?.recommendations?.map((r, i) => ({
    id: r.id || `pr_${i}`,
    title: r.title,
    detail: r.detail,
    impact: r.impact || "Medium",
  })) || demoRecommendations;

  const liveDemandInsights = prediction?.demandInsights || [];

  const topInsight = prediction?.summary
    ? `${prediction.signals?.weather?.condition === "heatwave" ? "Heatwave" : prediction.signals?.weather?.condition || "Weather"} detected (${prediction.signals?.weather?.temperature || "--"}°C) — ${prediction.summary.totalAlerts} alerts, ${prediction.summary.totalRecommendations} recommendations generated.`
    : "Wedding season detected in your region — sweets & dry fruits demand trending +28%. Consider stocking up.";

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
          description="Units on hand (with risk)"
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
              className="btn-glow rounded-full shadow-md"
              onClick={() => setModalOpen(true)}
            >
              <Plus className="mr-2 size-4" />
              Add Data
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full text-muted-foreground hover:text-red-600 hover:bg-red-50"
              onClick={logout}
              title="Logout"
            >
              <LogOut className="size-4" />
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
                  Connect a Google Sheet, upload images, or capture your ledger — we&apos;ll populate alerts,
                  charts, and AI recommendations instantly.
                </p>
                <div className="mt-10 flex flex-wrap justify-center gap-4">
                  <Button
                    type="button"
                    className="btn-glow rounded-full px-8 py-3 text-base font-semibold shadow-lg"
                    onClick={() => setModalOpen(true)}
                  >
                    <Plus className="mr-2 size-4" />
                    Add data to see insights
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
              {/* ─── STOCK HEALTH OVERVIEW ─── */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                <StockHealthPanel />
              </motion.div>

              {/* ─── ALERTS + RECOMMENDATIONS (Live from Predictive Engine) ─── */}
              <motion.div
                className="grid gap-6 lg:grid-cols-2"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
              >
                <AlertCard title="Predictive Alerts" items={liveAlerts} />
                <RecommendationCard title="AI Recommendations" items={liveRecommendations} />
              </motion.div>

              {/* ─── AI Insight Banner (Live) ─── */}
              <motion.div
                className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-50 via-violet-50 to-purple-50 border border-primary/10 px-5 py-4 shadow-sm"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <Brain className="size-5 text-primary animate-ai-pulse" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-primary">Predictive Intelligence</p>
                  <p className="text-xs text-muted-foreground">{topInsight}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs bg-white/80 hover:bg-white"
                  onClick={() => fetchPredictions(profile.location)}
                  disabled={predictionLoading}
                >
                  <RefreshCw className={`mr-1 size-3 ${predictionLoading ? "animate-spin" : ""}`} />
                  {predictionLoading ? "Analyzing..." : "Refresh"}
                </Button>
              </motion.div>

              {/* ─── SIGNALS + DEMAND FORECAST ─── */}
              <motion.div
                className="grid gap-6 lg:grid-cols-2"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4 }}
              >
                <SignalsPanel signals={prediction?.signals} />
                <PredictiveDemandPanel insights={liveDemandInsights} />
              </motion.div>

              {/* ─── BRANCH COMPARISON ─── */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28, duration: 0.4 }}
              >
                <BranchComparisonPanel />
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
        onComplete={async (uploadData) => {
          setHasData(true);
          setModalOpen(false);
          // Save upload to backend
          if (uploadData) {
            try {
              await addUpload(uploadData);
              await refreshUser();
            } catch (err) {
              console.warn("[Dashboard] Backend upload save failed:", err.message);
            }
          }
        }}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
