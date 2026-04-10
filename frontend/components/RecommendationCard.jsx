"use client";

import { Lightbulb, ArrowRight, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function RecommendationCard({ title, items, className, transferSuggestions = [], onInitiateTransfer }) {
  const allItems = [
    ...items,
    ...transferSuggestions.map((s) => ({
      id: s.id,
      title: `Transfer ${s.quantity}x ${s.productName}`,
      detail: `Move from ${s.fromBranch} (${s.fromStock} units) → ${s.toBranch} (${s.toStock} units)`,
      impact: s.priority === "urgent" ? "Critical" : s.priority === "high" ? "High" : "Medium",
      isTransfer: true,
      suggestion: s,
    })),
  ];

  return (
    <Card
      className={cn(
        "group relative overflow-hidden rounded-2xl border-emerald-200/60 shadow-lg ring-1 ring-emerald-100/50",
        "bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-sky-50/30",
        "transition-all duration-300 hover:shadow-xl",
        className
      )}
    >
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
        {allItems.map((item) => (
          <div
            key={item.id}
            className={cn(
              "group/item flex items-start gap-3 rounded-xl border bg-white/70 px-4 py-3 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white hover:shadow-md",
              item.isTransfer ? "border-blue-200/60" : "border-emerald-100/80"
            )}
          >
            <div className={cn(
              "mt-0.5 w-1 shrink-0 self-stretch rounded-full bg-gradient-to-b",
              item.isTransfer ? "from-blue-500 to-indigo-400" : "from-emerald-500 to-teal-400"
            )} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {item.isTransfer && (
                  <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">
                    TRANSFER
                  </span>
                )}
                <p className={cn("text-sm font-bold", item.isTransfer ? "text-blue-950" : "text-emerald-950")}>
                  {item.title}
                </p>
              </div>
              {item.detail && (
                <p className="mt-1 text-xs leading-relaxed text-emerald-900/65">{item.detail}</p>
              )}
            </div>
            {item.isTransfer && onInitiateTransfer ? (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 h-7 rounded-full text-[10px] font-bold border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                onClick={() => onInitiateTransfer(item.suggestion)}
              >
                <ArrowRightLeft className="mr-1 size-3" />
                Transfer
              </Button>
            ) : (
              <ArrowRight className="mt-0.5 size-4 shrink-0 text-emerald-400 opacity-0 transition-opacity group-hover/item:opacity-100" />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
