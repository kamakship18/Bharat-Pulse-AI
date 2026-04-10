const mongoose = require("mongoose");

/**
 * User — represents a BharatPulse AI user.
 * 
 * Created on first OTP verification.
 * Stores business profile, onboarding status, upload history, and linked sheet sources.
 */
const UserSchema = new mongoose.Schema(
  {
    // ── Auth ──────────────────────────────────────────────────────────────────
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    // ── Onboarding ────────────────────────────────────────────────────────────
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },

    // ── Business Data ─────────────────────────────────────────────────────────
    businessData: {
      name:     { type: String, default: "" },
      location: { type: String, default: "" },
      type:     { type: String, default: "" },
      branches: [{ type: String }],
      features: { type: mongoose.Schema.Types.Mixed, default: {} },
      uploadPreference: { type: String, default: "sheets" },
      distributorName:  { type: String, default: "" },
      distributorPhone: { type: String, default: "" },
    },

    // ── Uploads ───────────────────────────────────────────────────────────────
    uploads: [
      {
        uploadId:      { type: String, required: true },
        type:          { type: String, enum: ["sheet", "image", "camera"], required: true },
        branch:        { type: String, required: true },
        source:        { type: String, default: "" },
        extractedData: [{ type: mongoose.Schema.Types.Mixed }],
        timestamp:     { type: Date, default: Date.now },
      },
    ],

    // ── Linked Google Sheets (for auto-sync persistence) ─────────────────────
    sheetSources: [
      {
        sheetUrl:     { type: String, required: true },
        branch:       { type: String, required: true },
        addedAt:      { type: Date, default: Date.now },
        lastSyncedAt: { type: Date, default: null },
        syncEnabled:  { type: Boolean, default: true },
        itemCount:    { type: Number, default: 0 },
      },
    ],
  },
  {
    timestamps: true, // createdAt + updatedAt
    collection: "users",
  }
);

module.exports = mongoose.model("User", UserSchema);
