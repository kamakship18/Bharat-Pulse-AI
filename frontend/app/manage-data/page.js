"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { BrandLogo } from "@/components/BrandLogo";
import { UploadModal, UPLOAD_STORAGE_KEY, getStoredUploads } from "@/components/UploadModal";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { addUpload, getInventoryByBranch, syncAllSheets } from "@/lib/api";
import {
  productInventory,
  STOCK_FILTERS,
  aiChatMessages,
  mapInventoryItem,
} from "@/lib/manage-data";
import {
  Database,
  ArrowLeft,
  Filter,
  Package,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Send,
  Bot,
  User,
  Sparkles,
  MapPin,
  Search,
  Plus,
  Link2,
  Camera,
  ImageIcon,
  ChevronDown,
  ChevronUp,
  LogOut,
  RefreshCw,
} from "lucide-react";

/* ─── Status helpers ─── */

function getStatusConfig(status) {
  switch (status) {
    case "expiring":
      return {
        label: "Expiring Soon",
        color: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-200/60",
        icon: Clock,
        dot: "bg-red-500",
      };
    case "low-stock":
      return {
        label: "Low Stock",
        color: "text-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-200/60",
        icon: AlertTriangle,
        dot: "bg-amber-500",
      };
    default:
      return {
        label: "Healthy",
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        border: "border-emerald-200/60",
        icon: CheckCircle2,
        dot: "bg-emerald-500",
      };
  }
}

function daysUntil(dateStr) {
  if (!dateStr) return Infinity;
  const now = new Date();
  const target = new Date(dateStr);
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  return diff;
}

/* ─── Product Card ─── */

function ProductCard({ product, index }) {
  const status = getStatusConfig(product.status);
  const StatusIcon = status.icon;
  const days = daysUntil(product.expiryDate);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className={`group relative rounded-xl border ${status.border} ${status.bg}/30 bg-white/70 p-4 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}
    >
      {/* Status dot */}
      <div className="absolute right-3 top-3 flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${status.dot} animate-status-pulse`} />
        <span className={`text-[10px] font-bold uppercase tracking-wide ${status.color}`}>
          {status.label}
        </span>
      </div>

      <div className="pr-24">
        <h4 className="text-sm font-bold text-foreground leading-tight">{product.name}</h4>
        <p className="mt-0.5 text-xs text-muted-foreground">{product.category}</p>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Package className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold">{product.quantity} units</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="size-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{product.branch}</span>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <StatusIcon className={`size-3.5 ${status.color}`} />
          <span className={`text-xs font-medium ${status.color}`}>
            {product.status === "expiring"
              ? days <= 0 ? "Expired!" : `Expires in ${days} day${days > 1 ? "s" : ""}`
              : product.status === "low-stock"
              ? "Restock needed"
              : product.expiryDate
              ? `Valid until ${new Date(product.expiryDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`
              : "No expiry"}
          </span>
        </div>
        <span className="text-xs font-bold text-foreground">₹{product.price}</span>
      </div>
    </motion.div>
  );
}

/* ─── Upload Sources Panel ─── */

