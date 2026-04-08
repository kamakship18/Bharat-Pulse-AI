"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, BarChart3, PieChartIcon } from "lucide-react";

const PIE_COLORS = ["#4f46e5", "#7c3aed", "#0891b2", "#059669"];

const CHART_ICONS = {
  line: TrendingUp,
  bar: BarChart3,
  pie: PieChartIcon,
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/60 bg-white/90 px-4 py-3 text-xs shadow-xl backdrop-blur-md">
      {label != null && (
        <p className="mb-1.5 font-bold text-foreground">{label}</p>
      )}
      {payload.map((p) => (
        <p key={p.dataKey} className="text-muted-foreground">
          {p.name}: <span className="font-bold text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export function ChartCard({
  title,
  description,
  type = "line",
  data = [],
  className,
  dataKey = "value",
  xKey = "name",
  heightClass = "h-[260px]",
}) {
  const Icon = CHART_ICONS[type] || TrendingUp;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden rounded-2xl border-white/50 bg-white/70 shadow-lg backdrop-blur-md ring-1 ring-border/20",
        "transition-all duration-300 hover:shadow-xl",
        className
      )}
    >
      {/* Subtle gradient background */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/3 via-transparent to-violet-500/3" />

      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-violet-500/15 text-primary">
            <Icon className="size-4" strokeWidth={2} />
          </div>
          <div>
            <CardTitle className="text-base font-bold">{title}</CardTitle>
            {description ? (
              <CardDescription className="text-xs">{description}</CardDescription>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("pt-0", heightClass)}>
        <ResponsiveContainer width="100%" height="100%">
          {type === "line" && (
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickFormatter={(v) => `₹${v / 1000}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="sales"
                name="Sales"
                stroke="var(--chart-1)"
                strokeWidth={3}
                dot={{ r: 4, fill: "var(--chart-1)", strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
              />
            </LineChart>
          )}
          {type === "bar" && (
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis dataKey="branch" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="units" name="Units" fill="var(--chart-2)" radius={[10, 10, 0, 0]} />
            </BarChart>
          )}
          {type === "pie" && (
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={56}
                outerRadius={88}
                paddingAngle={4}
                dataKey={dataKey}
                nameKey={xKey}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value) => (
                  <span className="text-muted-foreground">{value}</span>
                )}
              />
            </PieChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
