"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MessageCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Truck,
  ArrowRightLeft,
  AlertTriangle,
  Package,
} from "lucide-react";

function getTypeConfig(notif) {
  const t = notif.type;
  if (t === "restock_order") return { icon: Truck, label: "Restock Order", color: "text-amber-600", bg: "bg-amber-50" };
  if (t === "branch_transfer") return { icon: ArrowRightLeft, label: "Transfer", color: "text-blue-600", bg: "bg-blue-50" };
  if (t === "expiry_alert") return { icon: Clock, label: "Expiry Alert", color: "text-red-600", bg: "bg-red-50" };
  if (t === "low_stock_alert") return { icon: Package, label: "Low Stock", color: "text-orange-600", bg: "bg-orange-50" };
  return { icon: MessageCircle, label: "System", color: "text-primary", bg: "bg-primary/5" };
}

function getStatusBadge(status) {
  switch (status) {
    case "sent":
      return { icon: CheckCircle2, label: "Sent", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200/40" };
    case "failed":
      return { icon: XCircle, label: "Failed", color: "text-red-600", bg: "bg-red-50", border: "border-red-200/40" };
    case "pending":
      return { icon: Clock, label: "Pending", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200/40" };
    default:
      return { icon: MessageCircle, label: "Logged", color: "text-muted-foreground", bg: "bg-muted/30", border: "border-border/40" };
  }
}

export function WhatsAppActivityPanel({ messages = [] }) {
  const [expanded, setExpanded] = useState(false);
  const display = expanded ? messages : messages.slice(0, 4);

  if (messages.length === 0) return null;

  const sentCount = messages.filter((m) => m.whatsappStatus === "sent").length;
  const failedCount = messages.filter((m) => m.whatsappStatus === "failed").length;

  return (
    <Card className="overflow-hidden rounded-2xl border-white/50 bg-white/70 shadow-lg backdrop-blur-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <MessageCircle className="size-4 text-emerald-600" />
            WhatsApp Activity
          </CardTitle>
          <div className="flex items-center gap-2">
            {sentCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                <CheckCircle2 className="size-2.5" /> {sentCount} sent
              </span>
            )}
            {failedCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                <XCircle className="size-2.5" /> {failedCount} failed
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <AnimatePresence mode="popLayout">
          {display.map((msg, i) => {
            const typeConfig = getTypeConfig(msg);
            const TypeIcon = typeConfig.icon;
            const status = getStatusBadge(msg.whatsappStatus);
            const StatusIcon = status.icon;

            return (
              <motion.div
                key={msg._id || `wa_${i}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ delay: i * 0.04 }}
                className={`flex items-start gap-2.5 rounded-xl border ${status.border} bg-white/60 px-3 py-2.5 transition-all hover:bg-white/90`}
              >
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${typeConfig.bg}`}>
                  <TypeIcon className={`size-3.5 ${typeConfig.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${typeConfig.bg} ${typeConfig.color}`}>
                      {typeConfig.label}
                    </span>
                    <span className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${status.bg} ${status.color}`}>
                      <StatusIcon className="size-2.5" />
                      {status.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium leading-snug line-clamp-2">{msg.title}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {new Date(msg.createdAt).toLocaleString("en-IN", {
                      hour: "2-digit", minute: "2-digit", day: "numeric", month: "short",
                    })}
                    {msg.whatsappSid && (
                      <span className="ml-1.5 font-mono text-[9px] text-muted-foreground/60">
                        SID: {msg.whatsappSid.slice(0, 15)}...
                      </span>
                    )}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {messages.length > 4 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1 rounded-lg py-1.5 text-[10px] font-bold text-primary hover:bg-primary/5 transition-colors cursor-pointer"
          >
            {expanded ? (
              <><ChevronUp className="size-3" /> Show less</>
            ) : (
              <><ChevronDown className="size-3" /> Show {messages.length - 4} more</>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
