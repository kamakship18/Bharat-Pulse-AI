const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const { extractSheetData, parseSheetToArray } = require("../utils/sheetExtractor");
const SheetImport = require("../models/SheetImport");

// ── Helper ────────────────────────────────────────────────────────────────────

const isDbConnected = () => mongoose.connection.readyState === 1;

function validateGoogleUrl(url, res) {
  if (!url || typeof url !== "string" || url.trim() === "") {
    res.status(400).json({ success: false, error: "A non-empty Google Sheets URL is required." });
    return false;
  }
  if (!url.includes("docs.google.com/spreadsheets")) {
    res.status(400).json({
      success: false,
      error: "Invalid URL. Please provide a valid Google Sheets link (docs.google.com/spreadsheets/...).",
    });
    return false;
  }
  return true;
}

// ── GET /parse-sheet ──────────────────────────────────────────────────────────
// Also reachable at GET /api/parse-sheet (mounted twice in server.js)
//
// Query param:  sheet_url=<google_sheets_url>
// Saves result to MongoDB (if connected) and returns the flat JSON array.
// Each row has __sheet (tab name) and __gid prepended.
//
// Optional: ?save=false  to skip MongoDB storage for this request.
//
router.get("/parse-sheet", async (req, res) => {
  const { sheet_url, save = "true" } = req.query;

  if (!validateGoogleUrl(sheet_url, res)) return;

  try {
    // 1. Fetch all tabs from the sheet
    const flatData = await parseSheetToArray(sheet_url.trim());

    // 2. Persist to MongoDB (if connected and not explicitly opted out)
    let savedId = null;
    if (isDbConnected() && save !== "false") {
      // Build the grouped structure too so we can store both representations
      const grouped = await extractSheetData(sheet_url.trim());
      const doc = await SheetImport.create({
        spreadsheetUrl: sheet_url.trim(),
        sheetId:        grouped.sheetId,
        totalSheets:    grouped.totalSheets,
        totalRows:      grouped.totalRows,
        sheets:         grouped.sheets,
        flatData,
      });
      savedId = doc._id;
      console.log(`[parse-sheet] Saved import → MongoDB _id: ${savedId}`);
    }

    // 3. Respond with the flat array (the spec format)
    return res.status(200).json(flatData);

  } catch (err) {
    console.error(`[parse-sheet] Error: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/extract ─────────────────────────────────────────────────────────
// Body: { "url": "<google_sheets_url>" }
// Returns rich JSON (grouped by tab) and saves to MongoDB.
//
// Optional body field: "save": false  to skip MongoDB storage.
//
router.post("/extract", async (req, res) => {
  const { url, save = true } = req.body;

  if (!validateGoogleUrl(url, res)) return;

  try {
    // 1. Fetch all tabs (grouped format with metadata)
    const result = await extractSheetData(url.trim());

    // 2. Persist to MongoDB
    let savedId = null;
    if (isDbConnected() && save !== false) {
      // Also build the flat array to store alongside
      const flatData = await parseSheetToArray(url.trim());
      const doc = await SheetImport.create({
        spreadsheetUrl: url.trim(),
        sheetId:        result.sheetId,
        totalSheets:    result.totalSheets,
        totalRows:      result.totalRows,
        sheets:         result.sheets,
        flatData,
      });
      savedId = doc._id;
      console.log(`[extract] Saved import → MongoDB _id: ${savedId}`);
    }

    return res.status(200).json({
      success: true,
      savedId,           // null if MongoDB is not connected
      ...result,
    });

  } catch (err) {
    console.error(`[extract] Error: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/imports ──────────────────────────────────────────────────────────
// Lists all saved imports (paginated, newest first).
// Query params:
//   page=1        (default: 1)
//   limit=20      (default: 20, max: 100)
//
router.get("/imports", async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({
      success: false,
      error: "MongoDB is not connected. Add MONGODB_URI to your .env file.",
    });
  }

  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const skip  = (page - 1) * limit;

  try {
    const [imports, total] = await Promise.all([
      SheetImport.find({}, {
        // Exclude the heavy data arrays from the list view
        flatData: 0,
        "sheets.data": 0,
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SheetImport.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      imports,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/imports/:id ──────────────────────────────────────────────────────
// Returns the full stored import (including all data rows).
// Query param: ?format=flat  → returns flatData array only
//              ?format=grouped → returns sheets[] grouped by tab (default)
//
router.get("/imports/:id", async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({
      success: false, error: "MongoDB is not connected.",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, error: "Invalid import ID." });
  }

  try {
    const doc = await SheetImport.findById(req.params.id).lean();
    if (!doc) {
      return res.status(404).json({ success: false, error: "Import not found." });
    }

    const format = (req.query.format || "grouped").toLowerCase();

    if (format === "flat") {
      return res.status(200).json(doc.flatData);
    }

    // Grouped (default) — return structured response
    return res.status(200).json({
      success:        true,
      id:             doc._id,
      spreadsheetUrl: doc.spreadsheetUrl,
      sheetId:        doc.sheetId,
      importedAt:     doc.createdAt,
      totalSheets:    doc.totalSheets,
      totalRows:      doc.totalRows,
      sheets:         doc.sheets,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /api/imports/:id ───────────────────────────────────────────────────
// Deletes a saved import by ID.
//
router.delete("/imports/:id", async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, error: "MongoDB is not connected." });
  }

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, error: "Invalid import ID." });
  }

  try {
    const doc = await SheetImport.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: "Import not found." });
    }
    return res.status(200).json({ success: true, message: "Import deleted successfully." });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/health ───────────────────────────────────────────────────────────

router.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    timestamp: new Date().toISOString(),
    mongodb: isDbConnected() ? "connected" : "disconnected",
  });
});

module.exports = router;
