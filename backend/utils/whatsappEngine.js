const Notification = require("../models/Notification");

// ── Twilio setup (optional — works without it via mock mode) ─────────────────

let twilioClient = null;
const TWILIO_FROM = (process.env.TWILIO_WHATSAPP_FROM || "").trim();

function initTwilio() {
  const sid = (process.env.TWILIO_ACCOUNT_SID || "").trim();
  const token = (process.env.TWILIO_AUTH_TOKEN || "").trim();

  if (sid && token && TWILIO_FROM) {
    try {
      const twilio = require("twilio");
      twilioClient = twilio(sid, token);
      console.log("[WhatsApp] ✅ Twilio configured — real WhatsApp delivery enabled.");
      return true;
    } catch (err) {
      console.warn("[WhatsApp] ⚠️ Twilio module not installed. Run: npm install twilio");
      return false;
    }
  }
  console.log("[WhatsApp] ℹ️  No Twilio credentials — using mock mode (console + in-app).");
  return false;
}

function isAvailable() {
  return !!twilioClient;
}

/**
 * Twilio expects whatsapp:+E164. Accepts 10-digit Indian numbers, +91…, spaces, etc.
 */
function normalizeWhatsAppTo(to) {
  if (to == null || to === "") return null;
  let s = String(to).trim();
  s = s.replace(/^whatsapp:/i, "");
  const digits = s.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  if (s.startsWith("+") && digits.length >= 10) {
    return `+${digits}`;
  }
  if (digits.length >= 10) {
    return `+${digits}`;
  }
  return null;
}

// ── Message formatting ───────────────────────────────────────────────────────

function formatAlertMessage(alert, recommendation) {
  let msg = "";

  if (alert.type === "expiring_soon") {
    msg += `⚠️ *EXPIRY ALERT*\n`;
    msg += `${alert.message}\n`;
  } else if (alert.type === "low_stock" || alert.type === "out_of_stock") {
    msg += `📦 *LOW STOCK ALERT*\n`;
    msg += `${alert.message}\n`;
  } else if (alert.type === "overstock") {
    msg += `📦 *OVERSTOCK ALERT*\n`;
    msg += `${alert.message}\n`;
  }

  if (alert.branch) {
    msg += `📍 Branch: ${alert.branch}\n`;
  }

  if (recommendation) {
    msg += `\n💡 *Suggestion:* ${recommendation.suggestion || recommendation}\n`;
  }

  msg += `\n🤖 _BharatPulse AI_ | ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`;
  return msg;
}

// ── Send WhatsApp message ────────────────────────────────────────────────────

async function sendWhatsApp(to, message) {
  console.log(`📤 [WhatsApp] Sending message:`, {
    to,
    messagePreview: message.slice(0, 100) + (message.length > 100 ? "..." : ""),
    twilioEnabled: !!twilioClient,
    timestamp: new Date().toISOString(),
  });

  if (!twilioClient) {
    console.log(`[WhatsApp/Mock] 📱 Would send to ${to}:\n${message}\n`);
    return { success: true, mock: true, sid: `mock_${Date.now()}` };
  }

  const normalized = normalizeWhatsAppTo(to);
  if (!normalized) {
    console.error(`[WhatsApp] Invalid destination: ${to}`);
    return { success: false, mock: false, error: "Invalid phone number for WhatsApp." };
  }

  try {
    const result = await twilioClient.messages.create({
      from: `whatsapp:${TWILIO_FROM}`,
      to: `whatsapp:${normalized}`,
      body: message,
    });
    console.log(`[WhatsApp] ✅ Sent to ${normalized} — SID: ${result.sid}`);
    return { success: true, mock: false, sid: result.sid };
  } catch (err) {
    console.error(`[WhatsApp] ❌ Failed to send to ${normalized}: ${err.message}`);
    return { success: false, mock: false, error: err.message };
  }
}

// ── Send and persist any message type ────────────────────────────────────────

/**
 * sendAndLog — send a WhatsApp message and save a Notification record.
 * Works for restock orders, transfers, alerts, or any custom message.
 */
