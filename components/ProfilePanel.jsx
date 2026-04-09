"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Building2, MapPin, Sparkles, Settings, Database } from "lucide-react";

const FEATURE_LABELS = {
  expiry: { label: "Expiry Alerts", emoji: "⏰" },
  stock: { label: "Stock Recs", emoji: "📦" },
  demand: { label: "Demand Forecast", emoji: "📈" },
  whatsapp: { label: "WhatsApp", emoji: "💬" },
  ocr: { label: "Image → Data", emoji: "📸" },
  multi: { label: "Multi-branch", emoji: "🔀" },
};

export function ProfilePanel({
  businessName = "Demo Traders",
  location = "Punjab, India",
  businessType = "Kirana / General store",
  features = {},
  className,
}) {
  const active = Object.entries(features)
    .filter(([, v]) => v)
    .map(([k]) => FEATURE_LABELS[k] || { label: k, emoji: "✨" });

  return (
    <motion.aside
      className={className}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="sticky top-24 overflow-hidden rounded-2xl border-white/50 bg-white/70 shadow-xl backdrop-blur-md ring-1 ring-border/20">
        {/* Gradient header */}
        <div className="h-20 bg-gradient-to-r from-primary via-indigo-600 to-violet-700" />

        <CardHeader className="-mt-10 pb-3">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-600 text-2xl font-black text-white shadow-lg ring-4 ring-white">
              {businessName?.slice(0, 1)?.toUpperCase() ?? "B"}
            </span>
          </div>
          <div className="mt-2">
            <CardTitle className="text-lg font-bold leading-snug">{businessName}</CardTitle>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              {location}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 text-sm">
          {/* Business type badge */}
          <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary/10 to-violet-500/10 px-3 py-2.5">
            <Building2 className="size-4 text-primary" />
            <span className="font-bold text-primary">{businessType}</span>
          </div>

          {/* Features */}
          <div>
            <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <Sparkles className="size-3.5" />
              Features enabled
            </p>
            <div className="flex flex-wrap gap-2">
              {(active.length ? active : [{ label: "—", emoji: "" }]).map((f) => (
                <span
                  key={f.label}
                  className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary/8 to-violet-500/8 px-2.5 py-1.5 text-[11px] font-semibold text-primary shadow-sm"
                >
                  {f.emoji} {f.label}
                </span>
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            <Link
              href="/onboarding"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "w-full justify-center rounded-full bg-white/70 backdrop-blur-sm transition-all hover:bg-white hover:shadow-md"
              )}
            >
              <Settings className="mr-2 size-3.5" />
              Edit profile
            </Link>
            <Link
              href="/manage-data"
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "w-full justify-center rounded-full transition-all hover:shadow-md"
              )}
            >
              <Database className="mr-2 size-3.5" />
              Manage data
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.aside>
  );
}
