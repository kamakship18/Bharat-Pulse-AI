const express = require("express");
const authMiddleware = require("../utils/authMiddleware");
const User = require("../models/User");
const { syncSheet, startPoller } = require("./inventory");

const router = express.Router();

/**
 * GET /api/user/me
 * Get current user's full profile
 */
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found.",
      });
    }

    return res.json({
      success: true,
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        onboardingCompleted: user.onboardingCompleted === true,
        businessData: user.businessData,
        uploads: user.uploads || [],
        sheetSources: user.sheetSources || [],
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("[User] /me error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch user data.",
    });
  }
});

/**
 * POST /api/user/save-onboarding
 * Save onboarding data and mark as completed
 */
router.post("/save-onboarding", authMiddleware, async (req, res) => {
  try {
    const {
      businessName,
      location,
      businessType,
      branches,
      features,
      uploadPreference,
    } = req.body;

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found.",
      });
    }

    // Update business data
    user.businessData = {
      name: businessName || "",
      location: location || "",
      type: businessType || "",
      branches: branches || [],
      features: features || {},
      uploadPreference: uploadPreference || "sheets",
    };
    user.onboardingCompleted = true;

    await user.save();

    console.log(`📋 [User] Onboarding saved for ${user.phoneNumber}: ${businessName}`);

    return res.json({
      success: true,
      message: "Onboarding completed successfully!",
      onboardingCompleted: true,
    });
  } catch (err) {
    console.error("[User] save-onboarding error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to save onboarding data.",
    });
  }
});

/**
 * PUT /api/user/update-profile
 * Update business profile (Edit Profile modal)
 */
router.put("/update-profile", authMiddleware, async (req, res) => {
  try {
    const {
      businessName,
      location,
      businessType,
      branches,
      features,
      distributorName,
      distributorPhone,
    } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    if (businessName !== undefined) user.businessData.name = businessName;
    if (location !== undefined) user.businessData.location = location;
    if (businessType !== undefined) user.businessData.type = businessType;
    if (branches !== undefined) user.businessData.branches = branches;
    if (features !== undefined) user.businessData.features = features;
    if (distributorName !== undefined) user.businessData.distributorName = distributorName;
    if (distributorPhone !== undefined) user.businessData.distributorPhone = distributorPhone;

    await user.save();

    console.log(`✏️  [User] Profile updated for ${user.phoneNumber}`);

    return res.json({
      success: true,
      message: "Profile updated successfully!",
      businessData: user.businessData,
    });
  } catch (err) {
    console.error("[User] update-profile error:", err.message);
    return res.status(500).json({ success: false, error: "Failed to update profile." });
  }
});

/**
 * POST /api/user/add-upload
 * Add a new upload record (sheet, image, or camera)
 */
router.post("/add-upload", authMiddleware, async (req, res) => {
  try {
    const { type, branch, source, extractedData } = req.body;

    if (!type || !branch) {
      return res.status(400).json({
        success: false,
        error: "Upload type and branch are required.",
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found.",
      });
    }

    const upload = {
      uploadId: `upload-${Date.now()}`,
      type,
      branch,
      source: source || "",
      extractedData: extractedData || [],
      timestamp: new Date(),
    };

    user.uploads.push(upload);
    await user.save();

    console.log(`📦 [User] Upload added for ${user.phoneNumber}: ${type} → ${branch}`);

    return res.json({
      success: true,
      message: "Data uploaded successfully!",
      upload,
      totalUploads: user.uploads.length,
    });
  } catch (err) {
    console.error("[User] add-upload error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to save upload.",
    });
  }
});

/**
 * GET /api/user/uploads
 * Get all uploads grouped by branch
 */
