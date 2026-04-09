const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const { runPrediction, runPredictionFromDB } = require("../utils/predictiveEngine");
const { fetchWeather } = require("../utils/weatherService");
const { fetchEvents } = require("../utils/eventService");

// ── Helpers ───────────────────────────────────────────────────────────────────

const isDbConnected = () => mongoose.connection.readyState === 1;

// ── POST /api/predictions/run ─────────────────────────────────────────────────
// Main prediction endpoint.
// Body: { location: "Chandigarh", inventory: [...], lookaheadDays: 14 }
// If inventory is omitted, pulls from DB or uses demo data.

router.post("/predictions/run", async (req, res) => {
  try {
    const { location, inventory, lookaheadDays } = req.body;

    const result = await runPrediction({
      location: location || "Chandigarh",
      inventory: inventory || undefined,
      lookaheadDays: lookaheadDays || 14,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("[Predictions] Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/predictions/run ──────────────────────────────────────────────────
// Quick prediction using query params. Good for testing / dashboard polling.
// Query: ?location=Chandigarh&lookaheadDays=14

router.get("/predictions/run", async (req, res) => {
  try {
    const { location = "Chandigarh", lookaheadDays = 14 } = req.query;

    const result = await runPrediction({
      location,
      lookaheadDays: Number(lookaheadDays),
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("[Predictions] Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/predictions/weather ──────────────────────────────────────────────
// Standalone weather check.
// Query: ?location=Chandigarh

router.get("/predictions/weather", async (req, res) => {
  try {
    const location = req.query.location || "Chandigarh";
    const weather = await fetchWeather(location);
    return res.status(200).json({ success: true, weather });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/predictions/events ───────────────────────────────────────────────
// Standalone events/festivals check.
// Query: ?location=Chandigarh&lookaheadDays=30

router.get("/predictions/events", async (req, res) => {
  try {
    const location = req.query.location || "Chandigarh";
    const lookaheadDays = Number(req.query.lookaheadDays) || 14;
    const events = fetchEvents(location, { lookaheadDays });
    return res.status(200).json({ success: true, events });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/predictions/simulate ────────────────────────────────────────────
// Full simulation with custom inventory + location.
// Always uses demo mode — ignores DB.
// Body: {
//   location: "Chandigarh",
//   products: ["chocolates", "balloons", "cold drinks"],
//   lookaheadDays: 14
// }

router.post("/predictions/simulate", async (req, res) => {
  try {
    const { location = "Chandigarh", products = [], lookaheadDays = 14 } = req.body;

    // Build a minimal inventory from product names
    const inventory = products.map((name, i) => ({
      productId: `sim_${i}`,
      name: typeof name === "string" ? name : name.name || `Product ${i + 1}`,
      category: typeof name === "object" ? (name.category || "General") : "General",
      quantity: typeof name === "object" ? (name.quantity || 20) : 20,
      minStockLevel: typeof name === "object" ? (name.minStockLevel || 10) : 10,
      price: typeof name === "object" ? (name.price || 100) : 100,
      expiryDate: typeof name === "object" ? (name.expiryDate || null) : null,
    }));

    const result = await runPrediction({
      location,
      inventory: inventory.length > 0 ? inventory : undefined,
      lookaheadDays,
    });

    result.inventorySource = "simulation";
    return res.status(200).json(result);
  } catch (err) {
    console.error("[Predictions/Simulate] Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