function UploadSourcesPanel({ uploads, onAddMore }) {
  const [expandedBranch, setExpandedBranch] = useState(null);

  const grouped = useMemo(() => {
    const map = {};
    uploads.forEach((u) => {
      if (!map[u.branch]) map[u.branch] = [];
      map[u.branch].push(u);
    });
    return map;
  }, [uploads]);

  const typeIcons = {
    sheet: { icon: Link2, color: "text-primary", bg: "bg-primary/10", label: "Google Sheet" },
    image: { icon: ImageIcon, color: "text-violet-600", bg: "bg-violet-500/10", label: "Image Upload" },
    camera: { icon: Camera, color: "text-emerald-600", bg: "bg-emerald-500/10", label: "Camera Capture" },
  };

  if (uploads.length === 0) {
    return (
      <Card className="overflow-hidden rounded-2xl border-white/50 bg-white/70 shadow-lg backdrop-blur-md">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Database className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">No uploads yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1 mb-4">
            Add data from Google Sheets, images, or camera
          </p>
          <Button className="rounded-full btn-glow" onClick={onAddMore}>
            <Plus className="mr-2 size-4" />
            Add Data
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-white/50 bg-white/70 shadow-lg backdrop-blur-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <Database className="size-4 text-primary" />
            Uploaded Sources
          </CardTitle>
          <Button size="sm" className="rounded-full h-7 text-xs" onClick={onAddMore}>
            <Plus className="mr-1.5 size-3" />
            Add More
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(grouped).map(([branch, items]) => (
          <div key={branch} className="rounded-xl border border-border/30 overflow-hidden">
            <button
              onClick={() => setExpandedBranch(expandedBranch === branch ? null : branch)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white/50 hover:bg-white/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <MapPin className="size-3.5 text-primary" />
                <span className="text-xs font-bold">{branch}</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {items.length} upload{items.length > 1 ? "s" : ""}
                </span>
              </div>
              {expandedBranch === branch ? (
                <ChevronUp className="size-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-3.5 text-muted-foreground" />
              )}
            </button>

            <AnimatePresence>
              {expandedBranch === branch && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="divide-y divide-border/20 border-t border-border/20">
                    {items.map((upload) => {
                      const typeConfig = typeIcons[upload.type] || typeIcons.sheet;
                      const TypeIcon = typeConfig.icon;
                      return (
                        <div key={upload.id} className="flex items-center gap-3 px-4 py-2.5">
                          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${typeConfig.bg}`}>
                            <TypeIcon className={`size-3.5 ${typeConfig.color}`} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{typeConfig.label}</p>
                            <p className="text-xs truncate">{upload.source || "—"}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[10px] font-bold text-primary">
                              {upload.extractedData?.length || 0} items
                            </p>
                            <p className="text-[9px] text-muted-foreground">
                              {new Date(upload.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ─── AI Chat Panel ─── */

function AIChatPanel() {
  const [messages, setMessages] = useState(aiChatMessages.slice(0, 1));
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);
  const demoIndexRef = useRef(1);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg = { id: `user-${Date.now()}`, role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    const idx = demoIndexRef.current;
    const nextPair = [];

    for (let i = idx; i < aiChatMessages.length; i++) {
      if (aiChatMessages[i].role === "assistant") {
        nextPair.push(aiChatMessages[i]);
        demoIndexRef.current = i + 1;
        break;
      }
    }

    if (nextPair.length === 0) {
      nextPair.push({
        id: `ai-${Date.now()}`,
        role: "assistant",
        text: `📊 Based on your current data:\n\n• Total inventory value: **₹42,580** across 3 branches\n• **5 items** need attention this week\n• Rajpura branch has the most critical alerts\n\n💡 *Would you like me to generate a detailed report?*`,
      });
      demoIndexRef.current = 1;
    }

    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [...prev, ...nextPair]);
    }, 1200 + Math.random() * 800);
  };

  const quickQuestions = [
    "Which products are about to expire?",
    "Which branch has low stock?",
    "What should I restock?",
  ];

  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-2xl border-white/50 bg-white/70 shadow-xl backdrop-blur-md">
      <CardHeader className="shrink-0 border-b border-border/30 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-600 shadow-md">
            <Bot className="size-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold">AI Assistant</CardTitle>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-status-pulse" />
              <span className="text-[10px] text-muted-foreground font-medium">Online</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25 }}
              className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                msg.role === "user"
                  ? "bg-primary/10 text-primary"
                  : "bg-gradient-to-br from-primary/15 to-violet-500/15 text-primary"
              }`}>
                {msg.role === "user" ? (
                  <User className="size-3.5" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
              </div>
              <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-white rounded-tr-sm"
                  : "bg-white/80 text-foreground border border-border/30 rounded-tl-sm shadow-sm"
              }`}>
                {msg.text.split("\n").map((line, i) => (
                  <p key={i} className={i > 0 ? "mt-1" : ""}>
                    {line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
                      if (part.startsWith("**") && part.endsWith("**")) {
                        return <strong key={j}>{part.slice(2, -2)}</strong>;
                      }
                      if (part.startsWith("*") && part.endsWith("*")) {
                        return <em key={j} className="text-muted-foreground">{part.slice(1, -1)}</em>;
                      }
                      return part;
                    })}
                  </p>
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-violet-500/15 text-primary">
              <Sparkles className="size-3.5" />
            </div>
            <div className="rounded-xl rounded-tl-sm bg-white/80 border border-border/30 px-4 py-3 shadow-sm">
              <div className="flex items-center gap-1">
                <span className="dot-blink-1 h-1.5 w-1.5 rounded-full bg-primary/60" />
                <span className="dot-blink-2 h-1.5 w-1.5 rounded-full bg-primary/60" />
                <span className="dot-blink-3 h-1.5 w-1.5 rounded-full bg-primary/60" />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="shrink-0 px-4 pb-2">
          <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Try asking:</p>
          <div className="flex flex-wrap gap-1.5">
            {quickQuestions.map((q) => (
              <button
                key={q}
                onClick={() => { setInput(q); }}
                className="rounded-full bg-primary/5 border border-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="shrink-0 border-t border-border/30 p-3">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your inventory..."
            className="rounded-xl bg-white/80 text-xs shadow-sm"
          />
          <Button
            type="submit"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-primary to-violet-600 shadow-md hover:shadow-lg transition-all"
            disabled={!input.trim()}
          >
            <Send className="size-3.5" />
          </Button>
        </form>
      </div>
    </Card>
  );
}

/* ─── Summary Card ─── */

function SummaryCard({ icon: Icon, label, value, color, bg }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl ${bg} border ${color === "text-red-600" ? "border-red-200/40" : color === "text-amber-600" ? "border-amber-200/40" : color === "text-emerald-600" ? "border-emerald-200/40" : "border-primary/10"} p-4 shadow-sm`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={`mt-1 text-2xl font-extrabold ${color}`}>{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${color}`}>
          <Icon className="size-5" />
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main Page ─── */

function ManageDataContent() {
  const { user, logout, refreshUser } = useAuth();
  const [branch, setBranch] = useState("All Branches");
  const [stockFilter, setStockFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [activeTab, setActiveTab] = useState("inventory");

  // ── REAL DATA STATE ─────────────────────────────────────────────────────────
  const [realProducts, setRealProducts] = useState(null);
  const [realBranches, setRealBranches] = useState(null);
  const [realCategories, setRealCategories] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);

  // Load uploads from backend user data or sessionStorage
  useEffect(() => {
    if (user?.uploads?.length > 0) {
      setUploads(user.uploads.map((u) => ({
        id: u.uploadId,
        type: u.type,
        branch: u.branch,
        source: u.source,
        extractedData: u.extractedData,
        timestamp: u.timestamp,
      })));
    } else {
      setUploads(getStoredUploads());
    }
  }, [user, modalOpen]);

  // ── Fetch real inventory data from API ────────────────────────────────────
  const fetchRealData = useCallback(async (showLoading = false) => {
    if (showLoading) setDataLoading(true);
    try {
      const res = await getInventoryByBranch();
      if (res?.success && res.total > 0) {
        const allItems = Object.values(res.grouped || {}).flat();
        const mapped = allItems.map(mapInventoryItem);
        setRealProducts(mapped);

        const branchList = res.branches || [];
        setRealBranches(["All Branches", ...branchList]);

        const cats = new Set();
        mapped.forEach((p) => { if (p.category) cats.add(p.category); });
        setRealCategories(["All", ...Array.from(cats).sort()]);

        const latest = allItems.reduce((max, item) => {
          const t = new Date(item.lastSyncedAt || item.updatedAt || 0);
          return t > max ? t : max;
        }, new Date(0));
        if (latest.getTime() > 0) setLastSynced(latest);
      }
    } catch (err) {
      console.warn("[ManageData] Failed to fetch real data:", err.message);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRealData(true);
    const interval = setInterval(() => fetchRealData(false), 60_000);
    return () => clearInterval(interval);
  }, [fetchRealData]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await syncAllSheets();
      await fetchRealData(false);
    } catch (err) {
      console.warn("[ManageData] Manual refresh failed:", err.message);
    } finally {
      setRefreshing(false);
    }
  };

  // ── Use real data if available, otherwise fallback to static ──────────────
  const allProducts = realProducts || productInventory;
  const branchOptions = realBranches || ["All Branches", "Rajpura", "Chandigarh", "Pinjore"];
  const categoryOptions = realCategories || ["All", "Dairy", "Bakery", "Groceries", "Snacks", "Cold drinks"];

  const filteredProducts = useMemo(() => {
    return allProducts.filter((p) => {
      if (branch !== "All Branches" && p.branch !== branch) return false;
      if (stockFilter === "Low Stock" && p.status !== "low-stock") return false;
      if (stockFilter === "Expiring Soon" && p.status !== "expiring") return false;
      if (stockFilter === "Healthy" && p.status !== "healthy") return false;
      if (categoryFilter !== "All" && p.category !== categoryFilter) return false;
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [allProducts, branch, stockFilter, categoryFilter, searchQuery]);

  const stats = useMemo(() => {
    const filtered = branch === "All Branches" ? allProducts : allProducts.filter((p) => p.branch === branch);
    return {
      total: filtered.length,
      expiring: filtered.filter((p) => p.status === "expiring").length,
      lowStock: filtered.filter((p) => p.status === "low-stock").length,
      healthy: filtered.filter((p) => p.status === "healthy").length,
    };
  }, [allProducts, branch]);

  const isLive = realProducts !== null;

  return (
    <div className="min-h-screen page-gradient">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/30 glass-strong">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex shrink-0 items-center">
              <BrandLogo size="md" />
            </Link>
            <div>
              <h1 className="font-heading text-lg font-bold leading-none flex items-center gap-2">
                <Database className="size-4 text-primary" />
                Manage Data
              </h1>
              <p className="text-xs text-muted-foreground">BharatPulse AI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button className="rounded-full btn-glow" onClick={() => setModalOpen(true)}>
              <Plus className="mr-2 size-4" />
              Add Data
            </Button>
            <Link href="/dashboard">
              <Button variant="outline" className="rounded-full bg-white/70 shadow-sm backdrop-blur-sm hover:bg-white hover:shadow-md">
                <ArrowLeft className="mr-2 size-4" />
                Dashboard
              </Button>
            </Link>
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

      {/* Main Content — Split Layout */}
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_380px] lg:items-start lg:px-6">
        {/* LEFT — Data Panel */}
        <div className="min-w-0 space-y-6">
          {/* Page Title + Branch Selector + Sync Status */}
          <motion.div
            className="flex flex-wrap items-end justify-between gap-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div>
              <h2 className="font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">
                Your Business Data
              </h2>
              <div className="mt-1 flex items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  Monitor inventory, track expiry, and manage stock across branches
                </p>
                {isLive && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </span>
                    Live
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {lastSynced && (
                <div className="text-right">
                  <p className="text-[10px] font-bold text-muted-foreground">Last synced</p>
                  <p className="text-[10px] text-muted-foreground">
                    {lastSynced.toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                  </p>
                </div>
              )}
              {isLive && (
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
              )}
              <div className="w-48">
                <Select value={branch} onValueChange={setBranch}>
                  <SelectTrigger className="rounded-xl bg-white/80 shadow-sm text-xs font-semibold">
                    <MapPin className="mr-1.5 size-3.5 text-primary" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {branchOptions.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>

          {/* Tab Switcher */}
          <div className="flex gap-1 rounded-xl bg-white/50 p-1 border border-border/30 w-fit">
            {[
              { id: "inventory", label: "Inventory", icon: Package },
              { id: "sources", label: "Upload Sources", icon: Database },
            ].map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer",
                    activeTab === tab.id
                      ? "bg-white shadow-sm text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <TabIcon className="size-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === "inventory" && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SummaryCard icon={Package} label="Total Products" value={stats.total} color="text-primary" bg="bg-primary/5" />
                <SummaryCard icon={Clock} label="Expiring Soon" value={stats.expiring} color="text-red-600" bg="bg-red-50" />
                <SummaryCard icon={AlertTriangle} label="Low Stock" value={stats.lowStock} color="text-amber-600" bg="bg-amber-50" />
                <SummaryCard icon={CheckCircle2} label="Healthy" value={stats.healthy} color="text-emerald-600" bg="bg-emerald-50" />
              </div>

              {/* Filters */}
              <Card className="overflow-hidden rounded-2xl border-white/50 bg-white/70 shadow-lg backdrop-blur-md">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                      <Filter className="size-3.5" />
                      Filters
                    </div>
                    <Separator orientation="vertical" className="h-5" />

                    <div className="relative flex-1 min-w-[180px]">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search products..."
                        className="h-8 rounded-lg bg-white/80 pl-8 text-xs shadow-sm"
                      />
                    </div>

                    <Select value={stockFilter} onValueChange={setStockFilter}>
                      <SelectTrigger className="h-8 w-36 rounded-lg bg-white/80 text-xs shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STOCK_FILTERS.map((f) => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="h-8 w-36 rounded-lg bg-white/80 text-xs shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((f) => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Product Grid */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold text-muted-foreground">
                    {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""} found
                    {isLive && <span className="ml-1 text-emerald-600">(live)</span>}
                  </p>
                  {(stockFilter !== "All" || categoryFilter !== "All" || searchQuery) && (
                    <button
                      onClick={() => { setStockFilter("All"); setCategoryFilter("All"); setSearchQuery(""); }}
                      className="text-xs font-medium text-primary hover:underline cursor-pointer"
                    >
                      Clear filters
                    </button>
                  )}
                </div>

                {dataLoading && !realProducts ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <RefreshCw className="size-8 text-primary/30 animate-spin mb-3" />
                    <p className="text-sm font-semibold text-muted-foreground">Loading inventory data...</p>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <AnimatePresence mode="popLayout">
                        {filteredProducts.map((product, index) => (
                          <ProductCard key={product.id} product={product} index={index} />
                        ))}
                      </AnimatePresence>
                    </div>

                    {filteredProducts.length === 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-16 text-center"
                      >
                        <Package className="size-12 text-muted-foreground/30 mb-3" />
                        <p className="text-sm font-semibold text-muted-foreground">No products match your filters</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">Try adjusting your search or filters</p>
                      </motion.div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {activeTab === "sources" && (
            <UploadSourcesPanel uploads={uploads} onAddMore={() => setModalOpen(true)} />
          )}
        </div>

        {/* RIGHT — AI Chat */}
        <div className="lg:sticky lg:top-24 h-[calc(100vh-120px)] min-h-[500px]">
          <AIChatPanel />
        </div>
      </div>

      <UploadModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onComplete={async (uploadData) => {
          setUploads(getStoredUploads());
          setModalOpen(false);
          // Refresh real data after upload
          await fetchRealData(true);
          if (uploadData) {
            try {
              await addUpload(uploadData);
              await refreshUser();
            } catch (err) {
              console.warn("[ManageData] Backend upload save failed:", err.message);
            }
          }
        }}
      />
    </div>
  );
}

export default function ManageDataPage() {
  return (
    <ProtectedRoute>
      <ManageDataContent />
    </ProtectedRoute>
  );
}
