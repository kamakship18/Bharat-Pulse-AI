const express    = require("express");
const mongoose   = require("mongoose");
const cron       = require("node-cron");
const router     = express.Router();

const { extractSheetData, parseSheetUrl } = require("../utils/sheetExtractor");
const InventoryItem  = require("../models/InventoryItem");
const Alert          = require("../models/Alert");
const Recommendation = require("../models/Recommendation");
const alertEngine    = require("../utils/alertEngine");
const aiEngine       = require("../utils/aiEngine");

// ── Helpers ───────────────────────────────────────────────────────────────────

const isDbConnected = () => mongoose.connection.readyState === 1;

function dbGuard(req, res, next) {
  if (!isDbConnected()) {
    return res.status(503).json({
      success: false,
      error:   "MongoDB is not connected. Check your MONGODB_URI in .env.",
    });
  }
  next();
}

/**
 * COLUMN MAPPING
 *
 * Flexible header-matching so the sheet doesn't need exact column names.
 * Keys are inventory fields; values are arrays of accepted aliases (lower-case).
 */
const COLUMN_MAP = {
  productId:    ["id", "product_id", "productid", "sku", "item_id", "itemid", "code"],
  name:         ["name", "product", "product_name", "productname", "item", "item_name", "title"],
  category:     ["category", "type", "product_type", "department", "group"],
  quantity:     ["quantity", "qty", "stock", "count", "units", "available", "on_hand"],
  minStockLevel:["min_stock", "min_level", "reorder_point", "reorder", "minimum", "min_qty"],
  maxStockLevel:["max_stock", "max_level", "maximum", "max_qty"],
  price:        ["price", "cost", "unit_price", "selling_price", "rate"],
  expiryDate:   ["expiry", "expiry_date", "expiration", "expiration_date", "best_before", "use_by"],
};

/**
 * Maps a raw row object (from the sheet) → InventoryItem fields.
 * Unrecognised columns go into `extraFields`.
 */
function mapRowToInventory(row, sheetUrl) {
  // Build a lookup: lowercase_header → normalised_field_name
  const headerToField = {};
  for (const [field, aliases] of Object.entries(COLUMN_MAP)) {
    for (const alias of aliases) {
      headerToField[alias] = field;
    }
  }

  const mapped     = {};
  const extraFields = {};

  for (const [rawKey, rawValue] of Object.entries(row)) {
    // Strip __sheet / __gid meta fields injected by the extractor
    if (rawKey.startsWith("__")) continue;

    const normKey = rawKey.toLowerCase().trim().replace(/\s+/g, "_");
    const field   = headerToField[normKey];

    if (field) {
      mapped[field] = rawValue;
    } else {
      extraFields[rawKey] = rawValue;
    }
  }

  // ── Type coercion ──────────────────────────────────────────────────────────
  if (mapped.quantity     !== undefined) mapped.quantity     = Number(mapped.quantity)     || 0;
  if (mapped.minStockLevel !== undefined) mapped.minStockLevel = Number(mapped.minStockLevel) || 10;
  if (mapped.maxStockLevel !== undefined) mapped.maxStockLevel = Number(mapped.maxStockLevel) || 500;
  if (mapped.price        !== undefined) mapped.price        = parseFloat(mapped.price)    || null;

  if (mapped.expiryDate && mapped.expiryDate !== "") {
    const d = new Date(mapped.expiryDate);
    mapped.expiryDate = isNaN(d.getTime()) ? null : d;
  } else {
    mapped.expiryDate = null;
  }

  // Fallback: if no productId found, use the product name (slugified)
  if (!mapped.productId) {
    const base = mapped.name || Object.values(row).find((v) => v) || `item_${Date.now()}`;
    mapped.productId = String(base)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
  }

  if (!mapped.name) mapped.name = mapped.productId;

  return {
    ...mapped,
    sourceSheetUrl: sheetUrl,
    lastSyncedAt:   new Date(),
    extraFields,
  };
}

// ── Core analysis runner ──────────────────────────────────────────────────────

/**
 * runAnalysis — runs alerts + AI on a list of inventory items.
 * Returns a summary { alerts, recommendations }.
 */
