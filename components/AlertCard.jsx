"use client";

import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AlertCard({ title, items, className }) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden rounded-2xl border-red-200/60 shadow-lg ring-1 ring-red-100/50",
        "bg-gradient-to-br from-red-50/90 via-rose-50/60 to-orange-50/40",
        "transition-all duration-300 hover:shadow-xl",
        className
      )}
    >
      {/* Subtle glow */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-red-200/20 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />

      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-md">
            <AlertTriangle className="size-5" strokeWidth={1.75} />
            {/* Pulse ring */}
            <span className="absolute inset-0 animate-ping rounded-xl bg-red-400/20" style={{ animationDuration: "3s" }} />
          </span>
          <div>
            <CardTitle className="text-lg font-bold text-red-950">
              {title}
            </CardTitle>
            <p className="text-xs font-medium text-red-600/60">Requires attention</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="group/item flex gap-3 rounded-xl border border-red-100/80 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white hover:shadow-md"
          >
            {/* Priority accent bar */}
            <div className="w-1 shrink-0 rounded-full bg-gradient-to-b from-red-500 to-orange-400" />
            <div>
              <p className="text-sm font-bold text-red-950">{item.title}</p>
              {item.detail ? (
                <p className="mt-1 text-xs leading-relaxed text-red-800/70">{item.detail}</p>
              ) : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
