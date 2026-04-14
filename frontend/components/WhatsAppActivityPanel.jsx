"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MessageCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRightLeft,
  Send,
  Loader2,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { sendWhatsAppReport } from "@/lib/api";

const TO_NUMBER = "+Testing";

// ── helpers ──────────────────────────────────────────────────────────────────

function severityDot(sev) {
  if (sev === "critical") return "bg-red-500";
  if (sev === "warning") return "bg-amber-400";
  return "bg-emerald-400";
}

function ActivityBadge({ status }) {
  const map = {
    sent: { icon: CheckCircle2, label: "Sent", cls: "text-emerald-600 bg-emerald-50" },
    failed: { icon: XCircle, label: "Failed", cls: "text-red-600 bg-red-50" },
    pending: { icon: Clock, label: "Pending", cls: "text-amber-600 bg-amber-50" },
  };
  const cfg = map[status] || { icon: MessageCircle, label: "Logged", cls: "text-muted-foreground bg-muted/30" };
  const Icon = cfg.icon;
  return (
    <span className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${cfg.cls}`}>
      <Icon className="size-2.5" /> {cfg.label}
    </span>
  );
}

// ── Selectable item row ───────────────────────────────────────────────────────

function SelectableItem({ item, checked, onToggle }) {
  const Icon = item.kind === "alert" ? AlertTriangle
    : item.kind === "recommendation" ? Lightbulb
      : ArrowRightLeft;
  const iconColor = item.kind === "alert"
    ? (item.severity === "critical" ? "text-red-500" : "text-amber-500")
    : item.kind === "recommendation" ? "text-blue-500"
      : "text-purple-500";
  const bg = item.kind === "alert"
    ? (item.severity === "critical" ? "bg-red-50" : "bg-amber-50")
    : item.kind === "recommendation" ? "bg-blue-50"
      : "bg-purple-50";

  return (
    <label className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-all ${checked ? "border-emerald-300 bg-emerald-50/60" : "border-border/40 bg-white/60 hover:bg-white/90"
      }`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(item.id)}
        className="mt-0.5 accent-emerald-600"
      />
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${bg}`}>
        <Icon className={`size-3 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold leading-snug line-clamp-1">{item.label}</p>
        {item.detail && item.detail !== item.label && (
          <p className="mt-0.5 text-[10px] text-muted-foreground line-clamp-1">{item.detail}</p>
        )}
      </div>
      {item.severity && (
        <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${severityDot(item.severity)}`} />
      )}
    </label>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────

export function WhatsAppActivityPanel({ alerts = [], recommendations = [], transfers = [], messages = [], onRefresh }) {
  // Show only most important items — top 3 critical/warning alerts, top 2 recs, top 2 transfers
  const topAlerts = alerts
    .filter((a) => a.severity === "critical" || a.severity === "warning")
    .slice(0, 3);
  const topRecs = recommendations.slice(0, 2);
  const topTransfers = transfers.slice(0, 2);

  const allItems = [
    ...topAlerts.map((a) => ({
      id: `alert_${a.id}`,
      kind: "alert",
      label: a.title || a.detail,
      detail: a.detail,
      severity: a.severity,
    })),
    ...topRecs.map((r) => ({
      id: `rec_${r.id}`,
      kind: "recommendation",
      label: r.title,
      detail: r.detail,
      severity: null,
    })),
    ...topTransfers.map((t, i) => ({
      id: t.id ? `xfer_${t.id}` : `xfer_${i}_${String(t.productId ?? "p")}_${t.fromBranch ?? ""}_${t.toBranch ?? ""}`,
      kind: "transfer",
      label: `Move ${t.quantity ?? "?"} × ${t.productName} — ${t.fromBranch} → ${t.toBranch}`,
      detail: t.reason || t.reasoning || null,
      severity: null,
    })),
  ];

  const [selected, setSelected] = useState(() => new Set(allItems.map((i) => i.id)));
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null); // { ok, text }

  function toggleItem(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === allItems.length ? new Set() : new Set(allItems.map((i) => i.id))
    );
  }

  async function handleSend() {
    const chosenItems = allItems.filter((i) => selected.has(i.id));
    if (!chosenItems.length) return;
    setSending(true);
    setStatusMsg(null);
    try {
      const res = await sendWhatsAppReport({
        to: TO_NUMBER,
        items: chosenItems.map((i) => ({
          kind: i.kind,
          label: i.label,
          detail: i.detail || "",
          severity: i.severity || "info",
        })),
      });
      if (res.success || res.whatsappStatus === "sent") {
        setStatusMsg({ ok: true, text: `Sent ${chosenItems.length} item${chosenItems.length > 1 ? "s" : ""} to WhatsApp!` });
        if (onRefresh) onRefresh();
      } else {
        const raw = res.error || "";
        const needsJoin = raw.includes("63007") || raw.includes("63016") || raw.includes("channel capability");
        setStatusMsg({
          ok: false,
          text: needsJoin
            ? 'Sandbox opt-in needed: WhatsApp +14155238886 → send "join <your-word>"'
            : raw || "Send failed.",
        });
      }
    } catch (err) {
      setStatusMsg({ ok: false, text: err.message || "Network error." });
    } finally {
      setSending(false);
      setTimeout(() => setStatusMsg(null), 6000);
    }
  }

  const histDisplay = messages.slice(0, 2);
  const sentCount = messages.filter((m) => m.whatsappStatus === "sent").length;
  const failedCount = messages.filter((m) => m.whatsappStatus === "failed").length;

  const alertItems = allItems.filter((i) => i.kind === "alert");
  const recItems = allItems.filter((i) => i.kind === "recommendation");
  const xferItems = allItems.filter((i) => i.kind === "transfer");

  return (
    <Card className="overflow-hidden rounded-2xl border-white/50 bg-white/70 shadow-lg backdrop-blur-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <MessageCircle className="size-4 text-emerald-600" />
            Send to WhatsApp
          </CardTitle>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            {TO_NUMBER}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">

        {allItems.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/40 py-6 text-center text-xs text-muted-foreground">
            No alerts or recommendations yet — sync a sheet to generate data.
          </p>
        ) : (
          <>
            {/* Select all */}
            <div className="flex items-center justify-between">
              <button
                onClick={toggleAll}
                className="text-[10px] font-semibold text-primary hover:underline"
              >
                {selected.size === allItems.length ? "Deselect all" : "Select all"}
              </button>
              <span className="text-[10px] text-muted-foreground">
                {selected.size} / {allItems.length} selected
              </span>
            </div>

            {/* Alerts section */}
            {alertItems.length > 0 && (
              <div className="space-y-1.5">
                <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-red-500">
                  <AlertTriangle className="size-3" /> Alerts ({alertItems.length})
                </p>
                {alertItems.map((item) => (
                  <SelectableItem key={item.id} item={item} checked={selected.has(item.id)} onToggle={toggleItem} />
                ))}
              </div>
            )}

            {/* Recommendations section */}
            {recItems.length > 0 && (
              <div className="space-y-1.5">
                <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-blue-500">
                  <Lightbulb className="size-3" /> AI Recommendations ({recItems.length})
                </p>
                {recItems.map((item) => (
                  <SelectableItem key={item.id} item={item} checked={selected.has(item.id)} onToggle={toggleItem} />
                ))}
              </div>
            )}

            {/* Transfers section */}
            {xferItems.length > 0 && (
              <div className="space-y-1.5">
                <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-purple-500">
                  <ArrowRightLeft className="size-3" /> Transfer Suggestions ({xferItems.length})
                </p>
                {xferItems.map((item) => (
                  <SelectableItem key={item.id} item={item} checked={selected.has(item.id)} onToggle={toggleItem} />
                ))}
              </div>
            )}

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={sending || selected.size === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {sending ? "Sending…" : `Send ${selected.size > 0 ? `(${selected.size})` : ""} to WhatsApp`}
            </button>

            {/* Status feedback */}
            <AnimatePresence>
              {statusMsg && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`rounded-lg px-3 py-2 text-[11px] font-medium ${statusMsg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                    }`}
                >
                  {statusMsg.ok ? "✅" : "❌"} {statusMsg.text}
                </motion.p>
              )}
            </AnimatePresence>
          </>
        )}

        {/* ── Activity log ── */}
        {messages.length > 0 && (
          <div className="space-y-1.5 border-t border-border/30 pt-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Recent Activity
              </p>
              <div className="flex gap-1.5">
                {sentCount > 0 && (
                  <span className="flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">
                    <CheckCircle2 className="size-2.5" /> {sentCount}
                  </span>
                )}
                {failedCount > 0 && (
                  <span className="flex items-center gap-0.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-bold text-red-600">
                    <XCircle className="size-2.5" /> {failedCount}
                  </span>
                )}
              </div>
            </div>

            <AnimatePresence mode="popLayout">
              {histDisplay.map((msg, i) => (
                <motion.div
                  key={msg._id || `wa_${i}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-2 rounded-lg bg-white/60 px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium line-clamp-1">{msg.title}</p>
                    <p className="text-[9px] text-muted-foreground">
                      {new Date(msg.createdAt).toLocaleString("en-IN", {
                        hour: "2-digit", minute: "2-digit", day: "numeric", month: "short",
                      })}
                    </p>
                  </div>
                  <ActivityBadge status={msg.whatsappStatus} />
                </motion.div>
              ))}
            </AnimatePresence>

            {messages.length > 2 && (
              <p className="text-center text-[10px] text-muted-foreground">
                +{messages.length - 2} more in notifications
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
