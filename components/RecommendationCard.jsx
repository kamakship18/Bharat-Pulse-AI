"use client";

import { Lightbulb, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function RecommendationCard({ title, items, className }) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden rounded-2xl border-emerald-200/60 shadow-lg ring-1 ring-emerald-100/50",
        "bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-sky-50/30",
        "transition-all duration-300 hover:shadow-xl",
        className
      )}
    >
      {/* Subtle glow */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-emerald-200/20 blur-2xl" />

      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
            <Lightbulb className="size-5" strokeWidth={1.75} />
          </span>
          <div>
            <CardTitle className="text-lg font-bold text-emerald-950">
              {title}
            </CardTitle>
            <p className="text-xs font-medium text-emerald-600/60">Actionable insights</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="group/item flex items-start gap-3 rounded-xl border border-emerald-100/80 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white hover:shadow-md"
          >
            {/* Priority accent bar */}
            <div className="mt-0.5 w-1 shrink-0 self-stretch rounded-full bg-gradient-to-b from-emerald-500 to-teal-400" />
            <div className="flex-1">
              <p className="text-sm font-bold text-emerald-950">{item.title}</p>
              {item.detail ? (
                <p className="mt-1 text-xs leading-relaxed text-emerald-900/65">{item.detail}</p>
              ) : null}
            </div>
            <ArrowRight className="mt-0.5 size-4 shrink-0 text-emerald-400 opacity-0 transition-opacity group-hover/item:opacity-100" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
