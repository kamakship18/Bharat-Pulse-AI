/**
 * Context Engine — BharatPulse Predictive Intelligence
 *
 * The brain of the system. Takes weather data, events, and inventory
 * then applies rule-based heuristics to generate alerts + recommendations.
 *
 * Rules:
 *   1. Weather impact on demand (heatwave → cold drinks, rain → tea/snacks)
 *   2. Festival/event impact (Valentine's → chocolates, Diwali → sweets)
 *   3. Seasonal demand shifts
 *   4. Expiry risk detection
 *   5. Stockout risk (demand surge + low stock)
 *   6. Demand estimation with multipliers
 */

const { matchesProductTags } = require("./eventService");

// ── Product Category Mapping ──────────────────────────────────────────────────
// Maps common product names/categories to canonical tags for rule matching.

const PRODUCT_TAG_MAP = {
  "cold drinks":  ["cold drinks", "beverages", "soda", "cola", "pepsi", "coca-cola", "sprite", "fanta", "limca", "thumbs up", "7up", "mountain dew", "mirinda"],
  "ice cream":    ["ice cream", "kulfi", "popsicle", "frozen dessert", "amul ice cream", "kwality"],
  "water":        ["water", "mineral water", "packaged water", "bisleri", "aquafina", "kinley"],
  "juices":       ["juice", "juices", "frooti", "real juice", "tropicana", "paper boat", "appy fizz"],
  "tea":          ["tea", "chai", "green tea", "masala chai", "tea bags", "tea leaves"],
  "coffee":       ["coffee", "nescafe", "bru", "instant coffee"],
  "snacks":       ["snacks", "namkeen", "chips", "kurkure", "lays", "haldiram", "bhujia", "mixture", "biscuits"],
  "chocolates":   ["chocolate", "chocolates", "cadbury", "dairy milk", "kitkat", "ferrero", "5star"],
  "sweets":       ["sweets", "mithai", "rasgulla", "gulab jamun", "ladoo", "barfi", "jalebi", "kaju katli"],
  "dry fruits":   ["dry fruits", "almonds", "cashews", "pistachios", "raisins", "walnuts", "dates", "kaju", "badam"],
  "gifts":        ["gifts", "gift", "gift box", "hamper", "gift set"],
  "balloons":     ["balloons", "balloon", "party items", "party supplies"],
  "flowers":      ["flowers", "bouquet", "roses", "flower"],
  "cakes":        ["cake", "cakes", "pastry", "bakery"],
  "milk":         ["milk", "amul milk", "dairy", "dahi", "curd", "paneer", "butter", "ghee"],
  "fruits":       ["fruits", "fruit", "apple", "banana", "mango", "orange", "grapes"],
  "decorations":  ["decorations", "lights", "diyas", "candles", "rangoli", "torans"],
  "stationery":   ["stationery", "pens", "notebooks", "pencils", "erasers"],
  "soups":        ["soup", "soups", "warm foods", "instant soup"],
};

/**
 * Word-boundary aware keyword match.
 * Prevents "cola" from matching inside "chocolates".
 */
