const express = require("express");
const authMiddleware = require("../utils/authMiddleware");
const Notification = require("../models/Notification");
const whatsappEngine = require("../utils/whatsappEngine");

const router = express.Router();

/**
 * GET /api/notifications
 * List notifications for current user
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 30, unreadOnly = "false" } = req.query;
    const filter = { userId: req.userId };
    if (unreadOnly === "true") filter.read = false;

    const skip = (Math.max(1, Number(page)) - 1) * Math.min(50, Number(limit));

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Math.min(50, Number(limit)))
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId: req.userId, read: false }),
    ]);

    return res.json({
      success: true,
      total,
      unreadCount,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      notifications,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/notifications/mark-read
 * Mark notifications as read
 */
router.post("/mark-read", authMiddleware, async (req, res) => {
  try {
    const { ids } = req.body; // Array of notification IDs, or "all"

    if (ids === "all") {
      await Notification.updateMany(
        { userId: req.userId, read: false },
        { $set: { read: true, readAt: new Date() } }
      );
    } else if (Array.isArray(ids)) {
      await Notification.updateMany(
        { _id: { $in: ids }, userId: req.userId },
        { $set: { read: true, readAt: new Date() } }
      );
    }

    return res.json({ success: true, message: "Marked as read." });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/notifications/test-whatsapp
 * Send a test WhatsApp message and log it as a notification
 */
router.post("/test-whatsapp", authMiddleware, async (req, res) => {
  try {
    const { to } = req.body;
    const phone = to || req.body.phoneNumber;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: "Phone number required.",
      });
    }

    const message = `✅ *BharatPulse AI — Test Message*\n\nYour WhatsApp integration is working!\n\n🤖 _Sent at ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}_`;

    const result = await whatsappEngine.sendAndLog({
      userId: req.userId,
      to: phone,
      message,
      title: "WhatsApp Test — Integration Verified",
      type: "system",
      severity: "info",
    });

    return res.json({
      success: result.whatsappStatus !== "failed",
      whatsappAvailable: whatsappEngine.isAvailable(),
      whatsappStatus: result.whatsappStatus,
      whatsappSid: result.whatsappSid,
      mock: result.mock,
      error: result.whatsappError || null,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/notifications/send-report
 * Send a formatted WhatsApp report of selected alerts/recommendations/transfers
 * Body: { to, items: [{ kind, label, detail, severity }] }
 */
router.post("/send-report", authMiddleware, async (req, res) => {
  try {
    const { to, items = [] } = req.body;
    const phone = to;

    if (!phone) return res.status(400).json({ success: false, error: "Phone number required." });
    if (!items.length) return res.status(400).json({ success: false, error: "No items selected." });

    const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    const alerts = items.filter((i) => i.kind === "alert");
    const recs   = items.filter((i) => i.kind === "recommendation");
    const xfers  = items.filter((i) => i.kind === "transfer");

    let message = `📊 *BharatPulse AI — Store Report*\n🕐 ${now}\n`;

    if (alerts.length) {
      message += `\n⚠️ *ALERTS (${alerts.length})*\n`;
      alerts.forEach((a) => {
        const sev = a.severity === "critical" ? "🔴" : a.severity === "warning" ? "🟡" : "🟢";
        message += `${sev} ${a.label}\n`;
        if (a.detail) message += `   _${a.detail}_\n`;
      });
    }

    if (recs.length) {
      message += `\n💡 *AI RECOMMENDATIONS (${recs.length})*\n`;
      recs.forEach((r) => {
        message += `• ${r.label}\n`;
        if (r.detail && r.detail !== r.label) message += `   _${r.detail}_\n`;
      });
    }

    if (xfers.length) {
      message += `\n🔄 *TRANSFER SUGGESTIONS (${xfers.length})*\n`;
      xfers.forEach((t) => {
        message += `• ${t.label}\n`;
      });
    }

    message += `\n🤖 _BharatPulse AI_`;

    const result = await whatsappEngine.sendAndLog({
      userId: req.userId,
      to: phone,
      message,
      title: `Store Report — ${items.length} item${items.length !== 1 ? "s" : ""}`,
      type: "system",
      severity: alerts.some((a) => a.severity === "critical") ? "critical" : alerts.length ? "warning" : "info",
    });

    return res.json({
      success: result.whatsappStatus !== "failed",
      whatsappStatus: result.whatsappStatus,
      whatsappSid: result.whatsappSid,
      error: result.whatsappError || null,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
