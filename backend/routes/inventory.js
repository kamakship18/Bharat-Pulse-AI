const express    = require("express");
const mongoose   = require("mongoose");
const cron       = require("node-cron");
const multer     = require("multer");
const XLSX       = require("xlsx");
const router     = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const { extractSheetData, parseSheetUrl } = require("../utils/sheetExtractor");
const InventoryItem  = require("../models/InventoryItem");
const Alert          = require("../models/Alert");
const Recommendation = require("../models/Recommendation");
const User           = require("../models/User");
const alertEngine    = require("../utils/alertEngine");
const aiEngine       = require("../utils/aiEngine");
const whatsappEngine = require("../utils/whatsappEngine");
const authMiddleware = require("../utils/authMiddleware");

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
 * Optional auth — attaches req.userId if token present, but doesn't block.
 * Lets unauthenticated requests through for backward compat.
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }
  try {
    const jwt = require("jsonwebtoken");
    const secret = process.env.JWT_SECRET || "bharatpulse-demo-secret-key-2026";
    const decoded = jwt.verify(authHeader.split(" ")[1], secret);
    req.userId = decoded.userId;
  } catch (e) {
    // Token invalid — proceed without userId
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
  productId:    ["id", "product_id", "productid", "sku", "item_id", "itemid", "item_id", "code", "item id"],
  name:         ["name", "product", "product_name", "productname", "item", "item_name", "itemname", "title", "item name"],
  category:     ["category", "type", "product_type", "department", "group"],
  quantity:     ["quantity", "qty", "stock", "count", "units", "available", "on_hand", "stock_level", "stocklevel", "stock level"],
  units:        ["unit", "uom", "unit_of_measure", "measurement"],
  minStockLevel:["min_stock", "min_level", "reorder_point", "reorder", "minimum", "min_qty"],
  maxStockLevel:["max_stock", "max_level", "maximum", "max_qty"],
  costPrice:    ["cost_price", "costprice", "cost", "purchase_price", "buying_price"],
  price:        ["price", "selling_price", "sellingprice", "unit_price", "rate", "mrp", "sp"],
  expiryDate:   ["expiry", "expiry_date", "expirydate", "expiration", "expiration_date", "best_before", "use_by"],
  lastRestocked:["last_restocked", "lastrestocked", "last_restock", "last_restock_date", "restock_date", "lastrestock"],
  branch:       ["branch", "location", "outlet", "store", "outlet_location", "outlet location"],
  productionBatch: ["batch", "production_batch", "batch_id", "lot", "lot_number"],
};

/**
 * Maps a raw row object (from the sheet) → InventoryItem fields.
 * Unrecognised columns go into `extraFields`.
 */