router.get("/uploads", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found.",
      });
    }

    const uploads = user.uploads || [];

    // Group by branch
    const grouped = {};
    uploads.forEach((u) => {
      if (!grouped[u.branch]) grouped[u.branch] = [];
      grouped[u.branch].push(u);
    });

    return res.json({
      success: true,
      uploads,
      grouped,
      total: uploads.length,
    });
  } catch (err) {
    console.error("[User] /uploads error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch uploads.",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SHEET SOURCE MANAGEMENT (Persistent Auto-Sync)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/user/link-sheet
 * Link a Google Sheet to a branch — immediately syncs and enables auto-polling.
 */
router.post("/link-sheet", authMiddleware, async (req, res) => {
  try {
    const { sheetUrl, branch } = req.body;

    if (!sheetUrl || !sheetUrl.includes("docs.google.com/spreadsheets")) {
      return res.status(400).json({
        success: false,
        error: "Please provide a valid Google Sheets URL.",
      });
    }

    const branchStr = (branch || "Auto").trim();

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    // Check for duplicate
    const existing = user.sheetSources.find(
      (s) => s.sheetUrl === sheetUrl.trim() && s.branch === branchStr
    );
    if (existing) {
      console.log(`[LinkSheet] Re-syncing existing sheet for ${branchStr}`);
    }

    // Sync — syncSheet auto-detects branches from tab names for multi-tab sheets
    const result = await syncSheet(sheetUrl.trim(), branchStr, req.userId, user.phoneNumber);

    // Save/update sheet source
    if (!existing) {
      user.sheetSources.push({
        sheetUrl: sheetUrl.trim(),
        branch: branchStr,
        addedAt: new Date(),
        lastSyncedAt: new Date(),
        syncEnabled: true,
        itemCount: result.itemsUpserted,
      });
    } else {
      existing.lastSyncedAt = new Date();
      existing.syncEnabled = true;
      existing.itemCount = result.itemsUpserted;
    }

    user.uploads.push({
      uploadId: `upload-${Date.now()}`,
      type: "sheet",
      branch: branchStr,
      source: sheetUrl.trim(),
      extractedData: result.items.map((i) => ({
        product: i.name,
        quantity: i.quantity,
        price: i.price,
        expiry: i.expiryDate,
      })),
      timestamp: new Date(),
    });

    await user.save();

    const intervalMs = Number(process.env.POLLING_INTERVAL_MS) || 60_000;
    startPoller(sheetUrl.trim(), branchStr, req.userId, intervalMs, user.phoneNumber);

    const branchLabel = result.isMultiTab
      ? `${Object.keys(result.branches).length} branches (${Object.keys(result.branches).join(", ")})`
      : branchStr;
    console.log(`🔗 [User] Sheet linked: ${sheetUrl} → ${branchLabel} (${result.itemsUpserted} items)`);

    return res.json({
      success: true,
      message: result.isMultiTab
        ? `Sheet synced! ${result.itemsUpserted} items across ${Object.keys(result.branches).length} branches.`
        : `Sheet synced! ${result.itemsUpserted} items imported for ${branchStr}.`,
      branch: branchStr,
      isMultiTab: result.isMultiTab || false,
      branches: result.branches || {},
      itemsUpserted: result.itemsUpserted,
      alerts: result.alerts,
      recommendations: result.recommendations,
      items: result.items,
      lastSynced: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[User] link-sheet error:", err.message);

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

    return res.status(500).json({
      success: false,
      error: err.message || "Failed to link sheet.",
    });
  }
});

/**
 * GET /api/user/sheet-sources
 * List all linked sheets with sync status
 */
router.get("/sheet-sources", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    return res.json({
      success: true,
      sheetSources: user.sheetSources || [],
      total: (user.sheetSources || []).length,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/user/sheet-sources/:index
 * Unlink a sheet source by index
 */
router.delete("/sheet-sources/:index", authMiddleware, async (req, res) => {
  try {
    const idx = parseInt(req.params.index);
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    if (idx < 0 || idx >= user.sheetSources.length) {
      return res.status(400).json({ success: false, error: "Invalid source index." });
    }

    user.sheetSources.splice(idx, 1);
    await user.save();

    return res.json({ success: true, message: "Sheet source removed." });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/user/sync-all
 * Force re-sync all linked sheets
 */
router.post("/sync-all", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    const results = [];
    for (const src of user.sheetSources || []) {
      if (!src.syncEnabled) continue;
      try {
        const result = await syncSheet(src.sheetUrl, src.branch, req.userId, user.phoneNumber);
        results.push({
          branch: src.branch,
          success: true,
          itemsUpserted: result.itemsUpserted,
          alerts: result.alerts,
        });
        src.lastSyncedAt = new Date();
        src.itemCount = result.itemsUpserted;
      } catch (err) {
        results.push({ branch: src.branch, success: false, error: err.message });
      }
    }

    await user.save();

    return res.json({
      success: true,
      message: `Synced ${results.filter((r) => r.success).length}/${results.length} sheet(s).`,
      results,
      lastSynced: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
