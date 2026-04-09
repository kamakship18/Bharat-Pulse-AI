const Alert = require("../models/Alert");

// ── Constants ─────────────────────────────────────────────────────────────────

const EXPIRY_WARNING_DAYS = 3; // Alert when expiry is within this many days

/**
 * Maps alert type → severity level.
 */
const SEVERITY_MAP = {
  out_of_stock:  "critical",
  low_stock:     "warning",
  expiring_soon: "warning",
  overstock:     "info",
};

// ── Core rules ────────────────────────────────────────────────────────────────

/**
 * Evaluates a single InventoryItem against all rules.
 * Returns an array of alert descriptors (may be empty).
 *
 * @param {Object} item  — plain object or Mongoose doc
 * @returns {Array<{type, severity, message, quantityAtAlert, expiryDateAtAlert}>}
 */
function evaluateRules(item) {
  const triggered = [];
  const qty       = Number(item.quantity ?? 0);
  const minStock  = Number(item.minStockLevel ?? 10);
  const maxStock  = Number(item.maxStockLevel ?? 500);
  const name      = item.name || item.productId || "Unknown";

  // ── Rule 1: Out of Stock ───────────────────────────────────────────────────
  if (qty === 0) {
    triggered.push({
      type:    "out_of_stock",
      message: `🚨 ${name} is completely out of stock (qty: 0).`,
      quantityAtAlert: qty,
    });
  }

  // ── Rule 2: Low Stock ─────────────────────────────────────────────────────
  else if (qty > 0 && qty <= minStock) {
    triggered.push({
      type:    "low_stock",
      message: `⚠️ ${name} is running low — only ${qty} units left (min: ${minStock}).`,
      quantityAtAlert: qty,
    });
  }

  // ── Rule 3: Overstock ─────────────────────────────────────────────────────
  if (maxStock > 0 && qty >= maxStock * 1.5) {
    triggered.push({
      type:    "overstock",
      message: `📦 ${name} is overstocked — ${qty} units on hand (max threshold: ${maxStock}).`,
      quantityAtAlert: qty,
    });
  }

  // ── Rule 4: Expiring Soon ─────────────────────────────────────────────────
  if (item.expiryDate) {
    const expiry   = new Date(item.expiryDate);
    const now      = new Date();
    const diffMs   = expiry - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= EXPIRY_WARNING_DAYS && diffDays >= 0) {
      triggered.push({
        type:            "expiring_soon",
        message:         `⏰ ${name} expires in ${diffDays} day(s) (${expiry.toDateString()}).`,
        quantityAtAlert: qty,
        expiryDateAtAlert: expiry,
      });
    } else if (diffDays < 0) {
      // Already expired — escalate to critical
      triggered.push({
        type:            "expiring_soon",
        message:         `🗑️ ${name} has already expired (${expiry.toDateString()}).`,
        quantityAtAlert: qty,
        expiryDateAtAlert: expiry,
      });
    }
  }

  // Attach severity to each triggered alert
  return triggered.map((a) => ({
    ...a,
    severity: SEVERITY_MAP[a.type] || "info",
  }));
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * runForItem — evaluate and persist alerts for a single inventory item.
 *
 * Uses findOneAndUpdate with upsert so re-runs are idempotent:
 *   - Active alert of same type already exists → update message + timestamps.
 *   - Alert type no longer triggered → resolve existing open alert.
 *
 * @param {Object} item  Mongoose InventoryItem doc or plain object
 * @returns {Promise<Alert[]>}  Array of upserted/updated alert documents
 */
async function runForItem(item) {
  const allTypes   = ["low_stock", "out_of_stock", "expiring_soon", "overstock"];
  const triggered  = evaluateRules(item);
  const triggeredTypes = triggered.map((a) => a.type);
  const results    = [];

  for (const alertData of triggered) {
    const doc = await Alert.findOneAndUpdate(
      {
        inventoryItemId: item._id,
        type:            alertData.type,
        resolved:        false, // Only match open alerts
      },
      {
        $set: {
          inventoryItemId:    item._id,
          productId:          item.productId,
          productName:        item.name,
          type:               alertData.type,
          severity:           alertData.severity,
          message:            alertData.message,
          quantityAtAlert:    alertData.quantityAtAlert ?? null,
          expiryDateAtAlert:  alertData.expiryDateAtAlert ?? null,
          resolved:           false,
          resolvedAt:         null,
        },
      },
      { upsert: true, returnDocument: "after" }
    );
    results.push(doc);
  }

  // Auto-resolve alerts whose conditions are no longer met
  const toResolve = allTypes.filter((t) => !triggeredTypes.includes(t));
  if (toResolve.length) {
    await Alert.updateMany(
      {
        inventoryItemId: item._id,
        type:            { $in: toResolve },
        resolved:        false,
      },
      {
        $set: { resolved: true, resolvedAt: new Date() },
      }
    );
  }

  if (results.length > 0) {
    console.log(
      `[AlertEngine] ${item.name || item.productId}: ${results.length} alert(s) — ` +
      results.map((r) => r.type).join(", ")
    );
  }

  return results;
}

/**
 * runForAll — run the alert engine across every item in the inventory.
 *
 * @param {Object[]} items  Array of InventoryItem documents
 * @returns {Promise<Alert[]>}  Flat array of all alerts generated
 */
async function runForAll(items) {
  const allAlerts = [];
  for (const item of items) {
    const alerts = await runForItem(item);
    allAlerts.push(...alerts);
  }
  console.log(`[AlertEngine] Processed ${items.length} item(s) → ${allAlerts.length} alert(s) active.`);
  return allAlerts;
}

module.exports = { runForItem, runForAll, evaluateRules };