async function runAnalysis(items) {
  const [alerts, recommendations] = await Promise.all([
    alertEngine.runForAll(items),
    aiEngine.isAvailable()
      ? aiEngine.runForAll(items)
      : Promise.resolve([]),
  ]);

  return {
    alerts:          alerts.length,
    recommendations: recommendations.length,
    aiEnabled:       aiEngine.isAvailable(),
  };
}

// ── Auto-polling (cron) ───────────────────────────────────────────────────────
// Stored per-sheet: { sheetUrl, cronJob }
const activePollers = new Map();

function startPoller(sheetUrl, intervalMs) {
  if (activePollers.has(sheetUrl)) {
    activePollers.get(sheetUrl).destroy();
  }

  // node-cron doesn't accept ms directly; convert to a safe minimum 1-minute cron
  const minutes = Math.max(1, Math.round(intervalMs / 60_000));
  const cronExpr = `*/${minutes} * * * *`;

  const job = cron.schedule(cronExpr, async () => {
    console.log(`[Poller] ♻️  Auto-refreshing sheet: ${sheetUrl}`);
    try {
      await syncSheet(sheetUrl);
    } catch (err) {
      console.error(`[Poller] Error during auto-refresh: ${err.message}`);
    }
  });

  activePollers.set(sheetUrl, job);
  console.log(`[Poller] Scheduled refresh every ${minutes} min for sheet.`);
}

// ── Sheet sync core ───────────────────────────────────────────────────────────