async function sendAndLog({ userId, to, message, title, type = "system", severity = "info", alertId = null }) {
  const channels = ["inapp"];
  let whatsappStatus = "skipped";
  let whatsappSid = null;
  let whatsappError = null;

  if (to) {
    const result = await sendWhatsApp(to, message);
    if (result.success) {
      channels.push("whatsapp");
      whatsappStatus = "sent";
      whatsappSid = result.sid;
    } else if (result.mock) {
      channels.push("whatsapp");
      whatsappStatus = "sent";
      whatsappSid = result.sid;
    } else {
      whatsappStatus = "failed";
      whatsappError = result.error || "Unknown Twilio error";
    }
  }

  // Persist notification
  if (userId) {
    try {
      const notification = await Notification.create({
        userId,
        alertId,
        type,
        title,
        message,
        severity,
        channels,
        whatsappStatus,
        whatsappSid,
      });
      return { success: true, notification, whatsappStatus, whatsappSid, whatsappError };
    } catch (err) {
      if (err.code !== 11000) {
        console.error("[WhatsApp] Failed to save notification:", err.message);
      }
    }
  }

  return { success: true, whatsappStatus, whatsappSid, whatsappError, mock: !twilioClient };
}

// ── Notify user about an alert ───────────────────────────────────────────────

async function notifyAlert(alert, rec, userPhone) {
  if (!alert.userId) {
    const message = formatAlertMessage(alert, rec);
    if (userPhone && (alert.severity === "critical" || alert.severity === "warning")) {
      await sendWhatsApp(userPhone, message);
    }
    return null;
  }

  if (alert._id) {
    const existing = await Notification.findOne({
      alertId: alert._id,
      type: mapAlertType(alert.type),
    });
    if (existing) {
      return existing;
    }
  }

  const message = formatAlertMessage(alert, rec);
  const channels = ["inapp"];
  let whatsappStatus = "skipped";
  let whatsappSid = null;

  if (userPhone && (alert.severity === "critical" || alert.severity === "warning")) {
    const result = await sendWhatsApp(userPhone, message);
    if (result.success) {
      channels.push("whatsapp");
      whatsappStatus = "sent";
      whatsappSid = result.sid;
    } else if (!result.mock) {
      whatsappStatus = "failed";
    } else {
      channels.push("whatsapp");
      whatsappStatus = "sent";
    }
  }

  try {
    const notification = await Notification.create({
      userId: alert.userId,
      alertId: alert._id || null,
      type: mapAlertType(alert.type),
      title: buildTitle(alert),
      message,
      severity: alert.severity,
      channels,
      whatsappStatus,
      whatsappSid,
    });

    return notification;
  } catch (err) {
    if (err.code === 11000) {
      return null;
    }
    console.error("[WhatsApp] Failed to save notification:", err.message);
    return null;
  }
}

function mapAlertType(type) {
  switch (type) {
    case "expiring_soon": return "expiry_alert";
    case "low_stock":
    case "out_of_stock": return "low_stock_alert";
    default: return "system";
  }
}

function buildTitle(alert) {
  if (alert.type === "expiring_soon") return `${alert.productName} — Expiry Alert`;
  if (alert.type === "low_stock") return `${alert.productName} — Low Stock`;
  if (alert.type === "out_of_stock") return `${alert.productName} — Out of Stock`;
  if (alert.type === "overstock") return `${alert.productName} — Overstock Warning`;
  return `Alert: ${alert.productName}`;
}

// ── Batch notify ─────────────────────────────────────────────────────────────

async function notifyAlerts(alerts, recsMap = {}, userPhone = null) {
  let sent = 0;
  for (const alert of alerts) {
    const rec = recsMap[alert.productId] || null;
    const result = await notifyAlert(alert, rec, userPhone);
    if (result) sent++;
    if (twilioClient && userPhone) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  if (sent > 0) {
    console.log(`[WhatsApp] Processed ${sent}/${alerts.length} notification(s).`);
  }
  return sent;
}

module.exports = {
  initTwilio,
  isAvailable,
  normalizeWhatsAppTo,
  sendWhatsApp,
  sendAndLog,
  notifyAlert,
  notifyAlerts,
  formatAlertMessage,
};
