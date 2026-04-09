const mongoose = require("mongoose");

/**
 * Connects to MongoDB using the URI in process.env.MONGODB_URI.
 * Call this once at server startup (server.js).
 */
async function connectDB() {
  const uri = typeof process.env.MONGODB_URI === "string" ? process.env.MONGODB_URI.trim() : "";

  if (!uri) {
    console.warn(
      "\n⚠️  MONGODB_URI is not set in .env — MongoDB features are disabled.\n" +
        "   Add MONGODB_URI=mongodb://localhost:27017/sheetsdb to your .env file.\n"
    );
    return; // Graceful no-op: API still works, just won't persist data
  }

  try {
    await mongoose.connect(uri);
    console.log(`✅ MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.error(`❌ MongoDB connection failed: ${err.message}`);
    // Don't crash the server — API continues without persistence
  }
}

module.exports = connectDB;
