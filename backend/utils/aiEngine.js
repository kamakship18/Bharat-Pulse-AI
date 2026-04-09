const { GoogleGenerativeAI } = require("@google/generative-ai");
const Recommendation = require("../models/Recommendation");

// ── Gemini client (lazy init) ─────────────────────────────────────────────────

let _genAI = null;
let _model = null;

function getModel() {
  if (!_model) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not set in .env — add it to enable AI recommendations."
      );
    }
    _genAI = new GoogleGenerativeAI(apiKey);
    _model = _genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }
  return _model;
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(item) {
  const snapshot = {
    productId:     item.productId,
    name:          item.name,
    category:      item.category,
    quantity:      item.quantity,
    minStockLevel: item.minStockLevel,
    maxStockLevel: item.maxStockLevel,
    price:         item.price,
    expiryDate:    item.expiryDate
      ? new Date(item.expiryDate).toISOString().split("T")[0]
      : null,
    lastSyncedAt:  item.lastSyncedAt,
  };

  return `You are a business assistant managing an inventory system.

Analyze the following inventory data for a single product and return ONE actionable recommendation.

Inventory Data:
${JSON.stringify(snapshot, null, 2)}

Rules:
- If quantity is 0 or very low (≤ minStockLevel): recommend "restock"
- If expiry is within 3 days: recommend "discount" with urgency
- If quantity is far above maxStockLevel: recommend "hold" or suggest promotions
- Otherwise: return a "demand_insight" with context-aware advice

Respond ONLY with a single valid JSON object (no markdown, no explanation, no code fences) in this exact schema:
{
  "type": "restock" | "discount" | "demand_insight" | "hold" | "other",
  "suggestion": "<specific action to take, max 2 sentences>",
  "reasoning": "<why this recommendation, max 2 sentences>",
  "priority": "low" | "medium" | "high" | "urgent",
  "confidence": <0.0 to 1.0 float>
}`;
}

// ── Parse AI output ───────────────────────────────────────────────────────────

function parseAIResponse(raw) {
  let text = (raw || "").trim();

  // Strip markdown code fences if the model adds them despite instructions
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  const parsed = JSON.parse(text); // Let it throw — caller will catch

  // Validate required fields
  const validTypes     = ["restock", "discount", "demand_insight", "hold", "other"];
  const validPriority  = ["low", "medium", "high", "urgent"];

  if (!validTypes.includes(parsed.type)) {
    throw new Error(`Invalid recommendation type: "${parsed.type}"`);
  }
  if (!parsed.suggestion) {
    throw new Error("AI response missing 'suggestion' field.");
  }
  if (!validPriority.includes(parsed.priority)) {
    parsed.priority = "medium"; // Normalise invalid priority
  }
  if (typeof parsed.confidence !== "number") {
    parsed.confidence = null;
  } else {
    parsed.confidence = Math.min(1, Math.max(0, parsed.confidence));
  }

  return parsed;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * runForItem — generate and persist an AI recommendation for one item.
 *
 * @param {Object} item  InventoryItem document or plain object
 * @returns {Promise<Recommendation|null>}
 */
async function runForItem(item) {
  let rawText = null;
  try {
    const model  = getModel();
    const prompt = buildPrompt(item);
    const result = await model.generateContent(prompt);
    rawText      = result.response.text();

    const parsed = parseAIResponse(rawText);

    // Build inventory snapshot (for audit)
    const snapshot = {
      quantity:      item.quantity,
      minStockLevel: item.minStockLevel,
      maxStockLevel: item.maxStockLevel,
      price:         item.price,
      expiryDate:    item.expiryDate,
    };

    // Upsert: one recommendation per item, latest replaces previous
    const doc = await Recommendation.findOneAndUpdate(
      { inventoryItemId: item._id },
      {
        $set: {
          inventoryItemId:    item._id,
          productId:          item.productId,
          productName:        item.name,
          type:               parsed.type,
          suggestion:         parsed.suggestion,
          reasoning:          parsed.reasoning   || null,
          priority:           parsed.priority,
          confidence:         parsed.confidence,
          inventorySnapshot:  snapshot,
          rawAIResponse:      rawText,
          generatedAt:        new Date(),
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    console.log(
      `[AIEngine] ${item.name}: ${parsed.type} (priority: ${parsed.priority})`
    );
    return doc;

  } catch (err) {
    // Non-fatal: log and continue so one bad item doesn't stop the batch
    console.error(
      `[AIEngine] Failed for "${item.name || item.productId}": ${err.message}`
    );
    if (rawText) console.error(`[AIEngine] Raw response: ${rawText}`);
    return null;
  }
}

/**
 * runForAll — run AI recommendations for every inventory item.
 *
 * Runs sequentially to avoid rate-limit issues with the Gemini free tier.
 *
 * @param {Object[]} items  Array of InventoryItem documents
 * @returns {Promise<Recommendation[]>}
 */
async function runForAll(items) {
  const results = [];
  for (const item of items) {
    const rec = await runForItem(item);
    if (rec) results.push(rec);
    // Small delay to be polite to the API rate limits
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log(
    `[AIEngine] Generated ${results.length}/${items.length} recommendation(s).`
  );
  return results;
}

/**
 * isAvailable — quick check whether Gemini is configured.
 */
function isAvailable() {
  return !!process.env.GEMINI_API_KEY;
}

module.exports = { runForItem, runForAll, isAvailable };
