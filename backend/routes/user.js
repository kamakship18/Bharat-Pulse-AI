const express = require("express");
const authMiddleware = require("../utils/authMiddleware");
const User = require("../models/User");

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
        onboardingCompleted: user.onboardingCompleted,
        businessData: user.businessData,
        uploads: user.uploads || [],
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

module.exports = router;
