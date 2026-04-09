require("./config/loadEnv");
const path = require("path");
const express  = require("express");
const cors     = require("cors");
const connectDB = require("./config/db");

const sheetsRoute    = require("./routes/sheets");
const inventoryRoute = require("./routes/inventory");
const authRoute      = require("./routes/auth");
const userRoute      = require("./routes/user");
const changeStream   = require("./utils/changeStreamListener");

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Connect to MongoDB, then start real-time listener ─────────────────────────
const mongoose = require("mongoose");

connectDB()
  .then(async () => {
    if (mongoose.connection.readyState !== 1) {
      console.warn("[Server] MongoDB not connected — change stream skipped.");
      return;
    }
    await changeStream.startChangeStreamListener();
  })
  .catch((err) => {
    console.warn("[Server] DB unavailable on start — change stream skipped.", err?.message || "");
  });

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the static frontend
app.use(express.static(path.join(__dirname, "public")));

// ── API Routes ────────────────────────────────────────────────────────────────

// Auth routes (public)
app.use("/api/auth", authRoute);

// User routes (protected)
app.use("/api/user", userRoute);

// Existing sheet import routes
app.use("/api", sheetsRoute);
app.use("/",    sheetsRoute);   // Root-level /parse-sheet compatibility

// New AI inventory routes
app.use("/api", inventoryRoute);

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
  console.log(`\n── Inventory Routes ─────────────────────────────────────────`);
  console.log(`   POST /api/sync-sheet                    → sync sheet → DB → AI`);
  console.log(`   POST /api/run-analysis                  → re-run alerts + AI`);
  console.log(`   GET  /api/inventory                     → list inventory items`);
  console.log(`   GET  /api/inventory/summary             → dashboard counts`);
  console.log(`   GET  /api/alerts                        → list alerts`);
  console.log(`   GET  /api/recommendations               → AI recommendations`);
  console.log(`   PATCH /api/alerts/:id/resolve           → resolve an alert`);
  console.log(`\n── System ───────────────────────────────────────────────────`);
  console.log(`   GET  /api/health                        → health check`);
  console.log(
    `   AI:  ${String(process.env.GEMINI_API_KEY || "").trim() ? "✅ Gemini enabled" : "⚠️  No GEMINI_API_KEY — AI disabled"}`
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
