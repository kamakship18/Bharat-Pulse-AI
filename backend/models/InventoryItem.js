const mongoose = require("mongoose");

/**
 * InventoryItem — one product row synced from Google Sheets.
 *
 * productId is the unique upsert key (mapped from SKU / id / product_id columns).
 * If the sheet has no unique ID column, name is used as the fallback key.
 */
const InventoryItemSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────────
    productId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    category: { type: String, default: "Uncategorized", trim: true },

    // ── Stock levels ──────────────────────────────────────────────────────────
    quantity: { type: Number, required: true, default: 0, min: 0 },
    units: { type: String, default: "units", trim: true },
    minStockLevel: { type: Number, default: 10 },   // Trigger low-stock alert
    maxStockLevel: { type: Number, default: 500 },  // Trigger overstock alert

    // ── Product info ──────────────────────────────────────────────────────────
    costPrice: { type: Number, default: null },
    price: { type: Number, default: null },          // Selling price
    expiryDate: { type: Date, default: null },       // null = does not expire
    lastRestocked: { type: Date, default: null },

    // ── Branch & User scope ──────────────────────────────────────────────────
    branch: { type: String, default: "Main", trim: true, index: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      default: null,
    },

    // ── Source tracking ───────────────────────────────────────────────────────
    sourceSheetUrl: { type: String, default: null },
    lastSyncedAt:   { type: Date, default: Date.now },
    productionBatch: { type: String, default: null },

    // Catch-all bucket for extra columns from the sheet that don't map to
    // known fields — preserved for transparency.
    extraFields: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,   // createdAt + updatedAt
    collection: "inventoryitems",
  }
);

// Compound unique key: one product per branch per user
InventoryItemSchema.index({ productId: 1, branch: 1, userId: 1 }, { unique: true });

// Compound text index for search
InventoryItemSchema.index({ name: "text", category: "text" });
InventoryItemSchema.index({ expiryDate: 1 });
InventoryItemSchema.index({ quantity: 1 });

module.exports = mongoose.model("InventoryItem", InventoryItemSchema);
