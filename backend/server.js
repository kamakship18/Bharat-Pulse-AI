require("./config/loadEnv");
const path = require("path");
const express  = require("express");
const cors     = require("cors");
const connectDB = require("./config/db");

const sheetsRoute        = require("./routes/sheets");
const inventoryRoute     = require("./routes/inventory");
const predictionsRoute   = require("./routes/predictions");
const authRoute          = require("./routes/auth");
const userRoute          = require("./routes/user");
const notificationsRoute = require("./routes/notifications");
const changeStream       = require("./utils/changeStreamListener");
const whatsappEngine     = require("./utils/whatsappEngine");

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Initialize WhatsApp engine ────────────────────────────────────────────────
whatsappEngine.initTwilio();

// ── Connect to MongoDB, then start real-time listener ─────────────────────────
const mongoose = require("mongoose");

connectDB()
  .then(async () => {
    if (mongoose.connection.readyState !== 1) {
      console.warn("[Server] MongoDB not connected — change stream skipped.");
      return;
    }
    await changeStream.startChangeStreamListener();

    // Restart auto-sync pollers for all users with linked sheets
    const { restartAllPollers } = require("./routes/inventory");
    await restartAllPollers();
  })
  .catch((err) => {
    console.warn("[Server] DB unavailable on start — change stream skipped.", err?.message || "");
  });

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(
  cors(
    process.env.CORS_ORIGIN
      ? {
          origin: process.env.CORS_ORIGIN.split(",").map((s) => s.trim()),
          credentials: true,
        }
      : undefined
  )
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the static frontend
app.use(express.static(path.join(__dirname, "public")));

// ── Health check (used by Render & monitoring) ────────────────────────────────
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", uptime: process.uptime() })
);

// ── API Routes ────────────────────────────────────────────────────────────────

// Auth routes (public)
app.use("/api/auth", authRoute);

// User routes (protected)
app.use("/api/user", userRoute);

// Notification routes (protected)
app.use("/api/notifications", notificationsRoute);

// Existing sheet import routes
app.use("/api", sheetsRoute);
app.use("/",    sheetsRoute);   // Root-level /parse-sheet compatibility

// New AI inventory routes
app.use("/api", inventoryRoute);

// Predictive Intelligence Engine routes
app.use("/api", predictionsRoute);

// ── Fallback ──────────────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("[Error]", err.message);
  res.status(500).json({ success: false, error: "Internal server error." });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`\n🚀 AI Inventory server running at http://localhost:${PORT}`);
  console.log(`\n── Existing Routes ──────────────────────────────────────────`);
  console.log(`   GET  /parse-sheet?sheet_url=<url>       → flat JSON array`);
  console.log(`   POST /api/extract  { "url": "..." }     → rich JSON + MongoDB`);
  console.log(`   GET  /api/imports                       → list past imports`);
  console.log(`\n── Auth Routes ──────────────────────────────────────────────`);
  console.log(`   POST /api/auth/send-otp                 → send OTP (demo: 123456)`);
  console.log(`   POST /api/auth/verify-otp               → verify OTP → JWT`);
  console.log(`\n── User Routes (protected) ──────────────────────────────────`);
  console.log(`   GET  /api/user/me                       → get user profile`);
  console.log(`   POST /api/user/save-onboarding          → save onboarding data`);
  console.log(`   POST /api/user/add-upload               → add upload record`);
  console.log(`   GET  /api/user/uploads                  → list uploads by branch`);
  console.log(`   POST /api/user/link-sheet               → link Google Sheet + sync`);
  console.log(`   GET  /api/user/sheet-sources             → list linked sheets`);
  console.log(`   POST /api/user/sync-all                 → sync all linked sheets`);
  console.log(`\n── Inventory Routes ─────────────────────────────────────────`);
  console.log(`   POST /api/sync-sheet                    → sync sheet → DB → AI`);
  console.log(`   POST /api/upload-excel                  → upload .xlsx (multi-branch)`);
  console.log(`   POST /api/run-analysis                  → re-run alerts + AI`);
  console.log(`   GET  /api/inventory                     → list inventory items`);
  console.log(`   GET  /api/inventory/by-branch           → items grouped by branch`);
  console.log(`   GET  /api/inventory/summary             → dashboard counts`);
  console.log(`   GET  /api/alerts                        → list alerts`);
  console.log(`   GET  /api/recommendations               → AI recommendations`);
  console.log(`   PATCH /api/alerts/:id/resolve           → resolve an alert`);
  console.log(`   POST /api/inventory/restock-order       → send restock order`);
  console.log(`   GET  /api/inventory/transfer-suggestions → branch swap ideas`);
  console.log(`   POST /api/inventory/initiate-transfer   → execute transfer`);
  console.log(`\n── Notifications ────────────────────────────────────────────`);
  console.log(`   GET  /api/notifications                 → list notifications`);
  console.log(`   POST /api/notifications/mark-read       → mark as read`);
  console.log(`   POST /api/notifications/test-whatsapp   → test WhatsApp`);
  console.log(`\n── Predictive Intelligence ──────────────────────────────────`);
  console.log(`   POST /api/predictions/run               → run full prediction`);
  console.log(`   GET  /api/predictions/run?location=...   → quick prediction`);
  console.log(`   GET  /api/predictions/weather?location=  → weather data`);
  console.log(`   GET  /api/predictions/events?location=   → events/festivals`);
  console.log(`   POST /api/predictions/simulate           → simulate with custom data`);
  console.log(`\n── System ───────────────────────────────────────────────────`);
  console.log(`   GET  /api/health                        → health check`);
  console.log(
    `   AI:  ${String(process.env.GROQ_API_KEY || "").trim() ? "✅ Groq enabled" : "⚠️  No GROQ_API_KEY — AI recommendations disabled"}`
  );
  console.log(
    `   WA:  ${whatsappEngine.isAvailable() ? "✅ Twilio WhatsApp enabled" : "ℹ️  Mock mode (console + in-app)"}`
  );
  console.log("─────────────────────────────────────────────────────────────\n");
});

// Handle port-in-use errors cleanly
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n❌ Port ${PORT} is already in use.`);
    console.error(`   Run this to free it: lsof -ti:${PORT} | xargs kill -9\n`);
    process.exit(1);
  } else {
    throw err;
  }
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("\n[Server] SIGTERM received — shutting down gracefully...");
  await changeStream.stopChangeStreamListener();
  server.close(() => process.exit(0));
});

module.exports = app;
