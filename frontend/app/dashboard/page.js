"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
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
import { NotificationPanel } from "@/components/NotificationPanel";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import {
  addUpload,
  getPrediction,
  getInventorySummary,
  getAlerts,
  getRecommendations,
  getNotifications,
  getTransferSuggestions,
  syncAllSheets,
} from "@/lib/api";
import { EditProfileModal } from "@/components/EditProfileModal";
import { AutoRestockModal } from "@/components/AutoRestockModal";
import { BranchSwapModal } from "@/components/BranchSwapModal";
import { WhatsAppActivityPanel } from "@/components/WhatsAppActivityPanel";
import {
  salesTrend,
  stockByBranch as staticStockByBranch,
  categoryBreakdown as staticCategoryBreakdown,
  demoAlerts,
  demoRecommendations,
  demandTrending,
  branchComparison as staticBranchComparison,
  stockHealth as staticStockHealth,
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
  distributorName: "",
  distributorPhone: "",
};

/* ─── Stock Health Card ─── */
function StockHealthPanel({ data }) {
  const health = data || staticStockHealth;
  const items = [
    { label: "Total Products", value: health.totalItems || health.totalProducts || 0, icon: Package, color: "text-primary", bg: "bg-primary/5" },
    { label: "Expiring Soon", value: health.expiringSoon || health.expiringItems || 0, icon: Clock, color: "text-red-600", bg: "bg-red-50" },
    { label: "Low Stock", value: (health.lowStock || health.lowStockItems || 0) + (health.outOfStock || health.outOfStockItems || 0), icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Healthy", value: health.healthy || health.healthyItems || 0, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  const totalValue = health.totalValue || 0;
  const totalUnits = health.totalUnits || health.totalProducts || 0;
  const branchCount = health.branches ? Object.keys(health.branches).length : 0;

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
            <p className="text-lg font-extrabold text-foreground">
              ₹{typeof totalValue === "number" ? totalValue.toLocaleString("en-IN") : totalValue}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs font-bold text-muted-foreground">{totalUnits} units</p>
            <p className="text-[10px] text-muted-foreground">
              across {branchCount || "—"} branch{branchCount !== 1 ? "es" : ""}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Branch Comparison ─── */
function BranchComparisonPanel({ data }) {
  const riskColors = {
    red: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200/40" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200/40" },
    green: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200/40" },
  };

  // Build from real data or fall back to static
  const branches = data
    ? Object.entries(data).map(([name, stats]) => {
        const riskScore = stats.expiringItems > 2 || stats.lowStockItems > 2 ? "High" :
                          stats.expiringItems > 0 || stats.lowStockItems > 0 ? "Medium" : "Low";
        const riskColor = riskScore === "High" ? "red" : riskScore === "Medium" ? "amber" : "green";
        return {
          branch: name,
          totalStock: stats.units || stats.totalStock || 0,
          expiringItems: stats.expiringItems || 0,
          lowStockItems: stats.lowStockItems || 0,
          riskScore,
          riskColor,
          revenue: `₹${(stats.totalValue || 0).toLocaleString("en-IN")}`,
        };
      })
    : staticBranchComparison;

  if (branches.length === 0) return null;

  return (
    <Card className="overflow-hidden rounded-2xl border-white/50 bg-white/70 shadow-lg backdrop-blur-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <MapPin className="size-4 text-primary" />
          Branch Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {branches.map((b) => {
          const rc = riskColors[b.riskColor] || riskColors.green;
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
                  <p className="text-[10px] text-muted-foreground">Value</p>
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
            key={`${item.product}_${i}`}
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

  // ── REAL DATA STATE ─────────────────────────────────────────────────────────
  const [summary, setSummary] = useState(null);
  const [realAlerts, setRealAlerts] = useState(null);
  const [realRecommendations, setRealRecommendations] = useState(null);
  const [lastSynced, setLastSynced] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── NEW: Edit Profile, Restock, Transfer state ───────────────────────────
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [restockAlert, setRestockAlert] = useState(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferSuggestion, setTransferSuggestion] = useState(null);
  const [transferSuggestions, setTransferSuggestions] = useState([]);
  const [whatsappActivity, setWhatsappActivity] = useState([]);

  useEffect(() => {
    // Populate profile from backend user data first, then fallback to sessionStorage
    if (user?.businessData?.name) {
      setProfile({
        businessName: user.businessData.name || defaultProfile.businessName,
        location: user.businessData.location || defaultProfile.location,
        businessType: user.businessData.type || defaultProfile.businessType,
        features: { ...defaultProfile.features, ...(user.businessData.features || {}) },
        distributorName: user.businessData.distributorName || "",
        distributorPhone: user.businessData.distributorPhone || "",
      });
      if (user.uploads?.length > 0 || user.sheetSources?.length > 0) {
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

  // ── Fetch REAL dashboard data ─────────────────────────────────────────────
  const fetchDashboardData = useCallback(async (showLoading = false) => {
    if (showLoading) setDataLoading(true);
    try {
      const [summaryRes, alertsRes, recsRes] = await Promise.all([
        getInventorySummary().catch(() => null),
        getAlerts({ limit: 10 }).catch(() => null),
        getRecommendations({ limit: 10 }).catch(() => null),
      ]);

      if (summaryRes?.success && summaryRes.summary?.totalItems > 0) {
        setSummary(summaryRes.summary);
        setHasData(true);
        if (summaryRes.summary.lastSynced) {
          setLastSynced(new Date(summaryRes.summary.lastSynced));
        }
      }

      if (alertsRes?.success && alertsRes.alerts?.length > 0) {
        setRealAlerts(alertsRes.alerts);
      }

      if (recsRes?.success && recsRes.recommendations?.length > 0) {
        setRealRecommendations(recsRes.recommendations);
      }

      // Fetch transfer suggestions and WhatsApp activity
      const [transferRes, notifsRes] = await Promise.all([
        getTransferSuggestions().catch(() => null),
        getNotifications({ limit: 30 }).catch(() => null),
      ]);

      if (transferRes?.success) {
        setTransferSuggestions(transferRes.suggestions || []);
      }

      if (notifsRes?.success) {
        const waMessages = (notifsRes.notifications || []).filter(
          (n) => n.channels?.includes("whatsapp") || n.whatsappStatus === "sent" || n.whatsappStatus === "failed"
        );
        setWhatsappActivity(waMessages);
      }
    } catch (err) {
      console.warn("[Dashboard] Failed to fetch real data:", err.message);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(true);
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => fetchDashboardData(false), 60_000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // ── Manual refresh ────────────────────────────────────────────────────────
  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await syncAllSheets();
      await fetchDashboardData(false);
    } catch (err) {
      console.warn("[Dashboard] Manual refresh failed:", err.message);
    } finally {
      setRefreshing(false);
    }
  };

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

  // ── Derive display data (real → fallback) ─────────────────────────────────
  const liveAlerts = realAlerts
    ? realAlerts.map((a, i) => ({
        id: a._id || `a_${i}`,
        title: a.message || a.productName,
        detail: `${a.productName} — ${a.branch || "Main"}${a.quantityAtAlert != null ? ` (${a.quantityAtAlert} units)` : ""}`,
        severity: a.severity,
        productName: a.productName,
        productId: a.productId,
        branch: a.branch,
        quantityAtAlert: a.quantityAtAlert,
        minStockLevel: a.minStockLevel,
      }))
    : prediction?.alerts?.map((a, i) => ({
        id: a.id || `pa_${i}`,
        title: a.title,
        detail: a.detail,
        severity: a.severity,
      })) || demoAlerts;

  const liveRecommendations = realRecommendations
    ? realRecommendations.map((r, i) => ({
        id: r._id || `r_${i}`,
        title: `${r.productName}: ${r.suggestion}`,
        detail: r.reasoning || r.suggestion,
        impact: r.priority === "urgent" ? "Critical" : r.priority === "high" ? "High" : "Medium",
      }))
    : prediction?.recommendations?.map((r, i) => ({
        id: r.id || `pr_${i}`,
        title: r.title,
        detail: r.detail,
        impact: r.impact || "Medium",
      })) || demoRecommendations;

  const liveDemandInsights = prediction?.demandInsights || [];

  // ── Restock & Transfer handlers ──────────────────────────────────────────
  const handleAutoRestock = (alertItem) => {
    setRestockAlert(alertItem);
    setRestockModalOpen(true);
  };

  const handleInitiateTransfer = (suggestion) => {
    setTransferSuggestion(suggestion);
    setTransferModalOpen(true);
  };

  const handleProfileSaved = (newBizData) => {
    setProfile((prev) => ({
      ...prev,
      businessName: newBizData.name || prev.businessName,
      location: newBizData.location || prev.location,
      businessType: newBizData.type || prev.businessType,
      distributorName: newBizData.distributorName || "",
      distributorPhone: newBizData.distributorPhone || "",
    }));
    refreshUser?.();
  };

  const topInsight = prediction?.summary
    ? `${prediction.signals?.weather?.condition === "heatwave" ? "Heatwave" : prediction.signals?.weather?.condition || "Weather"} detected (${prediction.signals?.weather?.temperature || "--"}°C) — ${prediction.summary.totalAlerts} alerts, ${prediction.summary.totalRecommendations} recommendations generated.`
    : summary
    ? `${summary.totalItems} products tracked across ${Object.keys(summary.branches || {}).length} branches. ${summary.openAlerts || 0} active alerts.`
    : "Connect a Google Sheet to see real-time AI insights for your business.";

  // ── Charts (from real data if available) ──────────────────────────────────
  const chartCategoryData = summary?.categories
    ? Object.entries(summary.categories).map(([name, value]) => ({ name, value }))
    : staticCategoryBreakdown;

  const chartBranchData = summary?.branches
    ? Object.entries(summary.branches).map(([branch, stats]) => ({
        branch,
        units: stats.units || 0,
        risk: stats.risk || 0,
        healthy: stats.healthy || 0,
      }))
    : staticStockByBranch;

  const charts = useMemo(
    () => (
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Stock by branch"
          description={summary ? "Live data" : "Units on hand (demo)"}
          type="bar"
          data={chartBranchData}
        />
        <ChartCard
          title="Category mix"
          description={summary ? "Live data" : "Share of assortment (demo)"}
          type="pie"
          data={chartCategoryData}
          dataKey="value"
          xKey="name"
        />
      </div>
    ),
    [chartBranchData, chartCategoryData, summary]
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
            <NotificationPanel />
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

            {/* AI Status + Last Synced + Refresh */}
            {hasData && (
              <div className="flex items-center gap-3">
                {lastSynced && (
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-muted-foreground">Last synced</p>
                    <p className="text-[10px] text-muted-foreground">
                      {lastSynced.toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                    </p>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs bg-white/70 hover:bg-white"
                  onClick={handleManualRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw className={`mr-1 size-3 ${refreshing ? "animate-spin" : ""}`} />
                  {refreshing ? "Syncing..." : "Refresh"}
                </Button>
                <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-2 shadow-sm">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-xs font-semibold text-emerald-700">
                    {summary ? "Live" : "AI analyzing"}
                    <span className="dot-blink-1"> .</span>
                    <span className="dot-blink-2">.</span>
                    <span className="dot-blink-3">.</span>
                  </span>
                </div>
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
                <StockHealthPanel data={summary} />
              </motion.div>

              {/* ─── ALERTS + RECOMMENDATIONS (Real data first, then prediction, then demo) ─── */}
              <motion.div
                className="grid gap-6 lg:grid-cols-2"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
              >
                <AlertCard title="Active Alerts" items={liveAlerts} onAutoRestock={handleAutoRestock} />
                <RecommendationCard
                  title="AI Recommendations"
                  items={liveRecommendations}
                  transferSuggestions={transferSuggestions}
                  onInitiateTransfer={handleInitiateTransfer}
                />
              </motion.div>

              {/* ─── AI Insight Banner ─── */}
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
                <BranchComparisonPanel data={summary?.branches} />
              </motion.div>

              {/* ─── WHATSAPP ACTIVITY ─── */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <WhatsAppActivityPanel
                  alerts={liveAlerts}
                  recommendations={liveRecommendations}
                  transfers={transferSuggestions}
                  messages={whatsappActivity}
                  onRefresh={() => fetchDashboardData(false)}
                />
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
          distributorName={profile.distributorName}
          onEditProfile={() => setEditProfileOpen(true)}
          className="hidden lg:block"
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-10 lg:hidden lg:px-6">
        <ProfilePanel
          businessName={profile.businessName}
          location={profile.location}
          businessType={profile.businessType}
          features={profile.features}
          distributorName={profile.distributorName}
          onEditProfile={() => setEditProfileOpen(true)}
        />
      </div>

      <UploadModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onComplete={async (uploadData) => {
          setHasData(true);
          setModalOpen(false);
          await fetchDashboardData(true);
          await refreshUser();
        }}
      />

      <EditProfileModal
        open={editProfileOpen}
        onOpenChange={setEditProfileOpen}
        user={user}
        onSaved={handleProfileSaved}
      />

      <AutoRestockModal
        open={restockModalOpen}
        onOpenChange={setRestockModalOpen}
        alert={restockAlert}
        distributorName={profile.distributorName}
        distributorPhone={profile.distributorPhone}
        onSent={() => {
          fetchDashboardData(false);
        }}
      />

      <BranchSwapModal
        open={transferModalOpen}
        onOpenChange={setTransferModalOpen}
        suggestion={transferSuggestion}
        onComplete={() => {
          fetchDashboardData(false);
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
