const axios = require("axios");
const Recommendation = require("../models/Recommendation");

// ── Groq (OpenAI-compatible) ────────────────────────────────────────────────
// https://console.groq.com/docs/openai

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL =
  process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(item) {
  const snapshot = {
    productId: item.productId,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    minStockLevel: item.minStockLevel,
    maxStockLevel: item.maxStockLevel,
    price: item.price,
    expiryDate: item.expiryDate
      ? new Date(item.expiryDate).toISOString().split("T")[0]
      : null,
    lastSyncedAt: item.lastSyncedAt,
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

  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  const parsed = JSON.parse(text);

  const validTypes = ["restock", "discount", "demand_insight", "hold", "other"];
  const validPriority = ["low", "medium", "high", "urgent"];

  if (!validTypes.includes(parsed.type)) {
    throw new Error(`Invalid recommendation type: "${parsed.type}"`);
  }
  if (!parsed.suggestion) {
    throw new Error("AI response missing 'suggestion' field.");
  }
  if (!validPriority.includes(parsed.priority)) {
    parsed.priority = "medium";
  }
  if (typeof parsed.confidence !== "number") {
    parsed.confidence = null;
  } else {
    parsed.confidence = Math.min(1, Math.max(0, parsed.confidence));
  }

  return parsed;
}

/**
 * Call Groq chat completions API.
 * @returns {Promise<string>} assistant message content
 */
async function callGroq(prompt) {
  const apiKey = (process.env.GROQ_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set in .env — add it to enable AI recommendations.");
  }

  const { data } = await axios.post(
    GROQ_API_URL,
    {
      model: DEFAULT_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.35,
      max_tokens: 1024,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 60_000,
    }
  );

  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("Groq returned an empty or invalid response.");
  }
  return content;
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
    const prompt = buildPrompt(item);
    rawText = await callGroq(prompt);

    const parsed = parseAIResponse(rawText);

    const snapshot = {
      quantity: item.quantity,
      minStockLevel: item.minStockLevel,
      maxStockLevel: item.maxStockLevel,
      price: item.price,
      expiryDate: item.expiryDate,
    };

    const doc = await Recommendation.findOneAndUpdate(
      { inventoryItemId: item._id },
      {
        $set: {
          inventoryItemId: item._id,
          productId: item.productId,
          productName: item.name,
          type: parsed.type,
          suggestion: parsed.suggestion,
          reasoning: parsed.reasoning || null,
          priority: parsed.priority,
          confidence: parsed.confidence,
          inventorySnapshot: snapshot,
          rawAIResponse: rawText,
          generatedAt: new Date(),
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    console.log(
      `[AIEngine] ${item.name}: ${parsed.type} (priority: ${parsed.priority})`
    );
    return doc;
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    console.error(
      `[AIEngine] Failed for "${item.name || item.productId}": ${msg}`
    );
    if (rawText) console.error(`[AIEngine] Raw response: ${rawText}`);
    return null;
  }
}

/**
 * runForAll — run AI recommendations for every inventory item.
 *
 * Runs sequentially to avoid rate-limit issues.
 *
 * @param {Object[]} items  Array of InventoryItem documents
 * @returns {Promise<Recommendation[]>}
 */
async function runForAll(items) {
  const results = [];
  for (const item of items) {
    const rec = await runForItem(item);
    if (rec) results.push(rec);
    await new Promise((r) => setTimeout(r, 150));
  }
  console.log(
    `[AIEngine] Generated ${results.length}/${items.length} recommendation(s).`
  );
  return results;
}

/**
 * isAvailable — Groq API key configured.
 */
function isAvailable() {
  return !!(process.env.GROQ_API_KEY || "").trim();
}

module.exports = { runForItem, runForAll, isAvailable };