function wordMatch(text, keyword) {
  if (text === keyword) return true;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

/**
 * Get all matching tags for a product by checking its name + category.
 */
function getProductTags(product) {
  const name = (product.name || "").toLowerCase();
  const category = (product.category || "").toLowerCase();
  const combined = `${name} ${category}`;

  const tags = new Set();
  for (const [tag, keywords] of Object.entries(PRODUCT_TAG_MAP)) {
    if (keywords.some((kw) => wordMatch(combined, kw) || wordMatch(kw, name))) {
      tags.add(tag);
    }
  }
  if (tags.size === 0) tags.add(name);
  return [...tags];
}

// ── RULE 1: Weather Impact Rules ──────────────────────────────────────────────

const WEATHER_RULES = [
  {
    id: "heatwave_cold_drinks",
    condition: (w) => w.condition === "heatwave" || w.temperature >= 38,
    affectedTags: ["cold drinks", "ice cream", "water", "juices"],
    multiplier: 1.8,
    alertTemplate: (w) => `🔥 Heatwave alert (${w.temperature}°C) — cold beverage demand surging`,
    recTemplate: "Increase cold drink & ice cream inventory by 40-50% to meet heat-driven demand",
    severity: "warning",
    priority: "high",
  },
  {
    id: "warm_beverages",
    condition: (w) => w.condition === "warm" && w.temperature >= 35,
    affectedTags: ["cold drinks", "ice cream", "water", "juices"],
    multiplier: 1.4,
    alertTemplate: (w) => `☀️ Warm weather (${w.temperature}°C) — beverage demand rising`,
    recTemplate: "Stock up on cold beverages — warm weather driving 30-40% higher demand",
    severity: "info",
    priority: "medium",
  },
  {
    id: "rainy_comfort_food",
    condition: (w) => w.condition === "rainy",
    affectedTags: ["tea", "coffee", "snacks", "soups"],
    multiplier: 1.5,
    alertTemplate: () => "🌧️ Monsoon/rainy conditions — comfort food demand spike expected",
    recTemplate: "Stock up tea, coffee, and snack items — rainy weather drives 40-50% higher consumption",
    severity: "info",
    priority: "medium",
  },
  {
    id: "cold_warm_foods",
    condition: (w) => w.condition === "cold" || w.temperature <= 15,
    affectedTags: ["tea", "coffee", "soups", "milk"],
    multiplier: 1.4,
    alertTemplate: (w) => `❄️ Cold weather (${w.temperature}°C) — warm beverage demand rising`,
    recTemplate: "Increase tea, coffee, and soup stock for cold weather demand",
    severity: "info",
    priority: "medium",
  },
];

// ── RULE 2: Festival/Event Impact ─────────────────────────────────────────────

function evaluateFestivalImpact(festivals, product) {
  const tags = getProductTags(product);
  const impacts = [];

  for (const fest of festivals) {
    const matchedTags = tags.filter((t) =>
      fest.demandTags.some((dt) => dt.toLowerCase().includes(t) || t.includes(dt.toLowerCase()))
    );

    if (matchedTags.length > 0) {
      impacts.push({
        event: fest.name,
        daysUntil: fest.daysUntil,
        relevance: fest.relevance,
        multiplier: fest.multiplier,
        matchedTags,
        type: fest.type,
      });
    }
  }

  return impacts;
}

// ── RULE 3: Expiry Risk ───────────────────────────────────────────────────────

function evaluateExpiryRisk(product) {
  if (!product.expiryDate) return null;

  const expiry = new Date(product.expiryDate);
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  const qty = Number(product.quantity || 0);
  const price = Number(product.price || 0);
  const atRiskValue = qty * price;

  if (daysUntilExpiry < 0) {
    return {
      type: "expired",
      severity: "critical",
      daysUntilExpiry,
      atRiskValue,
      alert: `🗑️ ${product.name} has EXPIRED (${Math.abs(daysUntilExpiry)} days ago) — ${qty} units worth ₹${atRiskValue.toLocaleString("en-IN")} at risk`,
      recommendation: `Immediately remove expired ${product.name} from shelves. Run clearance sale or dispose per policy.`,
      priority: "urgent",
    };
  }

  if (daysUntilExpiry <= 3) {
    return {
      type: "expiring_critical",
      severity: "critical",
      daysUntilExpiry,
      atRiskValue,
      alert: `⏰ ${product.name} expires in ${daysUntilExpiry} day(s) — ₹${atRiskValue.toLocaleString("en-IN")} inventory at risk`,
      recommendation: `Run aggressive discount (30-50% off) on ${product.name} to clear ${qty} units before expiry. Consider BOGO or combo offers.`,
      priority: "urgent",
    };
  }

  if (daysUntilExpiry <= 7) {
    return {
      type: "expiring_soon",
      severity: "warning",
      daysUntilExpiry,
      atRiskValue,
      alert: `⚠️ ${product.name} expires in ${daysUntilExpiry} days — plan clearance for ${qty} units`,
      recommendation: `Start promotional pricing on ${product.name} (15-25% off) to accelerate sales before expiry.`,
      priority: "high",
    };
  }

  return null;
}

// ── RULE 4: Stockout Risk ─────────────────────────────────────────────────────

function evaluateStockoutRisk(product, demandMultiplier) {
  const qty = Number(product.quantity || 0);
  const minStock = Number(product.minStockLevel || 10);
  const estimatedDemand = minStock * demandMultiplier;

  if (qty === 0) {
    return {
      type: "out_of_stock",
      severity: "critical",
      alert: `🚨 ${product.name} is OUT OF STOCK — demand multiplier is ${demandMultiplier.toFixed(1)}x`,
      recommendation: `Urgently restock ${product.name}. Estimated demand: ${Math.ceil(estimatedDemand)} units. Place emergency order.`,
      priority: "urgent",
    };
  }

  if (qty <= minStock && demandMultiplier > 1.0) {
    const daysOfStock = Math.floor(qty / (estimatedDemand / 7));
    return {
      type: "stockout_risk",
      severity: "warning",
      alert: `📉 ${product.name} stock critically low (${qty} units) with ${demandMultiplier.toFixed(1)}x demand — ~${daysOfStock} days of stock left`,
      recommendation: `Restock ${product.name} immediately. With current demand surge, stock will last only ~${daysOfStock} days. Order at least ${Math.ceil(estimatedDemand - qty)} more units.`,
      priority: "high",
    };
  }

  return null;
}

// ── Demand Estimation ─────────────────────────────────────────────────────────

/**
 * Estimate demand multiplier for a product based on all active signals.
 */
function estimateDemand(product, weather, festivals, seasonal, weekendBoost) {
  let multiplier = 1.0;
  const factors = [];
  const tags = getProductTags(product);

  // Weather factor — apply only the strongest matching rule per product
  let bestWeatherRule = null;
  for (const rule of WEATHER_RULES) {
    if (rule.condition(weather)) {
      const affected = tags.some((t) => rule.affectedTags.includes(t));
      if (affected && (!bestWeatherRule || rule.multiplier > bestWeatherRule.multiplier)) {
        bestWeatherRule = rule;
      }
    }
  }
  if (bestWeatherRule) {
    multiplier *= bestWeatherRule.multiplier;
    factors.push({ source: "weather", rule: bestWeatherRule.id, value: bestWeatherRule.multiplier });
  }

  // Festival factor — take the strongest matching festival
  const festivalImpacts = evaluateFestivalImpact(festivals, product);
  if (festivalImpacts.length > 0) {
    const strongest = festivalImpacts.reduce((max, f) => f.multiplier > max.multiplier ? f : max);
    multiplier *= strongest.multiplier;
    factors.push({ source: "festival", event: strongest.event, value: strongest.multiplier });
  }

  // Seasonal factor — take the strongest
  const seasonalMatches = seasonal.filter((s) =>
    tags.some((t) => s.demandTags.some((st) => st.toLowerCase().includes(t) || t.includes(st.toLowerCase())))
  );
  if (seasonalMatches.length > 0) {
    const strongest = seasonalMatches.reduce((max, s) => s.multiplier > max.multiplier ? s : max);
    multiplier *= strongest.multiplier;
    factors.push({ source: "seasonal", event: strongest.name, value: strongest.multiplier });
  }

  // Weekend boost
  if (weekendBoost) {
    const weekendMatch = tags.some((t) =>
      weekendBoost.demandTags.some((wt) => wt.includes(t) || t.includes(wt))
    );
    if (weekendMatch) {
      multiplier *= weekendBoost.multiplier;
      factors.push({ source: "weekend", value: weekendBoost.multiplier });
    }
  }

  return {
    multiplier: Math.round(multiplier * 100) / 100,
    factors,
    baseDemand: Number(product.quantity || 0),
    estimatedDemand: Math.ceil(Number(product.quantity || 0) * multiplier),
  };
}

// ── Main Analysis Function ────────────────────────────────────────────────────

/**
 * Analyze context and generate alerts + recommendations.
 *
 * @param {Object} params
 * @param {Object} params.weather — from weatherService
 * @param {Object} params.events — from eventService (festivals, seasonal, weekendBoost)
 * @param {Array}  params.inventory — array of product objects
 * @returns {{ alerts: Array, recommendations: Array, demandInsights: Array, summary: Object }}
 */
function analyzeContext({ weather, events, inventory }) {
  const alerts = [];
  const recommendations = [];
  const demandInsights = [];
  let totalAtRiskValue = 0;

  const { festivals = [], seasonal = [], weekendBoost = null } = events || {};

  // ── Generate weather-level alerts (not per-product) ──────────────────────
  for (const rule of WEATHER_RULES) {
    if (rule.condition(weather)) {
      alerts.push({
        id: `weather_${rule.id}`,
        type: "weather_impact",
        severity: rule.severity,
        title: rule.alertTemplate(weather),
        detail: `Weather: ${weather.description} (${weather.temperature}°C, ${weather.humidity}% humidity). ${rule.recTemplate}.`,
        source: "weather",
      });
    }
  }

  // ── Generate festival-level alerts ───────────────────────────────────────
  for (const fest of festivals) {
    const urgency = fest.daysUntil <= 3 ? "critical" : fest.daysUntil <= 7 ? "warning" : "info";
    const emoji = fest.type === "festival" ? "🎉" : fest.type === "cultural" ? "💝" : "🇮🇳";

    alerts.push({
      id: `event_${fest.name.replace(/\s+/g, "_").toLowerCase()}`,
      type: "event_impact",
      severity: urgency,
      title: `${emoji} ${fest.name} in ${fest.daysUntil} day(s) — demand surge expected (${fest.multiplier}x)`,
      detail: `Products affected: ${fest.demandTags.join(", ")}. Stock up before ${fest.date}.`,
      source: "festival",
      event: fest.name,
      daysUntil: fest.daysUntil,
    });
  }

  // ── Per-product analysis ─────────────────────────────────────────────────
  for (const product of inventory) {
    const demand = estimateDemand(product, weather, festivals, seasonal, weekendBoost);
    const festivalImpacts = evaluateFestivalImpact(festivals, product);

    // Expiry risk
    const expiryRisk = evaluateExpiryRisk(product);
    if (expiryRisk) {
      totalAtRiskValue += expiryRisk.atRiskValue || 0;
      alerts.push({
        id: `expiry_${product.productId || product.name}`,
        type: "expiry_risk",
        severity: expiryRisk.severity,
        title: expiryRisk.alert,
        detail: expiryRisk.recommendation,
        source: "expiry",
        productName: product.name,
        priority: expiryRisk.priority,
      });
      recommendations.push({
        id: `rec_expiry_${product.productId || product.name}`,
        type: "discount",
        title: `Run clearance on ${product.name}`,
        detail: expiryRisk.recommendation,
        impact: expiryRisk.severity === "critical" ? "High" : "Medium",
        priority: expiryRisk.priority,
        productName: product.name,
      });
    }

    // Stockout risk (considering demand multiplier)
    const stockoutRisk = evaluateStockoutRisk(product, demand.multiplier);
    if (stockoutRisk) {
      alerts.push({
        id: `stockout_${product.productId || product.name}`,
        type: "stockout_risk",
        severity: stockoutRisk.severity,
        title: stockoutRisk.alert,
        detail: stockoutRisk.recommendation,
        source: "stockout",
        productName: product.name,
        priority: stockoutRisk.priority,
      });
      recommendations.push({
        id: `rec_restock_${product.productId || product.name}`,
        type: "restock",
        title: `Restock ${product.name} urgently`,
        detail: stockoutRisk.recommendation,
        impact: "High",
        priority: stockoutRisk.priority,
        productName: product.name,
      });
    }

    // Festival-driven recommendations
    for (const impact of festivalImpacts) {
      if (!stockoutRisk) {
        recommendations.push({
          id: `rec_fest_${product.productId}_${impact.event.replace(/\s/g, "_")}`,
          type: "demand_insight",
          title: `Stock up ${product.name} for ${impact.event}`,
          detail: `${impact.event} is ${impact.daysUntil} day(s) away. Expected demand: ${impact.multiplier}x normal. Ensure sufficient stock of ${product.name}.`,
          impact: impact.multiplier >= 2.0 ? "High" : "Medium",
          priority: impact.daysUntil <= 3 ? "urgent" : impact.daysUntil <= 7 ? "high" : "medium",
          productName: product.name,
        });
      }
    }

    // Weather-driven product-specific recommendations
    if (demand.multiplier > 1.0 && !stockoutRisk) {
      const weatherFactors = demand.factors.filter((f) => f.source === "weather");
      if (weatherFactors.length > 0) {
        const pctIncrease = Math.round((demand.multiplier - 1) * 100);
        recommendations.push({
          id: `rec_weather_${product.productId || product.name}`,
          type: "demand_insight",
          title: `Increase ${product.name} inventory by ${pctIncrease}%`,
          detail: `Weather conditions (${weather.condition}, ${weather.temperature}°C) are driving ${pctIncrease}% higher demand for ${product.name}.`,
          impact: pctIncrease >= 50 ? "High" : "Medium",
          priority: pctIncrease >= 50 ? "high" : "medium",
          productName: product.name,
        });
      }
    }

    // Demand insight entry
    if (demand.multiplier > 1.0) {
      demandInsights.push({
        product: product.name,
        currentStock: Number(product.quantity || 0),
        demandMultiplier: demand.multiplier,
        estimatedDemand: demand.estimatedDemand,
        factors: demand.factors,
        icon: demand.factors.some((f) => f.source === "weather") ? "🔥" :
              demand.factors.some((f) => f.source === "festival") ? "🎉" : "📈",
        demandChange: `+${Math.round((demand.multiplier - 1) * 100)}%`,
        reason: demand.factors.map((f) =>
          f.source === "weather" ? `${weather.condition} (${weather.temperature}°C)` :
          f.source === "festival" ? f.event :
          f.source === "seasonal" ? f.event :
          "Weekend boost"
        ).join(", "),
      });
    }
  }

  // ── Aggregate expiry alert ───────────────────────────────────────────────
  if (totalAtRiskValue > 0) {
    alerts.unshift({
      id: "aggregate_expiry_value",
      type: "expiry_risk",
      severity: "critical",
      title: `₹${totalAtRiskValue.toLocaleString("en-IN")} inventory at expiry risk`,
      detail: `Multiple products approaching expiry — run discounts or combo offers to minimize write-off losses.`,
      source: "aggregate",
      priority: "urgent",
    });
  }

  // Deduplicate recommendations by title
  const seenRecs = new Set();
  const uniqueRecs = recommendations.filter((r) => {
    if (seenRecs.has(r.title)) return false;
    seenRecs.add(r.title);
    return true;
  });

  // Sort: critical first, then by priority
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

  alerts.sort((a, b) => (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2));
  uniqueRecs.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));
  demandInsights.sort((a, b) => b.demandMultiplier - a.demandMultiplier);

  // Deduplicate demand insights — keep highest multiplier per product
  const seenProducts = new Set();
  const uniqueDemand = demandInsights.filter((d) => {
    if (seenProducts.has(d.product)) return false;
    seenProducts.add(d.product);
    return true;
  });

  return {
    alerts,
    recommendations: uniqueRecs,
    demandInsights: uniqueDemand,
    summary: {
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter((a) => a.severity === "critical").length,
      totalRecommendations: uniqueRecs.length,
      totalAtRiskValue,
      topDemandProduct: demandInsights[0]?.product || null,
      peakMultiplier: demandInsights[0]?.demandMultiplier || 1.0,
      activeFestivals: festivals.length,
      weatherCondition: weather.condition,
    },
  };
}

module.exports = { analyzeContext, estimateDemand, getProductTags };
