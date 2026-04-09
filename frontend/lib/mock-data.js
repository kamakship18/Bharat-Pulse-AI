/** Static demo data for dashboard after “upload” */

export const salesTrend = [
  { month: "Jan", sales: 42000 },
  { month: "Feb", sales: 38500 },
  { month: "Mar", sales: 45100 },
  { month: "Apr", sales: 49800 },
  { month: "May", sales: 52400 },
  { month: "Jun", sales: 56100 },
];

export const stockByBranch = [
  { branch: "Rajpura", units: 1240 },
  { branch: "Chandigarh", units: 980 },
  { branch: "Pinjore", units: 760 },
];

export const categoryBreakdown = [
  { name: "Groceries", value: 42 },
  { name: "Cold drinks", value: 18 },
  { name: "Dairy", value: 22 },
  { name: "Snacks", value: 18 },
];

export const demoAlerts = [
  {
    id: "a1",
    title: "₹8,000 stock expiring in 10 days",
    detail: "Syrups & packaged juices — run a loyalty offer before write-off.",
  },
  {
    id: "a2",
    title: "Cold drink stock low before heatwave",
    detail: "Weather signal: +4°C next week. Top up crates at Rajpura.",
  },
  {
    id: "a3",
    title: "Milk shortage expected during local event",
    detail: "Mela near Pinjore branch this weekend — demand spike likely.",
  },
];

export const demoRecommendations = [
  {
    id: "r1",
    title: "Apply Buy 1 Get 1 to clear expiring stock",
    detail: "Clears risk on ₹8k batch while protecting margin on combos.",
  },
  {
    id: "r2",
    title: "Shift inventory from Branch A to Branch B",
    detail: "Bread surplus at Rajpura; Chandigarh ran out yesterday.",
  },
  {
    id: "r3",
    title: "Stock up for wedding season demand",
    detail: "Sweets & dry fruits trending +28% vs last month in your zone.",
  },
];

export const STORAGE_KEY = "bharat-pulse-onboarding";
