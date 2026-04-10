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
 * Send a test WhatsApp message
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

    const result = await whatsappEngine.sendWhatsApp(phone, message);

    return res.json({
      success: true,
      whatsappAvailable: whatsappEngine.isAvailable(),
      ...result,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
