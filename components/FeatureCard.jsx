"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Gradient color presets for icon backgrounds — warm palette
const ICON_GRADIENTS = [
  "from-indigo-500 to-violet-600",
  "from-emerald-500 to-teal-600",
  "from-rose-400 to-pink-600",
  "from-amber-500 to-orange-500",
  "from-violet-500 to-purple-600",
  "from-cyan-400 to-indigo-500",
];

export function FeatureCard({
  icon: Icon,
  title,
  description,
  className,
  index = 0,
}) {
  const gradient = ICON_GRADIENTS[index % ICON_GRADIENTS.length];

  return (
    <Card
      className={cn(
        "group relative overflow-hidden rounded-2xl border-white/60 bg-white/70 shadow-lg ring-1 ring-border/30 backdrop-blur-md",
        "transition-all duration-300",
        "hover:shadow-2xl hover:ring-primary/20",
        "gradient-border-top",
        className
      )}
    >
      {/* Subtle background glow on hover */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/8 blur-2xl" />
      </div>

      <CardHeader className="pb-3">
        <div
          className={cn(
            "mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md",
            "transition-transform duration-300 group-hover:scale-110 group-hover:shadow-lg",
            gradient
          )}
        >
          {Icon ? <Icon className="size-5" strokeWidth={1.75} /> : null}
        </div>
        <CardTitle className="text-lg font-bold leading-snug tracking-tight">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
