"use client";

import { motion } from "framer-motion";
import { Activity, TrendingUp, AlertTriangle, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const bandStyles = {
  strong: {
    ring: "from-emerald-400 via-teal-400 to-cyan-400",
    text: "text-emerald-800",
    badge: "bg-emerald-100 text-emerald-800",
  },
  steady: {
    ring: "from-amber-400 via-orange-400 to-rose-400",
    text: "text-amber-900",
    badge: "bg-amber-100 text-amber-900",
  },
  attention: {
    ring: "from-rose-500 via-red-500 to-orange-500",
    text: "text-rose-950",
    badge: "bg-rose-100 text-rose-900",
  },
  empty: {
    ring: "from-slate-300 via-slate-400 to-slate-500",
    text: "text-muted-foreground",
    badge: "bg-muted text-muted-foreground",
  },
};

function DriverRow({ d }) {
  const icon =
    d.kind === "positive" ? (
      <TrendingUp className="size-3.5 text-emerald-600" />
    ) : d.kind === "alert" || d.kind === "risk" || d.kind === "expiry" ? (
      <AlertTriangle className="size-3.5 text-amber-600" />
    ) : (
      <Sparkles className="size-3.5 text-primary" />
    );
  return (
    <div className="flex gap-2 rounded-lg border border-white/40 bg-white/50 px-3 py-2 text-left">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold leading-tight text-foreground">{d.label}</p>
        <p className="text-[10px] leading-snug text-muted-foreground">{d.detail}</p>
      </div>
    </div>
  );
}

export function PulseScoreCard({ pulse }) {
  if (!pulse) return null;

  const band = pulse.band && bandStyles[pulse.band] ? pulse.band : "empty";
  const st = bandStyles[band];
  const score = pulse.score;

  return (
    <Card className="overflow-hidden rounded-2xl border-violet-200/50 bg-gradient-to-br from-violet-50/90 via-white/80 to-cyan-50/40 shadow-lg ring-1 ring-violet-100/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md">
              <Activity className="size-5" strokeWidth={1.75} />
            </span>
            <div>
              <CardTitle className="text-lg font-bold text-violet-950">Business Pulse</CardTitle>
              <p className="text-xs font-medium text-violet-600/70">MSME resilience score · live inventory</p>
            </div>
          </div>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", st.badge)}>
            {band === "strong" ? "Strong" : band === "steady" ? "Steady" : band === "attention" ? "Focus" : "—"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
        <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl border border-white/60 bg-white/60 px-6 py-5 shadow-inner">
          <div
            className={cn(
              "flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br p-[3px] shadow-lg",
              st.ring
            )}
          >
            <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white">
              {score != null ? (
                <>
                  <span className={cn("font-heading text-4xl font-black tabular-nums", st.text)}>{score}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">/ 100</span>
                </>
              ) : (
                <span className="px-2 text-center text-xs font-semibold text-muted-foreground">No data yet</span>
              )}
            </div>
          </div>
          <p className="mt-2 text-center text-sm font-bold text-violet-950">{pulse.headline}</p>
          <p className="text-center text-[11px] text-muted-foreground">{pulse.subline}</p>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Top drivers</p>
          <div className="flex max-h-[220px] flex-col gap-2 overflow-y-auto pr-1">
            {pulse.drivers && pulse.drivers.length > 0 ? (
              pulse.drivers.map((d, i) => (
                <motion.div
                  key={`${d.label}-${i}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <DriverRow d={d} />
                </motion.div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-violet-200/60 bg-white/40 px-3 py-6 text-center text-xs text-muted-foreground">
                {score == null
                  ? "Upload or link a sheet — your pulse appears here."
                  : "Looking good — no major pressure signals right now."}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
