const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// In-memory OTP store (demo — use Redis in production)
const otpStore = new Map();

/**
 * POST /api/auth/send-otp
 * Send OTP to phone number (simulated for demo)
 */
router.post("/send-otp", async (req, res) => {
  try {
    const raw = req.body?.phoneNumber;
    const phoneNumber = raw == null ? "" : String(raw).trim();

    if (!phoneNumber || phoneNumber.replace(/\D/g, "").length < 10) {
      return res.status(400).json({
        success: false,
        error: "Please enter a valid phone number (10+ digits).",
      });
    }

    const phone = phoneNumber.replace(/\D/g, "");

    // Generate OTP — demo mode always uses 123456
    const otp = "123456";
    otpStore.set(phone, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 min
    });

    console.log(`📱 [Auth] OTP sent to ${phone}: ${otp}`);

    return res.json({
      success: true,
      message: "OTP sent successfully",
      // In production, don't send OTP in response!
      demo: true,
      hint: "Demo OTP is 123456",
    });
  } catch (err) {
    console.error("[Auth] send-otp error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to send OTP. Please try again.",
    });
  }
});

/**
 * POST /api/auth/verify-otp
 * Verify OTP and return JWT token
 */
router.post("/verify-otp", async (req, res) => {
  try {
    const { otp } = req.body;
    const rawPhone = req.body?.phoneNumber;
    const phoneNumber = rawPhone == null ? "" : String(rawPhone).trim();

    if (!phoneNumber || !otp) {
      return res.status(400).json({
        success: false,
        error: "Phone number and OTP are required.",
      });
    }

    const phone = phoneNumber.replace(/\D/g, "");

    // Verify OTP
    const stored = otpStore.get(phone);

    if (!stored) {
      return res.status(400).json({
        success: false,
        error: "No OTP found. Please request a new OTP.",
      });
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(phone);
      return res.status(400).json({
        success: false,
        error: "OTP has expired. Please request a new one.",
      });
    }

    if (stored.otp !== String(otp).trim()) {
      return res.status(400).json({
        success: false,
        error: "Invalid OTP. Please try again.",
      });
    }

    // OTP verified — clean up
    otpStore.delete(phone);

    // Find or create user
    let user = await User.findOne({ phoneNumber: phone });
    let isNewUser = false;

    if (!user) {
      user = await User.create({ phoneNumber: phone });
      isNewUser = true;
      console.log(`✅ [Auth] New user created: ${phone}`);
    } else {
      console.log(`✅ [Auth] Existing user logged in: ${phone}`);
    }

    // Generate JWT
    const secret = process.env.JWT_SECRET || "bharatpulse-demo-secret-key-2026";
    const token = jwt.sign(
      { userId: user._id.toString(), phoneNumber: phone },
      secret,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      token,
      userId: user._id.toString(),
      isNewUser,
      onboardingCompleted: user.onboardingCompleted,
      message: isNewUser ? "Account created successfully!" : "Welcome back!",
    });
  } catch (err) {
    console.error("[Auth] verify-otp error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Verification failed. Please try again.",
    });
  }
});

module.exports = router;
