"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Package,
  AlertTriangle,
  Lightbulb,
  GitBranch,
  Camera,
  Brain,
} from "lucide-react";

/* ── Node configuration ── */
const ORBIT_NODES = [
  {
    id: "sales",
    label: "Sales Data",
    icon: BarChart3,
    ring: 1,
    angle: 30,
    glow: "rgba(79, 70, 229, 0.25)",       // indigo
    iconBg: "from-indigo-400 to-indigo-600",
    iconColor: "text-white",
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: Package,
    ring: 1,
    angle: 150,
    glow: "rgba(255, 153, 51, 0.25)",       // saffron
    iconBg: "from-amber-400 to-orange-500",
    iconColor: "text-white",
  },
  {
    id: "alerts",
    label: "Alerts",
    icon: AlertTriangle,
    ring: 1,
    angle: 270,
    glow: "rgba(239, 68, 68, 0.2)",         // red
    iconBg: "from-red-400 to-rose-600",
    iconColor: "text-white",
  },
  {
    id: "recs",
    label: "Recommendations",
    icon: Lightbulb,
    ring: 2,
    angle: 0,
    glow: "rgba(16, 185, 129, 0.25)",       // green (India)
    iconBg: "from-emerald-400 to-teal-600",
    iconColor: "text-white",
  },
  {
    id: "branch",
    label: "Branch Insights",
    icon: GitBranch,
    ring: 2,
    angle: 120,
    glow: "rgba(124, 58, 237, 0.2)",        // violet
    iconBg: "from-violet-400 to-purple-600",
    iconColor: "text-white",
  },
  {
    id: "image",
    label: "Image Input",
    icon: Camera,
    ring: 2,
    angle: 240,
    glow: "rgba(6, 182, 212, 0.2)",         // cyan
    iconBg: "from-cyan-400 to-sky-600",
    iconColor: "text-white",
  },
];

/* ── Ring radii (px) ── */
const RING_CONFIG = {
  1: { radius: 130, duration: 38, direction: 1 },
  2: { radius: 210, duration: 50, direction: -1 },
};

/* ── OrbitNode component ── */
function OrbitNode({ node, ring }) {
  const [hovered, setHovered] = useState(false);
  const Icon = node.icon;

  return (
    <div
      className="absolute left-1/2 top-1/2"
      style={{
        /* position on the ring at the initial angle — the ring itself rotates */
        transform: `translate(-50%, -50%) rotate(${node.angle}deg) translateX(${ring.radius}px)`,
      }}
    >
      {/* Counter-rotate so icon stays upright */}
      <div
        className="orbit-counter-rotate"
        style={{
          /* We counter the ring rotation AND the node's own placement angle */
          "--counter-angle": `${node.angle}deg`,
          "--counter-direction": ring.direction === 1 ? "-1" : "1",
          "--counter-duration": `${ring.duration}s`,
        }}
      >
        <motion.div
          className="relative flex cursor-pointer items-center justify-center"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          animate={hovered ? { scale: 1.18 } : { scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          {/* Glow */}
          <div
            className="absolute inset-0 rounded-2xl transition-all duration-500"
            style={{
              boxShadow: hovered
                ? `0 0 28px 8px ${node.glow}, 0 4px 20px ${node.glow}`
                : `0 0 14px 2px ${node.glow}`,
            }}
          />

          {/* Node card */}
          <div
            className={cn(
              "relative flex h-12 w-12 items-center justify-center rounded-2xl",
              "border border-white/60 bg-white/80 shadow-lg backdrop-blur-md",
              "transition-all duration-300",
              hovered && "bg-white/95 shadow-xl"
            )}
          >
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm",
                node.iconBg
              )}
            >
              <Icon className={cn("size-4", node.iconColor)} strokeWidth={1.75} />
            </div>
          </div>

          {/* Tooltip */}
          <motion.div
            className="pointer-events-none absolute -bottom-9 left-1/2 whitespace-nowrap rounded-full border border-white/50 bg-white/90 px-3 py-1 text-[10px] font-bold text-foreground shadow-lg backdrop-blur-md"
            style={{ x: "-50%" }}
            initial={{ opacity: 0, y: -4 }}
            animate={hovered ? { opacity: 1, y: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {node.label}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

/* ── Main orbit visualization ── */
export function OrbitVisualization({ className }) {
  return (
    <div
      className={cn(
        "relative flex aspect-square w-full max-w-[500px] items-center justify-center",
        className
      )}
    >
      {/* ── Orbit ring guides ── */}
      {Object.entries(RING_CONFIG).map(([id, ring]) => (
        <div
          key={id}
          className="absolute left-1/2 top-1/2 rounded-full border border-primary/8"
          style={{
            width: ring.radius * 2,
            height: ring.radius * 2,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}

      {/* Extra decorative outer ring — dashed */}
      <div
        className="absolute left-1/2 top-1/2 rounded-full border border-dashed border-primary/5"
        style={{
          width: RING_CONFIG[2].radius * 2 + 70,
          height: RING_CONFIG[2].radius * 2 + 70,
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* ── Tiny floating dots (decorative particles) ── */}
      {[248, 257, 252, 261, 245].map((dist, i) => {
        const angle = i * 72;
        return (
          <motion.div
            key={`dot-${i}`}
            className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-primary/20"
            style={{
              transform: `translate(-50%, -50%) rotate(${angle}deg) translateX(${dist}px)`,
            }}
            animate={{ opacity: [0.15, 0.5, 0.15] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
          />
        );
      })}

      {/* ── Rotating rings holding nodes ── */}
      {Object.entries(RING_CONFIG).map(([ringId, ring]) => {
        const nodes = ORBIT_NODES.filter((n) => n.ring === Number(ringId));
        return (
          <div
            key={ringId}
            className="orbit-ring absolute left-1/2 top-1/2"
            style={{
              width: ring.radius * 2,
              height: ring.radius * 2,
              transform: "translate(-50%, -50%)",
              "--orbit-duration": `${ring.duration}s`,
              "--orbit-direction": ring.direction === 1 ? "normal" : "reverse",
            }}
          >
            {nodes.map((node) => (
              <OrbitNode key={node.id} node={node} ring={ring} />
            ))}
          </div>
        );
      })}

      {/* ── CENTER ELEMENT ── */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* Outer pulse ring */}
        <div className="absolute h-36 w-36 rounded-full bg-primary/8 animate-pulse-glow" />

        {/* Inner glow */}
        <div className="absolute h-28 w-28 rounded-full bg-gradient-to-br from-primary/10 to-violet-500/10 blur-sm" />

        {/* Core circle */}
        <motion.div
          className={cn(
            "relative flex h-28 w-28 flex-col items-center justify-center rounded-full",
            "border border-white/60 bg-white/85 shadow-2xl backdrop-blur-xl",
            "ring-2 ring-primary/15"
          )}
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Brain className="mb-1 size-7 text-primary" strokeWidth={1.5} />
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-primary">
            BharatPulse
          </span>
          <span className="text-[8px] font-bold text-muted-foreground">AI Engine</span>
        </motion.div>

        {/* Connector lines radiating from center to ring 1 */}
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <div
            key={`line-${angle}`}
            className="absolute left-1/2 top-1/2 origin-left"
            style={{
              width: RING_CONFIG[1].radius - 56,
              height: "1px",
              background: "linear-gradient(90deg, rgba(79,70,229,0.08) 0%, transparent 100%)",
              transform: `translate(0, -50%) rotate(${angle}deg)`,
              transformOrigin: "0 50%",
            }}
          />
        ))}
      </div>
    </div>
  );
}
