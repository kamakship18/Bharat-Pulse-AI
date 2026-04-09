const mongoose   = require("mongoose");
const InventoryItem = require("../models/InventoryItem");
const alertEngine   = require("./alertEngine");
const aiEngine      = require("./aiEngine");

let _changeStream = null;
let _isListening  = false;

/**
 * startChangeStreamListener
 *
 * Opens a MongoDB change stream on the `inventoryitems` collection.
 * Whenever an item is created, updated, or replaced, the alert engine and
 * AI recommendation engine are re-run for that specific item.
 *
 * Falls back gracefully if the MongoDB deployment doesn't support
 * change streams (e.g. standalone, no replica set).
 */
async function startChangeStreamListener() {
  if (_isListening) {
    console.log("[ChangeStream] Already listening — skipping duplicate start.");
    return;
  }

  if (mongoose.connection.readyState !== 1) {
    console.warn(
      "[ChangeStream] Skipped — MongoDB is not connected (set MONGODB_URI in backend/.env)."
    );
    return;
  }

  try {
    const collection = mongoose.connection.collection("inventoryitems");

    _changeStream = collection.watch(
      [
        {
          $match: {
            operationType: { $in: ["insert", "update", "replace"] },
          },
        },
      ],
      {
        fullDocument: "updateLookup", // Always include the full doc after change
      }
    );

    if (!_changeStream || typeof _changeStream.on !== "function") {
      console.error(
        "[ChangeStream] Unexpected watch() result — driver may require a connected replica set / Atlas."
      );
      _isListening = false;
      return;
    }

    _isListening = true;
    console.log("[ChangeStream] ✅ Listening to inventoryitems collection...");

    _changeStream.on("change", async (event) => {
      const doc = event.fullDocument;
      if (!doc) return;

      console.log(
        `[ChangeStream] 🔄 Change detected: ${event.operationType} → "${doc.name || doc.productId}"`
      );

      try {
        // Run alert engine for the changed item
        await alertEngine.runForItem(doc);

        // Run AI recommendation engine if configured
        if (aiEngine.isAvailable()) {
          await aiEngine.runForItem(doc);
        }
      } catch (err) {
        console.error(`[ChangeStream] Error processing change: ${err.message}`);
      }
    });

    _changeStream.on("error", (err) => {
      console.error(`[ChangeStream] Stream error: ${err.message}`);
      _isListening = false;
      // Auto-reconnect after 10 seconds
      setTimeout(() => {
        console.log("[ChangeStream] Attempting to reconnect...");
        startChangeStreamListener();
      }, 10_000);
    });

    _changeStream.on("close", () => {
      _isListening = false;
      console.log("[ChangeStream] Stream closed.");
    });

  } catch (err) {
    _isListening = false;
    if (
      err.message.includes("$changeStream") ||
      err.message.includes("replica set") ||
      err.codeName === "CommandNotSupportedOnView" ||
      err.code === 40573
    ) {
      console.warn(
        "[ChangeStream] ⚠️  Change streams are not supported on this MongoDB deployment " +
        "(requires Atlas M0+ or a replica set).\n" +
        "             Falling back to event-based triggers — alerts/AI will still " +
        "run on every sync, just not on direct DB writes."
      );
    } else {
      console.error(`[ChangeStream] Failed to start: ${err.message}`);
    }
  }
}

/**
 * stopChangeStreamListener — gracefully close the stream.
 */
async function stopChangeStreamListener() {
  if (_changeStream && typeof _changeStream.close === "function") {
    await _changeStream.close();
    _changeStream = null;
    _isListening  = false;
    console.log("[ChangeStream] Listener stopped.");
  }
}

/**
 * isListening — returns true if the stream is active.
 */
function isListening() {
  return _isListening;
}

module.exports = { startChangeStreamListener, stopChangeStreamListener, isListening };
