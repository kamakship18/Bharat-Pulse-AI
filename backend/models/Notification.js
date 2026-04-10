const mongoose = require("mongoose");

/**
 * Notification — records alert messages sent via WhatsApp / in-app.
 * Used for the notification panel and for de-duplicating WhatsApp sends.
 */
const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Link back to the alert that triggered this notification
    alertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Alert",
      default: null,
    },

    // ── Content ───────────────────────────────────────────────────────────────
    type: {
      type: String,
      enum: ["expiry_alert", "low_stock_alert", "recommendation", "system", "restock_order", "branch_transfer"],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "info",
    },

    // ── Delivery ──────────────────────────────────────────────────────────────
    channels: { type: [String], default: ["inapp"] }, // ["whatsapp", "inapp"]
    whatsappStatus: {
      type: String,
      enum: ["pending", "sent", "failed", "skipped"],
      default: "skipped",
    },
    whatsappSid: { type: String, default: null }, // Twilio message SID

    // ── Read status ───────────────────────────────────────────────────────────
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "notifications",
  }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
// Prevent duplicate notifications for the same alert
NotificationSchema.index({ alertId: 1, type: 1 }, { sparse: true });

module.exports = mongoose.model("Notification", NotificationSchema);
