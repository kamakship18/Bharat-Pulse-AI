/**
 * BharatPulse — Business Pulse Score (0–100)
 * Composite “operational resilience” metric for MSME inventory: stock health,
 * expiry exposure, and open alerts. Designed for dashboard wow-factor + clarity.
 */

/**
 * @param {object} m
 * @param {number} m.totalItems
 * @param {number} m.outOfStock
 * @param {number} m.lowStock
 * @param {number} m.expiringSoon
 * @param {number} m.expired
 * @param {number} m.healthy
 * @param {number} m.openAlerts
 * @param {number} [m.branchCount]
 * @param {number} [m.totalRecommendations]
 */
function computePulseScore(m) {
  const totalItems = m.totalItems || 0;
  const branchCount = Math.max(1, Number(m.branchCount) || 1);

  if (totalItems === 0) {
    return {
      score: null,
      band: "empty",
      headline: "Unlock your Pulse",
      subline: "Connect a sheet or upload inventory — we’ll score operational health instantly.",
      drivers: [],
    };
  }

  const outOfStock = m.outOfStock || 0;
  const lowStock = m.lowStock || 0;
  const expiringSoon = m.expiringSoon || 0;
  const expired = m.expired || 0;
  const healthy = Math.max(0, m.healthy || 0);
  const openAlerts = m.openAlerts || 0;
  const totalRecs = m.totalRecommendations || 0;

  let score = 100;
  const drivers = [];

  const riskUnits = outOfStock + lowStock + expiringSoon + expired;
  const riskRatio = riskUnits / totalItems;
  score -= Math.min(38, Math.round(riskRatio * 42));

  if (outOfStock > 0) {
    drivers.push({
      kind: "risk",
      label: "Stockout pressure",
      detail: `${outOfStock} SKU(s) at zero stock`,
      weight: "high",
    });
  }
  if (expiringSoon > 0 || expired > 0) {
    drivers.push({
      kind: "expiry",
      label: "Expiry exposure",
      detail: `${expiringSoon} expiring soon · ${expired} expired`,
      weight: expired > 0 ? "high" : "medium",
    });
  }

  score -= Math.min(32, openAlerts * 3);
  if (openAlerts > 0) {
    drivers.push({
      kind: "alert",
      label: "Open alerts",
      detail: `${openAlerts} unresolved — resolve or restock to recover points`,
      weight: openAlerts > 8 ? "high" : "medium",
    });
  }

  if (totalRecs > 0) {
    drivers.push({
      kind: "ai",
      label: "AI attention",
      detail: `${totalRecs} active recommendation(s) — review for quick wins`,
      weight: "low",
    });
    score -= Math.min(8, Math.round(Math.log10(totalRecs + 1) * 6));
  }

  const healthyRatio = healthy / totalItems;
  if (healthyRatio >= 0.65) {
    score += Math.min(6, Math.round((healthyRatio - 0.5) * 12));
    drivers.push({
      kind: "positive",
      label: "Healthy mix",
      detail: `${Math.round(healthyRatio * 100)}% of SKUs look healthy`,
      weight: "good",
    });
  }

  if (branchCount > 1) {
    drivers.push({
      kind: "info",
      label: "Multi-branch",
      detail: `${branchCount} outlets tracked — transfers can rebalance stock`,
      weight: "low",
    });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let band = "attention";
  let headline = "Needs attention";
  if (score >= 78) {
    band = "strong";
    headline = "Strong resilience";
  } else if (score >= 55) {
    band = "steady";
    headline = "Steady — optimise further";
  }

  const subline = `Pulse reflects ${totalItems} SKU(s) across ${branchCount} branch(es) · alerts & expiry weighted.`;

  return {
    score,
    band,
    headline,
    subline,
    drivers: drivers.slice(0, 5),
  };
}

module.exports = { computePulseScore };