function mapRowToInventory(row, sheetUrl, overrideBranch, userId) {
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
  if (mapped.costPrice    !== undefined) mapped.costPrice    = parseFloat(mapped.costPrice)  || null;
  if (mapped.price        !== undefined) mapped.price        = parseFloat(mapped.price)    || null;

  if (mapped.expiryDate && mapped.expiryDate !== "") {
    const d = new Date(mapped.expiryDate);
    mapped.expiryDate = isNaN(d.getTime()) ? null : d;
  } else {
    mapped.expiryDate = null;
  }

  if (mapped.lastRestocked && mapped.lastRestocked !== "") {
    const d = new Date(mapped.lastRestocked);
    mapped.lastRestocked = isNaN(d.getTime()) ? null : d;
  } else {
    mapped.lastRestocked = null;
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

  // Normalize category casing (Title Case)
  if (mapped.category) {
    mapped.category = mapped.category.trim().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Branch: override > sheet data > default
  const branch = overrideBranch || mapped.branch || "Main";
  // Remove branch from mapped (we set it separately)
  delete mapped.branch;

  return {
    ...mapped,
    branch,
    userId: userId || null,
    sourceSheetUrl: sheetUrl,
    lastSyncedAt:   new Date(),
    extraFields,
  };
}

// ── Core analysis runner ──────────────────────────────────────────────────────

/**
 * runAnalysis — runs alerts + AI on a list of inventory items.
 * Also sends WhatsApp notifications for triggered alerts.
 * Returns a summary { alerts, recommendations }.
 */
async function runAnalysis(items, userPhone = null) {
  const [alerts, recommendations] = await Promise.all([
    alertEngine.runForAll(items),
    aiEngine.isAvailable()
      ? aiEngine.runForAll(items)
      : Promise.resolve([]),
  ]);

  // ── Send WhatsApp notifications for new alerts ────────────────────────────
  if (alerts.length > 0) {
    // Build recs map for combined messages
    const recsMap = {};
    for (const rec of recommendations) {
      if (rec && rec.productId) {
        recsMap[rec.productId] = rec;
      }
    }
    // Fire-and-forget — don't block the response
    whatsappEngine.notifyAlerts(alerts, recsMap, userPhone).catch((err) => {
      console.error("[WhatsApp] Batch notification error:", err.message);
    });
  }

  return {
    alerts:          alerts.length,
    recommendations: recommendations.length,
    aiEnabled:       aiEngine.isAvailable(),
  };
}

// ── Auto-polling (cron) ───────────────────────────────────────────────────────
// Stored per-sheet: { sheetUrl, cronJob }
const activePollers = new Map();

function startPoller(sheetUrl, branch, userId, intervalMs, userPhone) {
  const pollerKey = `${userId || "global"}_${sheetUrl}_${branch}`;
  if (activePollers.has(pollerKey)) {
    activePollers.get(pollerKey).destroy();
  }

  // node-cron doesn't accept ms directly; convert to a safe minimum 1-minute cron
  const minutes = Math.max(1, Math.min(2, Math.round(intervalMs / 60_000)));
  const cronExpr = `*/${minutes} * * * *`;

  const job = cron.schedule(cronExpr, async () => {
    console.log(`[Poller] ♻️  Auto-refreshing sheet: ${sheetUrl} → ${branch}`);
    try {
      await syncSheet(sheetUrl, branch, userId, userPhone);
    } catch (err) {
      console.error(`[Poller] Error during auto-refresh: ${err.message}`);
    }
  });

  activePollers.set(pollerKey, job);
  console.log(`[Poller] Scheduled refresh every ${minutes} min for sheet → ${branch}.`);
}

/**
 * Restart pollers for all users with active sheetSources.
 * Called on server startup.
 */
async function restartAllPollers() {
  if (!isDbConnected()) return;

  try {
    const users = await User.find({ "sheetSources.syncEnabled": true }).lean();
    let count = 0;
    for (const user of users) {
      for (const src of user.sheetSources) {
        if (src.syncEnabled && src.sheetUrl) {
          const intervalMs = Number(process.env.POLLING_INTERVAL_MS) || 60_000;
          startPoller(src.sheetUrl, src.branch, user._id.toString(), intervalMs, user.phoneNumber);
          count++;
        }
      }
    }
    if (count > 0) {
      console.log(`[Poller] ✅ Restarted ${count} auto-sync poller(s) on startup.`);
    }
  } catch (err) {
    console.error("[Poller] Failed to restart pollers on startup:", err.message);
  }
}

// ── Sheet sync core ───────────────────────────────────────────────────────────

async function syncSheet(sheetUrl, branch, userId, userPhone) {
  const { sheetId } = parseSheetUrl(sheetUrl);
  const extracted   = await extractSheetData(sheetUrl);

  const isMultiTab = extracted.sheets.length > 1;
  const upsertedItems = [];
  const branchSummary = {};

  for (const sheet of extracted.sheets) {
    // When the workbook has multiple tabs, each tab name IS the branch.
    // The user-selected branch is only used as a fallback for single-tab sheets.
    const tabBranch = isMultiTab ? sheet.sheetName : null;

    for (const row of sheet.data) {
      const mapped = mapRowToInventory(
        row,
        sheetUrl,
        tabBranch || branch, // multi-tab: tab name wins; single-tab: user selection wins
        userId
      );

      const itemBranch = mapped.branch || tabBranch || branch || "Main";

      const item = await InventoryItem.findOneAndUpdate(
        {
          productId: mapped.productId,
          branch:    itemBranch,
          userId:    userId || null,
        },
        { $set: { ...mapped, branch: itemBranch } },
        { upsert: true, returnDocument: "after" }
      );
      upsertedItems.push(item);

      if (!branchSummary[itemBranch]) branchSummary[itemBranch] = 0;
      branchSummary[itemBranch]++;
    }
  }

  const totalRows = extracted.sheets.reduce((sum, s) => sum + s.data.length, 0);

  if (isMultiTab) {
    const branchList = Object.entries(branchSummary).map(([b, n]) => `${b}(${n})`).join(", ");
    console.log(`[SyncSheet] ✅ Multi-tab: ${upsertedItems.length} item(s) across ${Object.keys(branchSummary).length} branches: ${branchList}`);
  } else {
    console.log(`[SyncSheet] ✅ Upserted ${upsertedItems.length} item(s) from sheet ${sheetId}.`);
  }

  const analysis = await runAnalysis(upsertedItems, userPhone);

  if (userId) {
    await User.updateOne(
      { _id: userId, "sheetSources.sheetUrl": sheetUrl, "sheetSources.branch": branch },
      {
        $set: {
          "sheetSources.$.lastSyncedAt": new Date(),
          "sheetSources.$.itemCount": upsertedItems.length,
        },
      }
    );
  }

  return {
    sheetId,
    totalRows,
    itemsUpserted:   upsertedItems.length,
    items:           upsertedItems,
    isMultiTab,
    branches:        branchSummary,
    ...analysis,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// ── POST /api/sync-sheet ──────────────────────────────────────────────────────
// Body: { "sheetUrl": "...", "branch": "Delhi", "enablePolling": true, "pollingIntervalMs": 60000 }
//
router.post("/sync-sheet", dbGuard, optionalAuth, async (req, res) => {
  const { sheetUrl, branch = "Main", enablePolling = false, pollingIntervalMs = 60_000 } = req.body;

  if (!sheetUrl || !sheetUrl.includes("docs.google.com/spreadsheets")) {
    return res.status(400).json({
      success: false,
      error:   "Provide a valid Google Sheets URL in the 'sheetUrl' body field.",
    });
  }

  try {
    // Get user phone for WhatsApp
    let userPhone = null;
    if (req.userId) {
      const user = await User.findById(req.userId).lean();
      userPhone = user?.phoneNumber;
    }

    const result = await syncSheet(sheetUrl.trim(), branch, req.userId, userPhone);

    // Optionally start/update cron poller for this sheet
    if (enablePolling) {
      startPoller(sheetUrl.trim(), branch, req.userId, pollingIntervalMs, userPhone);
    }

    return res.status(200).json({
      success: true,
      message: result.isMultiTab
        ? `Synced ${result.itemsUpserted} items across ${Object.keys(result.branches).length} branches.`
        : "Sheet synced and analysis complete.",
      polling: enablePolling
        ? `Auto-refreshing every ${Math.max(1, Math.round(pollingIntervalMs / 60_000))} minute(s).`
        : "Polling disabled.",
      sheetId: result.sheetId,
      totalRows: result.totalRows,
      itemsUpserted: result.itemsUpserted,
      isMultiTab: result.isMultiTab || false,
      branches: result.branches || {},
      alerts: result.alerts,
      recommendations: result.recommendations,
      aiEnabled: result.aiEnabled,
      items: result.items,
    });
  } catch (err) {
    console.error(`[sync-sheet] Error: ${err.message}`);

    // Friendly error messages
    if (err.message.includes("Access denied") || err.message.includes("private")) {
      return res.status(403).json({
        success: false,
        error: "This sheet is not public. Please set sharing to 'Anyone with the link → Viewer'.",
      });
    }
    if (err.message.includes("Invalid Google Sheets URL")) {
      return res.status(400).json({
        success: false,
        error: "Invalid Google Sheets URL. Please check the link and try again.",
      });
    }

    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/upload-excel ────────────────────────────────────────────────────
// Upload an Excel (.xlsx/.xls/.csv) file with multiple sheets.
// Each sheet name → branch/outlet. Rows inherit that branch automatically.
//
router.post("/upload-excel", dbGuard, upload.single("file"), optionalAuth, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded. Attach an Excel file as 'file'." });
    }

    const userId = req.userId || null;
    let userPhone = null;
    if (userId) {
      const user = await User.findById(userId).lean();
      userPhone = user?.phoneNumber;
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
    const sheetNames = workbook.SheetNames;

    if (!sheetNames.length) {
      return res.status(400).json({ success: false, error: "The uploaded file contains no sheets." });
    }

    console.log(`[UploadExcel] Parsing ${sheetNames.length} sheet(s): ${sheetNames.join(", ")}`);

    const allUpserted = [];
    const branchSummary = {};

    for (const sheetName of sheetNames) {
      const ws = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

      if (!rows.length) {
        console.log(`  → "${sheetName}" is empty — skipped`);
        continue;
      }

      const branch = sheetName.trim();
      let upsertedCount = 0;

      for (const row of rows) {
        const mapped = mapRowToInventory(row, `excel:${req.file.originalname}`, branch, userId);
        const itemBranch = mapped.branch || branch;

        const item = await InventoryItem.findOneAndUpdate(
          { productId: mapped.productId, branch: itemBranch, userId },
          { $set: { ...mapped, branch: itemBranch } },
          { upsert: true, returnDocument: "after" }
        );
        allUpserted.push(item);
        upsertedCount++;
      }

      branchSummary[branch] = { rows: rows.length, upserted: upsertedCount };
      console.log(`  → "${branch}": ${upsertedCount} item(s) upserted`);
    }

    // Run analysis on all upserted items
    const analysis = await runAnalysis(allUpserted, userPhone);

    console.log(`[UploadExcel] ✅ Total: ${allUpserted.length} items across ${Object.keys(branchSummary).length} branch(es)`);

    return res.json({
      success: true,
      message: `Uploaded ${allUpserted.length} items across ${Object.keys(branchSummary).length} branch(es).`,
      fileName: req.file.originalname,
      branches: branchSummary,
      totalItems: allUpserted.length,
      ...analysis,
    });
  } catch (err) {
    console.error("[UploadExcel] Error:", err.message);
    if (err.message.includes("not supported") || err.message.includes("CFB")) {
      return res.status(400).json({ success: false, error: "Invalid file format. Please upload a valid .xlsx, .xls, or .csv file." });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/run-analysis ────────────────────────────────────────────────────
// Re-runs alert engine + AI on all current inventory without re-fetching sheet.
//
router.post("/run-analysis", dbGuard, optionalAuth, async (req, res) => {
  try {
    const filter = req.userId ? { userId: req.userId } : {};
    const items = await InventoryItem.find(filter).lean();
    if (!items.length) {
      return res.status(200).json({
        success: true,
        message: "No inventory items found. Run /sync-sheet first.",
        alerts: 0,
        recommendations: 0,
      });
    }

    let userPhone = null;
    if (req.userId) {
      const user = await User.findById(req.userId).lean();
      userPhone = user?.phoneNumber;
    }

    const analysis = await runAnalysis(items, userPhone);

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
// Query: ?branch=&category=&search=&page=1&limit=100&sortBy=name&order=asc
//
router.get("/inventory", dbGuard, optionalAuth, async (req, res) => {
  try {
    const {
      branch, category, search,
      page  = 1,
      limit = 100,
      sortBy = "name",
      order  = "asc",
    } = req.query;

    const filter = {};
    if (req.userId) filter.userId = req.userId;
    if (branch && branch !== "All" && branch !== "All Branches") {
      filter.branch = { $regex: branch, $options: "i" };
    }
    if (category && category !== "All") {
      filter.category = { $regex: category, $options: "i" };
    }
    if (search) filter.$text = { $search: search };

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

// ── GET /api/inventory/by-branch ──────────────────────────────────────────────
// Returns inventory grouped by branch for manage-data page.
//
router.get("/inventory/by-branch", dbGuard, optionalAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.userId) filter.userId = req.userId;

    const items = await InventoryItem.find(filter).sort({ branch: 1, name: 1 }).lean();

    // Group by branch
    const grouped = {};
    const branches = new Set();
    for (const item of items) {
      const b = item.branch || "Main";
      branches.add(b);
      if (!grouped[b]) grouped[b] = [];
      grouped[b].push(item);
    }

    // Compute per-branch stats
    const branchStats = {};
    for (const [b, bItems] of Object.entries(grouped)) {
      const now = new Date();
      const expiryThreshold = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
      branchStats[b] = {
        totalItems: bItems.length,
        totalStock: bItems.reduce((sum, i) => sum + (i.quantity || 0), 0),
        expiringItems: bItems.filter((i) => i.expiryDate && new Date(i.expiryDate) <= expiryThreshold).length,
        lowStockItems: bItems.filter((i) => i.quantity <= (i.minStockLevel || 10)).length,
        outOfStock: bItems.filter((i) => i.quantity === 0).length,
        totalValue: bItems.reduce((sum, i) => sum + (i.quantity || 0) * (i.price || 0), 0),
      };
    }

    return res.status(200).json({
      success: true,
      total: items.length,
      branches: Array.from(branches),
      grouped,
      branchStats,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/inventory/summary ────────────────────────────────────────────────
// Returns quick dashboard-ready counts.
//
router.get("/inventory/summary", dbGuard, optionalAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.userId) filter.userId = req.userId;

    const alertFilter = {};
    if (req.userId) alertFilter.userId = req.userId;

    const items = await InventoryItem.find(filter).lean();
    const now = new Date();
    const expiryThreshold = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    const totalItems = items.length;
    const outOfStock = items.filter((i) => i.quantity === 0).length;
    const lowStock = items.filter((i) => i.quantity > 0 && i.quantity <= (i.minStockLevel || 10)).length;
    const expiringSoon = items.filter((i) => i.expiryDate && new Date(i.expiryDate) <= expiryThreshold && new Date(i.expiryDate) >= now).length;
    const expired = items.filter((i) => i.expiryDate && new Date(i.expiryDate) < now).length;
    const healthy = totalItems - outOfStock - lowStock - expiringSoon - expired;
    const totalUnits = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
    const totalValue = items.reduce((sum, i) => sum + (i.quantity || 0) * (i.price || 0), 0);

    // Category breakdown
    const categories = {};
    for (const item of items) {
      const cat = item.category || "Uncategorized";
      categories[cat] = (categories[cat] || 0) + 1;
    }

    // Branch breakdown
    const branches = {};
    for (const item of items) {
      const b = item.branch || "Main";
      if (!branches[b]) branches[b] = { units: 0, risk: 0, healthy: 0, items: 0 };
      branches[b].units += item.quantity || 0;
      branches[b].items += 1;
      if (item.quantity <= (item.minStockLevel || 10) || (item.expiryDate && new Date(item.expiryDate) <= expiryThreshold)) {
        branches[b].risk += 1;
      } else {
        branches[b].healthy += 1;
      }
    }

    const [openAlerts, totalRecs] = await Promise.all([
      Alert.countDocuments({ ...alertFilter, resolved: false }),
      Recommendation.countDocuments(alertFilter.userId ? { userId: alertFilter.userId } : {}),
    ]);

    // Last synced
    const lastSynced = items.length > 0
      ? items.reduce((latest, i) => {
          const t = new Date(i.lastSyncedAt || i.updatedAt);
          return t > latest ? t : latest;
        }, new Date(0))
      : null;

    return res.status(200).json({
      success: true,
      summary: {
        totalItems,
        totalUnits,
        totalValue,
        outOfStock,
        lowStock,
        expiringSoon,
        expired,
        healthy: Math.max(0, healthy),
        openAlerts,
        totalRecommendations: totalRecs,
        aiEnabled: aiEngine.isAvailable(),
        categories,
        branches,
        lastSynced,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/alerts ───────────────────────────────────────────────────────────
// Query: ?type=low_stock&resolved=false&page=1&limit=50
//
router.get("/alerts", dbGuard, optionalAuth, async (req, res) => {
  try {
    const {
      type, resolved = "false",
      page  = 1,
      limit = 50,
    } = req.query;

    const filter = {};
    if (req.userId) filter.userId = req.userId;
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
// Query: ?type=restock&priority=high&page=1&limit=50
//
router.get("/recommendations", dbGuard, optionalAuth, async (req, res) => {
  try {
    const {
      type, priority,
      page  = 1,
      limit = 50,
    } = req.query;

    const filter = {};
    if (req.userId) filter.userId = req.userId;
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

// ── POST /api/inventory/restock-order ──────────────────────────────────────────
// Generate and send a restock order message via WhatsApp.
//
router.post("/inventory/restock-order", dbGuard, optionalAuth, async (req, res) => {
  try {
    const { productId, productName, quantity, branch, distributorName, distributorPhone, customMessage } = req.body;

    if (!productName || !quantity) {
      return res.status(400).json({ success: false, error: "Product name and quantity are required." });
    }

    let userPhone = null;
    let userId = req.userId || null;
    let distName = distributorName || "Distributor";
    let distPhone = distributorPhone || null;

    if (req.userId) {
      const user = await User.findById(req.userId).lean();
      userPhone = user?.phoneNumber;
      if (!distributorName && user?.businessData?.distributorName) {
        distName = user.businessData.distributorName;
      }
      if (!distributorPhone && user?.businessData?.distributorPhone) {
        distPhone = user.businessData.distributorPhone;
      }
    }

    const message = customMessage || [
      `📦 *AUTO RESTOCK ORDER*`,
      ``,
      `Hello ${distName},`,
      ``,
      `Please send *${quantity} units* of *${productName}* to branch *${branch || "Main"}*.`,
      ``,
      `This is an automated order from BharatPulse AI.`,
      `Kindly confirm availability and delivery timeline.`,
      ``,
      `🤖 _BharatPulse AI_ | ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
    ].join("\n");

    const DEMO_PHONE = "+918295057353";
    const sendTo = distPhone || userPhone || DEMO_PHONE;
    const result = await whatsappEngine.sendAndLog({
      userId,
      to: sendTo,
      message,
      title: `Restock Order: ${quantity}x ${productName} → ${branch || "Main"}`,
      type: "restock_order",
      severity: "warning",
    });

    return res.json({
      success: true,
      message: `Restock order sent for ${productName}.`,
      whatsappStatus: result.whatsappStatus,
      whatsappSid: result.whatsappSid,
      sentTo: sendTo || "in-app only",
      orderMessage: message,
    });
  } catch (err) {
    console.error("[RestockOrder] Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/inventory/transfer-suggestions ───────────────────────────────────
// Detect branch imbalances and suggest stock transfers.
//
router.get("/inventory/transfer-suggestions", dbGuard, optionalAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.userId) filter.userId = req.userId;

    const items = await InventoryItem.find(filter).lean();
    if (items.length === 0) {
      return res.json({ success: true, suggestions: [], message: "No inventory data." });
    }

    // Group by product across branches
    const productMap = {};
    for (const item of items) {
      const key = item.name?.toLowerCase() || item.productId;
      if (!productMap[key]) productMap[key] = [];
      productMap[key].push(item);
    }

    const suggestions = [];

    for (const [, branchItems] of Object.entries(productMap)) {
      if (branchItems.length < 2) continue;

      // Find surplus branches (>= 1.5x max) and deficit branches (<= min)
      for (const deficit of branchItems) {
        const dQty = deficit.quantity || 0;
        const dMin = deficit.minStockLevel || 10;
        if (dQty > dMin) continue; // Not low stock

        for (const surplus of branchItems) {
          if (surplus.branch === deficit.branch) continue;
          const sQty = surplus.quantity || 0;
          const sMin = surplus.minStockLevel || 10;
          if (sQty <= sMin * 1.5) continue; // Not enough surplus

          const transferQty = Math.min(
            Math.floor((sQty - sMin) * 0.5), // Transfer half the surplus
            dMin - dQty + 5 // Enough to bring deficit above min + buffer
          );

          if (transferQty <= 0) continue;

          suggestions.push({
            id: `transfer_${surplus._id}_${deficit._id}`,
            productName: surplus.name,
            productId: surplus.productId,
            fromBranch: surplus.branch,
            toBranch: deficit.branch,
            quantity: transferQty,
            fromStock: sQty,
            toStock: dQty,
            fromMinStock: sMin,
            toMinStock: dMin,
            reason: `${deficit.name} is low at ${deficit.branch} (${dQty} units) while ${surplus.branch} has surplus (${sQty} units).`,
            priority: dQty === 0 ? "urgent" : dQty <= dMin * 0.5 ? "high" : "medium",
          });
        }
      }
    }

    suggestions.sort((a, b) => {
      const p = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (p[a.priority] || 3) - (p[b.priority] || 3);
    });

    return res.json({ success: true, suggestions, total: suggestions.length });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/inventory/initiate-transfer ─────────────────────────────────────
// Execute a branch-to-branch stock transfer and optionally send WhatsApp.
//
router.post("/inventory/initiate-transfer", dbGuard, optionalAuth, async (req, res) => {
  try {
    const { productId, productName, fromBranch, toBranch, quantity, sendWhatsApp: shouldSend = true } = req.body;

    if (!productName || !fromBranch || !toBranch || !quantity) {
      return res.status(400).json({ success: false, error: "productName, fromBranch, toBranch, and quantity are required." });
    }

    const userId = req.userId || null;

    // Update stock levels in DB
    const fromItem = await InventoryItem.findOne({ productId, branch: fromBranch, userId });
    const toItem = await InventoryItem.findOne({ productId, branch: toBranch, userId });

    if (!fromItem) {
      return res.status(404).json({ success: false, error: `Product not found in ${fromBranch}.` });
    }
    if (fromItem.quantity < quantity) {
      return res.status(400).json({ success: false, error: `Insufficient stock in ${fromBranch}. Available: ${fromItem.quantity}` });
    }

    fromItem.quantity -= quantity;
    await fromItem.save();

    if (toItem) {
      toItem.quantity += quantity;
      await toItem.save();
    } else {
      await InventoryItem.create({
        ...fromItem.toObject(),
        _id: undefined,
        branch: toBranch,
        quantity,
        lastSyncedAt: new Date(),
      });
    }

    // Build message
    const message = [
      `🔄 *INTERNAL STOCK TRANSFER*`,
      ``,
      `Transfer *${quantity} units* of *${productName}*`,
      `📍 From: ${fromBranch} → To: ${toBranch}`,
      ``,
      `Transfer initiated via BharatPulse AI.`,
      `Please arrange delivery route.`,
      ``,
      `🤖 _BharatPulse AI_ | ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
    ].join("\n");

    let whatsappResult = { whatsappStatus: "skipped" };
    if (shouldSend && userId) {
      const user = await User.findById(userId).lean();
      whatsappResult = await whatsappEngine.sendAndLog({
        userId,
        to: user?.phoneNumber,
        message,
        title: `Transfer: ${quantity}x ${productName} (${fromBranch} → ${toBranch})`,
        type: "branch_transfer",
        severity: "info",
      });
    }

    // Re-run analysis on affected items
    const updatedItems = await InventoryItem.find({
      productId,
      userId,
      branch: { $in: [fromBranch, toBranch] },
    }).lean();
    await runAnalysis(updatedItems);

    return res.json({
      success: true,
      message: `Transferred ${quantity} units of ${productName} from ${fromBranch} to ${toBranch}.`,
      transfer: { productName, productId, fromBranch, toBranch, quantity },
      whatsappStatus: whatsappResult.whatsappStatus,
      transferMessage: message,
    });
  } catch (err) {
    console.error("[Transfer] Error:", err.message);
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
    whatsappEnabled: whatsappEngine.isAvailable(),
    activePollers: activePollers.size,
    timestamp: new Date().toISOString(),
  });
});

// Exported for use by user routes and server startup
module.exports = router;
module.exports.syncSheet = syncSheet;
module.exports.startPoller = startPoller;
module.exports.restartAllPollers = restartAllPollers;
module.exports.mapRowToInventory = mapRowToInventory;
