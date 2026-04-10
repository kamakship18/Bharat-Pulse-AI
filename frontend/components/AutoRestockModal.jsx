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
import { sendRestockOrder } from "@/lib/api";
import {
  Package,
  Send,
  Loader2,
  CheckCircle2,
  Edit3,
  Truck,
  MessageCircle,
  AlertTriangle,
} from "lucide-react";

export function AutoRestockModal({ open, onOpenChange, alert, distributorName = "", distributorPhone = "", onSent }) {
  const product = alert?.productName || alert?.title || "Product";
  const branch = alert?.branch || "Main";
  const currentQty = alert?.quantityAtAlert ?? 0;
  const suggestedQty = Math.max(20, (alert?.minStockLevel || 20) - currentQty + 10);

  const defaultMessage = [
    `Hello ${distributorName || "Distributor"},`,
    ``,
    `Please send ${suggestedQty} units of ${product} to branch ${branch}.`,
    ``,
    `This is an automated order from BharatPulse AI.`,
    `Kindly confirm availability and delivery timeline.`,
  ].join("\n");

  const [quantity, setQuantity] = useState(suggestedQty);
  const [message, setMessage] = useState(defaultMessage);
  const [editing, setEditing] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSend = async () => {
    setSending(true);
    setError("");
    try {
      const res = await sendRestockOrder({
        productId: alert?.productId,
        productName: product,
        quantity,
        branch,
        distributorName: distributorName || undefined,
        distributorPhone: distributorPhone || undefined,
        customMessage: editing ? message : undefined,
      });

      if (res.success) {
        setSent(true);
        setResult(res);
        onSent?.(res);
      } else {
        setError(res.error || "Failed to send.");
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
      setSent(false);
      setResult(null);
      setEditing(false);
      setError("");
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden rounded-2xl border-white/50 bg-white/95 p-0 shadow-2xl backdrop-blur-xl sm:max-w-lg">
        <DialogHeader className="border-b border-border/40 bg-gradient-to-r from-amber-50 via-white/80 to-orange-50 px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Truck className="size-5 text-amber-600" />
            Auto Restock Order
          </DialogTitle>
          <DialogDescription>
            {sent ? "Order sent successfully!" : "Review and send the restock order to your distributor."}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {!sent ? (
            <>
              {/* Alert context */}
              <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200/60 px-4 py-3">
                <AlertTriangle className="size-5 text-red-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-red-700">{product}</p>
                  <p className="text-xs text-red-600">
                    {currentQty === 0 ? "Out of stock" : `Only ${currentQty} units left`} at {branch}
                  </p>
                </div>
              </div>

              {/* Order details */}
              <div className="rounded-xl border border-border/40 bg-white/70 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground">Order Quantity</label>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      min={1}
                      className="rounded-lg bg-white/80 shadow-sm text-sm h-9 font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground">Distributor</label>
                    <p className="text-sm font-semibold text-foreground mt-1.5 flex items-center gap-1.5">
                      <Truck className="size-3.5 text-violet-600" />
                      {distributorName || "Not set — Edit Profile to add"}
                    </p>
                  </div>
                </div>

                {/* Message preview / edit */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                      <MessageCircle className="size-3" /> WhatsApp Message
                    </label>
                    <button
                      onClick={() => setEditing(!editing)}
                      className="text-[10px] font-medium text-primary hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      <Edit3 className="size-2.5" /> {editing ? "Preview" : "Edit"}
                    </button>
                  </div>
                  {editing ? (
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={6}
                      className="w-full rounded-lg border border-border/40 bg-white/80 px-3 py-2 text-xs shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  ) : (
                    <div className="rounded-lg bg-emerald-50/50 border border-emerald-200/40 px-3 py-2.5 text-xs text-emerald-900 whitespace-pre-line leading-relaxed">
                      {message}
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <p className="text-xs font-medium text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex items-center gap-3 pt-1">
                <Button variant="outline" className="rounded-full flex-1" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  className="rounded-full btn-glow flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                  onClick={handleSend}
                  disabled={sending || !quantity}
                >
                  {sending ? (
                    <><Loader2 className="mr-2 size-4 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="mr-2 size-4" /> Send Order</>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200/60 px-4 py-3">
                <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-700">Restock order sent!</p>
                  <p className="text-xs text-emerald-600">
                    {quantity}x {product} → {branch}
                    {result?.sentTo && <> · Sent to {result.sentTo}</>}
                  </p>
                </div>
              </div>

              {result?.whatsappStatus && (
                <div className="space-y-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="size-3.5 text-primary shrink-0" />
                    <p className="text-[10px] font-medium text-primary">
                      WhatsApp: {result.whatsappStatus === "sent" ? "✅ Delivered" : result.whatsappStatus === "failed" ? "❌ Failed" : "📋 Logged in-app"}
                      {result.whatsappSid && <span className="ml-1 text-muted-foreground">({String(result.whatsappSid).slice(0, 12)}...)</span>}
                    </p>
                  </div>
                  {result.whatsappStatus === "failed" && result.whatsappHint && (
                    <p className="text-[10px] leading-snug text-amber-800 bg-amber-50 border border-amber-200/60 rounded-md px-2 py-1.5">
                      {result.whatsappHint}
                    </p>
                  )}
                  {result.whatsappStatus === "failed" && result.whatsappError && (
                    <p className="text-[9px] text-red-600/90 break-words font-mono leading-relaxed">
                      {result.whatsappError}
                    </p>
                  )}
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