async function syncSheet(sheetUrl) {
  const { sheetId } = parseSheetUrl(sheetUrl);
  const extracted   = await extractSheetData(sheetUrl);

  // Flatten all tabs into one array of rows
  const allRows = extracted.sheets.flatMap((s) => s.data);

  const upsertedItems = [];

  for (const row of allRows) {
    const mapped = mapRowToInventory(row, sheetUrl);

    const item = await InventoryItem.findOneAndUpdate(
      { productId: mapped.productId },
      { $set: mapped },
      { upsert: true, returnDocument: "after" }
    );
    upsertedItems.push(item);
  }

  console.log(
    `[SyncSheet] ✅ Upserted ${upsertedItems.length} item(s) from sheet ${sheetId}.`
  );

  // Run analysis synchronously (change stream will also fire, but this
  // ensures immediate API response contains fresh alert/rec counts)
  const analysis = await runAnalysis(upsertedItems);

  return {
    sheetId,
    totalRows:       allRows.length,
    itemsUpserted:   upsertedItems.length,
    ...analysis,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// ── POST /api/sync-sheet ──────────────────────────────────────────────────────
// Body: { "sheetUrl": "...", "enablePolling": true, "pollingIntervalMs": 60000 }
//
router.post("/sync-sheet", dbGuard, async (req, res) => {
  const { sheetUrl, enablePolling = false, pollingIntervalMs = 60_000 } = req.body;

  if (!sheetUrl || !sheetUrl.includes("docs.google.com/spreadsheets")) {
    return res.status(400).json({
      success: false,
      error:   "Provide a valid Google Sheets URL in the 'sheetUrl' body field.",
    });
  }

  try {
    const result = await syncSheet(sheetUrl.trim());

    // Optionally start/update cron poller for this sheet
    if (enablePolling) {
      startPoller(sheetUrl.trim(), pollingIntervalMs);
    }

    return res.status(200).json({
      success: true,
      message: "Sheet synced and analysis complete.",
      polling: enablePolling
        ? `Auto-refreshing every ${Math.max(1, Math.round(pollingIntervalMs / 60_000))} minute(s).`
        : "Polling disabled.",
      ...result,
    });
  } catch (err) {
    console.error(`[sync-sheet] Error: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/run-analysis ────────────────────────────────────────────────────
// Re-runs alert engine + AI on all current inventory without re-fetching sheet.
//
router.post("/run-analysis", dbGuard, async (req, res) => {
  try {
    const items = await InventoryItem.find({}).lean();
    if (!items.length) {
      return res.status(200).json({
        success: true,
        message: "No inventory items found. Run /sync-sheet first.",
        alerts: 0,
        recommendations: 0,
      });
    }

    const analysis = await runAnalysis(items);

    return res.status(200).json({
      success:     true,
      itemsScanned: items.length,
      ...analysis,
    });
  } catch (err) {
    console.error(`[run-analysis] Error: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/inventory ────────────────────────────────────────────────────────
// Query: ?category=&search=&page=1&limit=20&sortBy=name&order=asc
//
router.get("/inventory", dbGuard, async (req, res) => {
  try {
    const {
      category, search,
      page  = 1,
      limit = 20,
      sortBy = "name",
      order  = "asc",
    } = req.query;

    const filter = {};
    if (category) filter.category = { $regex: category, $options: "i" };
    if (search)   filter.$text    = { $search: search };

    const sortOrder = order === "desc" ? -1 : 1;
    const skip      = (Math.max(1, Number(page)) - 1) * Math.min(100, Number(limit));

    const [items, total] = await Promise.all([
      InventoryItem.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(Math.min(100, Number(limit)))
        .lean(),
      InventoryItem.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page:    Number(page),
      pages:   Math.ceil(total / Number(limit)),
      items,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/alerts ───────────────────────────────────────────────────────────
// Query: ?type=low_stock&resolved=false&page=1&limit=20
//
router.get("/alerts", dbGuard, async (req, res) => {
  try {
    const {
      type, resolved = "false",
      page  = 1,
      limit = 20,
    } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (resolved !== "all") filter.resolved = resolved === "true";

    const skip = (Math.max(1, Number(page)) - 1) * Math.min(100, Number(limit));

    const [alerts, total] = await Promise.all([
      Alert.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Math.min(100, Number(limit)))
        .lean(),
      Alert.countDocuments(filter),
    ]);

    // Group by severity for a quick summary
    const summary = alerts.reduce((acc, a) => {
      acc[a.severity] = (acc[a.severity] || 0) + 1;
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      total,
      page:    Number(page),
      pages:   Math.ceil(total / Number(limit)),
      summary,
      alerts,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/recommendations ──────────────────────────────────────────────────
// Query: ?type=restock&priority=high&page=1&limit=20
//
router.get("/recommendations", dbGuard, async (req, res) => {
  try {
    const {
      type, priority,
      page  = 1,
      limit = 20,
    } = req.query;

    const filter = {};
    if (type)     filter.type     = type;
    if (priority) filter.priority = priority;

    const skip = (Math.max(1, Number(page)) - 1) * Math.min(100, Number(limit));

    const [recs, total] = await Promise.all([
      Recommendation.find(filter)
        .sort({ generatedAt: -1 })
        .skip(skip)
        .limit(Math.min(100, Number(limit)))
        .lean(),
      Recommendation.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      aiEnabled: aiEngine.isAvailable(),
      total,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
      recommendations: recs,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── PATCH /api/alerts/:id/resolve ─────────────────────────────────────────────
// Manually resolve a specific alert.
//
router.patch("/alerts/:id/resolve", dbGuard, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, error: "Invalid alert ID." });
  }
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { $set: { resolved: true, resolvedAt: new Date() } },
      { new: true }
    );
    if (!alert) return res.status(404).json({ success: false, error: "Alert not found." });
    return res.status(200).json({ success: true, alert });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/health ───────────────────────────────────────────────────────────
// System health check — DB status + AI status.
//
router.get("/health", async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = ["disconnected", "connected", "connecting", "disconnecting"][dbState] || "unknown";

  return res.status(dbState === 1 ? 200 : 503).json({
    success: dbState === 1,
    status:  dbState === 1 ? "ok" : "degraded",
    db:      dbStatus,
    aiEnabled: aiEngine.isAvailable(),
    timestamp: new Date().toISOString(),
  });
});

// ── GET /api/inventory/summary ────────────────────────────────────────────────
// Returns quick dashboard-ready counts.
//
router.get("/inventory/summary", dbGuard, async (req, res) => {
  try {
    const [
      totalItems,
      outOfStock,
      lowStock,
      expiringSoon,
      overstock,
      openAlerts,
      totalRecs,
    ] = await Promise.all([
      InventoryItem.countDocuments(),
      InventoryItem.countDocuments({ quantity: 0 }),
      Alert.countDocuments({ type: "low_stock",     resolved: false }),
      Alert.countDocuments({ type: "expiring_soon", resolved: false }),
      Alert.countDocuments({ type: "overstock",     resolved: false }),
      Alert.countDocuments({ resolved: false }),
      Recommendation.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      summary: {
        totalItems,
        outOfStock,
        lowStock,
        expiringSoon,
        overstock,
        openAlerts,
        totalRecommendations: totalRecs,
        aiEnabled: aiEngine.isAvailable(),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
