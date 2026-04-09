const mongoose = require("mongoose");

// ── Sub-document: one tab / sub-sheet ────────────────────────────────────────

const SheetTabSchema = new mongoose.Schema(
  {
    sheetName: { type: String, required: true },          // Tab name (e.g. "Inventory")
    gid:       { type: String, default: null },           // Google gid if known
    rowCount:  { type: Number, required: true },          // Number of data rows (excl. header)
    headers:   { type: [String], required: true },        // Column names
    data:      { type: [mongoose.Schema.Types.Mixed], required: true }, // Actual rows
  },
  { _id: false }
);

// ── Top-level document: one import (one spreadsheet fetch) ───────────────────

const SheetImportSchema = new mongoose.Schema(
  {
    // The original Google Sheets URL provided by the caller
    spreadsheetUrl: { type: String, required: true, trim: true },

    // Extracted spreadsheet ID (the part after /d/)
    sheetId: { type: String, required: true },

    // Summary counts
    totalSheets: { type: Number, required: true, default: 0 },
    totalRows:   { type: Number, required: true, default: 0 },

    // All tabs fetched in this import
    sheets: { type: [SheetTabSchema], required: true },

    // Convenience: the flat merged array (GET /parse-sheet format)
    // Each element has __sheet and __gid fields stamped on it.
    flatData: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  {
    timestamps: true, // Adds createdAt + updatedAt automatically
    collection: "sheet_imports",
  }
);

// Index for fast lookups by spreadsheetId and by creation time
SheetImportSchema.index({ sheetId: 1 });
SheetImportSchema.index({ createdAt: -1 });

module.exports = mongoose.model("SheetImport", SheetImportSchema);
