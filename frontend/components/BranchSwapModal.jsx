"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { initiateTransfer } from "@/lib/api";
import {
  ArrowRightLeft,
  Send,
  Loader2,
  CheckCircle2,
  MapPin,
  Package,
  MessageCircle,
  ArrowRight,
} from "lucide-react";

export function BranchSwapModal({ open, onOpenChange, suggestion, onComplete }) {
  const s = suggestion || {};
  const [quantity, setQuantity] = useState(s.quantity || 10);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleTransfer = async () => {
    setSending(true);
    setError("");
    try {
      const res = await initiateTransfer({
        productId: s.productId,
        productName: s.productName,
        fromBranch: s.fromBranch,
        toBranch: s.toBranch,
        quantity,
      });
      if (res.success) {
        setDone(true);
        setResult(res);
        onComplete?.(res);
      } else {
        setError(res.error || "Transfer failed.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setDone(false);
      setResult(null);
      setError("");
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden rounded-2xl border-white/50 bg-white/95 p-0 shadow-2xl backdrop-blur-xl sm:max-w-lg">
        <DialogHeader className="border-b border-border/40 bg-gradient-to-r from-blue-50 via-white/80 to-indigo-50 px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <ArrowRightLeft className="size-5 text-blue-600" />
            Internal Branch Transfer
          </DialogTitle>
          <DialogDescription>
            {done ? "Transfer completed!" : "Move surplus stock to where it's needed."}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {!done ? (
            <>
              {/* Transfer visualization */}
              <div className="rounded-xl border border-blue-200/40 bg-blue-50/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  {/* From */}
                  <div className="flex-1 rounded-xl bg-white/80 border border-border/30 p-3 text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">From</p>
                    <p className="text-sm font-bold flex items-center justify-center gap-1 mt-1">
                      <MapPin className="size-3.5 text-blue-600" /> {s.fromBranch}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.fromStock} units</p>
                  </div>

                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <ArrowRight className="size-5 text-blue-500" />
                    <span className="text-[10px] font-bold text-blue-600">{quantity} units</span>
                  </div>

                  {/* To */}
                  <div className="flex-1 rounded-xl bg-white/80 border border-border/30 p-3 text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">To</p>
                    <p className="text-sm font-bold flex items-center justify-center gap-1 mt-1">
                      <MapPin className="size-3.5 text-emerald-600" /> {s.toBranch}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.toStock} units</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/60 px-3 py-2">
                  <Package className="size-3.5 text-primary" />
                  <p className="text-xs font-bold">{s.productName}</p>
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Transfer Quantity</label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  min={1}
                  max={s.fromStock || 999}
                  className="rounded-xl bg-white/80 shadow-sm font-bold"
                />
                <p className="text-[10px] text-muted-foreground">
                  Max: {Math.max(0, (s.fromStock || 0) - (s.fromMinStock || 0))} units (keeping min stock at {s.fromBranch})
                </p>
              </div>

              {/* Reason */}
              <div className="rounded-lg bg-amber-50/50 border border-amber-200/40 px-3 py-2.5">
                <p className="text-xs text-amber-800">{s.reason}</p>
              </div>

              {error && (
                <p className="text-xs font-medium text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex items-center gap-3 pt-1">
                <Button variant="outline" className="rounded-full flex-1" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  className="rounded-full btn-glow flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                  onClick={handleTransfer}
                  disabled={sending || quantity <= 0}
                >
                  {sending ? (
                    <><Loader2 className="mr-2 size-4 animate-spin" /> Transferring...</>
                  ) : (
                    <><ArrowRightLeft className="mr-2 size-4" /> Initiate Transfer</>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200/60 px-4 py-3">
                <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-700">Transfer completed!</p>
                  <p className="text-xs text-emerald-600">
                    {quantity}x {s.productName}: {s.fromBranch} → {s.toBranch}
                  </p>
                </div>
              </div>

              {result?.whatsappStatus && (
                <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
                  <MessageCircle className="size-3.5 text-primary" />
                  <p className="text-[10px] font-medium text-primary">
                    WhatsApp: {result.whatsappStatus === "sent" ? "✅ Notification sent" : "📋 Logged in-app"}
                  </p>
                </div>
              )}

              <Button className="rounded-full w-full" onClick={handleClose}>
                Done
              </Button>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
