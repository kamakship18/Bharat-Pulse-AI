/**
 * Predictive Engine — BharatPulse AI Orchestrator
 *
 * Main entry point that coordinates all three layers:
 *   1. Data Collection (weather + events)
 *   2. Context Engine (rules + demand estimation)
 *   3. Output Generation (alerts + recommendations)
 *
 * Supports two modes:
 *   - DB mode: pulls inventory from MongoDB
 *   - Direct mode: accepts inventory array directly (for API/demo)
 */

const { fetchWeather } = require("./weatherService");
const { fetchEvents }  = require("./eventService");
const { analyzeContext } = require("./contextEngine");

// ── Mock Inventory (Demo / Simulation Mode) ──────────────────────────────────
// Used when no real inventory data is available.

const DEMO_INVENTORY = [
  { productId: "choco_001",   name: "Cadbury Dairy Milk",    category: "Chocolates",  quantity: 45,  minStockLevel: 20, price: 40,  expiryDate: getFutureDate(5) },
  { productId: "choco_002",   name: "Ferrero Rocher Box",    category: "Chocolates",  quantity: 12,  minStockLevel: 10, price: 550, expiryDate: getFutureDate(30) },
  { productId: "colddrink_01",name: "Coca-Cola 2L",          category: "Cold drinks", quantity: 8,   minStockLevel: 15, price: 90,  expiryDate: getFutureDate(60) },
  { productId: "colddrink_02",name: "Sprite 1.25L",          category: "Cold drinks", quantity: 25,  minStockLevel: 12, price: 65,  expiryDate: getFutureDate(45) },
  { productId: "colddrink_03",name: "Thumbs Up 750ml",       category: "Cold drinks", quantity: 0,   minStockLevel: 10, price: 40,  expiryDate: null },
  { productId: "icecream_01", name: "Amul Ice Cream Tub",    category: "Ice cream",   quantity: 15,  minStockLevel: 8,  price: 250, expiryDate: getFutureDate(14) },
  { productId: "snack_001",   name: "Haldiram Namkeen 400g", category: "Snacks",      quantity: 30,  minStockLevel: 15, price: 120, expiryDate: getFutureDate(2) },
  { productId: "snack_002",   name: "Lays Classic 52g",      category: "Snacks",      quantity: 50,  minStockLevel: 20, price: 20,  expiryDate: getFutureDate(90) },
  { productId: "balloon_01",  name: "Party Balloons (50 pk)",category: "Party items", quantity: 20,  minStockLevel: 10, price: 150, expiryDate: null },
  { productId: "sweet_001",   name: "Kaju Katli 500g",       category: "Sweets",      quantity: 10,  minStockLevel: 5,  price: 450, expiryDate: getFutureDate(10) },
  { productId: "tea_001",     name: "Tata Tea Gold 500g",    category: "Tea",         quantity: 35,  minStockLevel: 15, price: 220, expiryDate: getFutureDate(180) },
  { productId: "milk_001",    name: "Amul Toned Milk 1L",    category: "Dairy",       quantity: 20,  minStockLevel: 25, price: 54,  expiryDate: getFutureDate(1) },
  { productId: "dryfruit_01", name: "Premium Cashews 250g",  category: "Dry fruits",  quantity: 18,  minStockLevel: 8,  price: 320, expiryDate: getFutureDate(120) },
  { productId: "cake_001",    name: "Chocolate Truffle Cake", category: "Bakery",     quantity: 3,   minStockLevel: 5,  price: 650, expiryDate: getFutureDate(2) },
  { productId: "water_001",   name: "Bisleri 1L (12 pk)",    category: "Water",       quantity: 40,  minStockLevel: 20, price: 180, expiryDate: null },
];

function getFutureDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/**
 * Run the full predictive intelligence pipeline.
 *
 * @param {Object} params
 * @param {string} params.location — business location (city name)
 * @param {Array}  [params.inventory] — product list (falls back to DB or demo)
 * @param {number} [params.lookaheadDays=14] — how far to look ahead for events
 * @returns {Promise<Object>} Full prediction result
 */
async function runPrediction({ location, inventory, lookaheadDays = 14 }) {
  const city = location || "Chandigarh";
  const startTime = Date.now();

  // ── Layer 1: Data Collection ─────────────────────────────────────────────
  let weather, events;

  try {
    [weather, events] = await Promise.all([
      fetchWeather(city),
      Promise.resolve(fetchEvents(city, { lookaheadDays })),
    ]);
  } catch (err) {
    console.error("[PredictiveEngine] Data collection failed:", err.message);
    weather = { temperature: 35, condition: "warm", humidity: 50, description: "Data unavailable", source: "error_fallback" };
    events = { festivals: [], seasonal: [], weekendBoost: null, source: "error_fallback" };
  }

  // ── Resolve inventory ────────────────────────────────────────────────────
  let items = inventory;
  let inventorySource = "provided";

  if (!items || items.length === 0) {
    try {
      const InventoryItem = require("../models/InventoryItem");
      items = await InventoryItem.find({}).lean();
      inventorySource = items.length > 0 ? "database" : "demo";
    } catch {
      inventorySource = "demo";
    }
  }

  if (!items || items.length === 0) {
    items = DEMO_INVENTORY;
    inventorySource = "demo";
  }

  // ── Layer 2: Context Engine ──────────────────────────────────────────────
  const result = analyzeContext({ weather, events, inventory: items });

  // ── Layer 3: Output Generation ───────────────────────────────────────────
  const elapsedMs = Date.now() - startTime;

  return {
    success: true,
    location: city,
    timestamp: new Date().toISOString(),
    processingTimeMs: elapsedMs,
    inventorySource,
    itemsAnalyzed: items.length,

    // External signals collected
    signals: {
      weather: {
        condition: weather.condition,
        temperature: weather.temperature,
        humidity: weather.humidity,
        description: weather.description,
        source: weather.source,
      },
      events: {
        upcomingFestivals: events.festivals?.length || 0,
        activeSeasonalPatterns: events.seasonal?.length || 0,
        isWeekend: events.isWeekend || false,
        festivals: (events.festivals || []).map((f) => ({
          name: f.name,
          date: f.date,
          daysUntil: f.daysUntil,
          relevance: f.relevance,
          multiplier: f.multiplier,
        })),
        seasonal: (events.seasonal || []).map((s) => ({
          name: s.name,
          type: s.type,
          multiplier: s.multiplier,
        })),
      },
    },

    // Intelligence output
    alerts: result.alerts,
    recommendations: result.recommendations,
    demandInsights: result.demandInsights,
    summary: result.summary,
  };
}

/**
 * Run prediction using DB inventory + user's stored location.
 * Convenience wrapper for the API route.
 */
async function runPredictionFromDB(location) {
  const InventoryItem = require("../models/InventoryItem");
  const items = await InventoryItem.find({}).lean();

  return runPrediction({
    location,
    inventory: items.length > 0 ? items : undefined,
  });
}

module.exports = { runPrediction, runPredictionFromDB, DEMO_INVENTORY };
