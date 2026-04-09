/** Static demo data for dashboard after "upload" */

export const salesTrend = [
  { month: "Jan", sales: 42000 },
  { month: "Feb", sales: 38500 },
  { month: "Mar", sales: 45100 },
  { month: "Apr", sales: 49800 },
  { month: "May", sales: 52400 },
  { month: "Jun", sales: 56100 },
];

export const stockByBranch = [
  { branch: "Rajpura", units: 1240, risk: 320, healthy: 920 },
  { branch: "Chandigarh", units: 980, risk: 80, healthy: 900 },
  { branch: "Pinjore", units: 760, risk: 150, healthy: 610 },
];

export const categoryBreakdown = [
  { name: "Groceries", value: 42 },
  { name: "Cold drinks", value: 18 },
  { name: "Dairy", value: 22 },
  { name: "Snacks", value: 18 },
];

export const demandTrending = [
  { product: "Coca-Cola 2L", demand: "+45%", reason: "Heatwave approaching", icon: "🔥" },
  { product: "Haldiram Namkeen", demand: "+32%", reason: "Wedding season", icon: "🎉" },
  { product: "Amul Ice Cream", demand: "+28%", reason: "Summer peak", icon: "☀️" },
  { product: "Maggi Noodles", demand: "+18%", reason: "School season", icon: "📚" },
];

export const branchComparison = [
  {
    branch: "Rajpura",
    totalStock: 1240,
    expiringItems: 5,
    lowStockItems: 2,
    riskScore: "High",
    riskColor: "red",
    revenue: "₹2,34,000",
  },
  {
    branch: "Chandigarh",
    totalStock: 980,
    expiringItems: 1,
    lowStockItems: 0,
    riskScore: "Low",
    riskColor: "green",
    revenue: "₹1,87,000",
  },
  {
    branch: "Pinjore",
    totalStock: 760,
    expiringItems: 0,
    lowStockItems: 1,
    riskScore: "Medium",
    riskColor: "amber",
    revenue: "₹1,45,000",
  },
];

export const stockHealth = {
  totalProducts: 12,
  totalUnits: 215,
  totalValue: "₹42,580",
  lowStockItems: 2,
  outOfStockItems: 0,
  expiringItems: 5,
  healthyItems: 5,
};

export const demoAlerts = [
  {
    id: "a1",
    title: "₹8,000 stock expiring in 3 days",
    detail: "Milk, Bread & Curd at Rajpura — run a loyalty offer before write-off.",
    severity: "critical",
  },
  {
    id: "a2",
    title: "Cold drink stock low before heatwave",
    detail: "Weather signal: +4°C next week. Top up crates at Rajpura.",
    severity: "warning",
  },
  {
    id: "a3",
    title: "Milk shortage expected during local event",
    detail: "Mela near Pinjore branch this weekend — demand spike likely.",
    severity: "warning",
  },
  {
    id: "a4",
    title: "Namkeen expires in 5 days",
    detail: "Haldiram Namkeen at Rajpura — consider discount or combo offer.",
    severity: "info",
  },
];

export const demoRecommendations = [
  {
    id: "r1",
    title: "Apply Buy 1 Get 1 to clear expiring stock",
    detail: "Clears risk on ₹8k batch while protecting margin on combos.",
    impact: "High",
  },
  {
    id: "r2",
    title: "Transfer surplus from Chandigarh → Rajpura",
    detail: "Bread surplus at Chandigarh; Rajpura ran out yesterday.",
    impact: "High",
  },
  {
    id: "r3",
    title: "Stock up for wedding season demand",
    detail: "Sweets & dry fruits trending +28% vs last month in your zone.",
    impact: "Medium",
  },
  {
    id: "r4",
    title: "Restock Coca-Cola ahead of heatwave",
    detail: "Cold drinks demand projected +45% in your region next week.",
    impact: "High",
  },
];

// ── Predictive Intelligence Fallback Data ─────────────────────────────────────
// Used when the prediction API is unreachable.

export const fallbackPrediction = {
  signals: {
    weather: { condition: "heatwave", temperature: 38, humidity: 35, description: "Hot and dry winds" },
    events: {
      upcomingFestivals: 1,
      activeSeasonalPatterns: 2,
      isWeekend: false,
      festivals: [{ name: "Wedding Season", daysUntil: 0, relevance: "active", multiplier: 1.8 }],
      seasonal: [{ name: "Summer Season", type: "seasonal", multiplier: 1.5 }],
    },
  },
  alerts: [
    { id: "w1", type: "weather_impact", severity: "warning", title: "🔥 Heatwave alert (38°C) — cold beverage demand surging", detail: "Weather: Hot and dry winds. Increase cold drink & ice cream inventory by 40-50%.", source: "weather" },
    { id: "e1", type: "expiry_risk", severity: "critical", title: "₹8,000 inventory at expiry risk", detail: "Multiple products approaching expiry — run discounts or combo offers.", source: "aggregate" },
    { id: "e2", type: "event_impact", severity: "info", title: "🎉 Wedding Season active — demand surge for sweets & dry fruits", detail: "Products affected: sweets, dry fruits, gifts, decorations.", source: "festival" },
    { id: "s1", type: "stockout_risk", severity: "warning", title: "📉 Coca-Cola 2L stock critically low (8 units) with 2.7x demand", detail: "Restock immediately — stock will last only ~2 days at current demand.", source: "stockout" },
  ],
  recommendations: [
    { id: "r1", type: "discount", title: "Run clearance on expiring stock", detail: "Run aggressive discount (30-50% off) on expiring items to clear inventory before write-off.", impact: "High" },
    { id: "r2", type: "restock", title: "Restock Coca-Cola 2L urgently", detail: "Cold drinks demand projected +80% due to heatwave. Order at least 25 more units.", impact: "High" },
    { id: "r3", type: "demand_insight", title: "Stock up sweets for wedding season", detail: "Wedding season driving 1.8x demand for sweets & dry fruits. Ensure sufficient stock.", impact: "Medium" },
    { id: "r4", type: "demand_insight", title: "Increase ice cream inventory by 80%", detail: "Heatwave conditions (38°C) are driving 80% higher demand for ice cream.", impact: "High" },
  ],
  demandInsights: [
    { product: "Coca-Cola 2L", demand: "+170%", reason: "Heatwave + Summer Season", icon: "🔥" },
    { product: "Amul Ice Cream", demand: "+80%", reason: "Heatwave (38°C)", icon: "🔥" },
    { product: "Kaju Katli", demand: "+80%", reason: "Wedding Season", icon: "🎉" },
    { product: "Haldiram Namkeen", demand: "+50%", reason: "Summer Season", icon: "☀️" },
  ],
  summary: { totalAlerts: 4, criticalAlerts: 1, totalRecommendations: 4, weatherCondition: "heatwave", activeFestivals: 1 },
};

export const STORAGE_KEY = "bharat-pulse-onboarding";
