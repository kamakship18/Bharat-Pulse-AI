/**
 * Event & Festival Service — BharatPulse Predictive Intelligence
 *
 * Provides a comprehensive Indian festival calendar plus seasonal/cultural
 * event detection. Returns events relevant to a given date window.
 */

// ── Comprehensive Indian Festival Calendar ───────────────────────────────────
// Dates shift yearly; these are approximate 2025-2026 ranges.
// The engine matches events within a configurable lookahead window.

const FESTIVAL_CALENDAR = [
  // ── National / Pan-India ─────────────────────────────────────────────────
  { name: "Republic Day",         month: 1,  day: 26, type: "national",  demandTags: ["sweets", "flags", "decorations"], multiplier: 1.3 },
  { name: "Valentine's Day",      month: 2,  day: 14, type: "cultural",  demandTags: ["chocolates", "gifts", "balloons", "flowers", "cakes"], multiplier: 2.0 },
  { name: "Holi",                 month: 3,  day: 14, type: "festival",  demandTags: ["colors", "sweets", "cold drinks", "snacks", "water guns", "thandai"], multiplier: 2.0 },
  { name: "Gudi Padwa / Ugadi",   month: 3,  day: 30, type: "festival",  demandTags: ["sweets", "fruits", "decorations", "pooja items"], multiplier: 1.5 },
  { name: "Ram Navami",           month: 4,  day: 6,  type: "festival",  demandTags: ["sweets", "fruits", "pooja items"], multiplier: 1.3 },
  { name: "Baisakhi / Vishu",     month: 4,  day: 14, type: "festival",  demandTags: ["sweets", "dry fruits", "festive items"], multiplier: 1.5 },
  { name: "Eid ul-Fitr",          month: 4,  day: 1,  type: "festival",  demandTags: ["sweets", "dry fruits", "perfumes", "clothing", "gifts"], multiplier: 1.8 },
  { name: "Mother's Day",         month: 5,  day: 11, type: "cultural",  demandTags: ["gifts", "cakes", "flowers", "chocolates"], multiplier: 1.4 },
  { name: "Eid ul-Adha",          month: 6,  day: 7,  type: "festival",  demandTags: ["sweets", "dry fruits", "perfumes", "clothing"], multiplier: 1.6 },
  { name: "Raksha Bandhan",       month: 8,  day: 9,  type: "festival",  demandTags: ["rakhi", "sweets", "chocolates", "gifts", "dry fruits"], multiplier: 2.0 },
  { name: "Independence Day",     month: 8,  day: 15, type: "national",  demandTags: ["flags", "sweets", "decorations"], multiplier: 1.3 },
  { name: "Janmashtami",          month: 8,  day: 16, type: "festival",  demandTags: ["sweets", "milk", "butter", "decorations", "pooja items"], multiplier: 1.5 },
  { name: "Ganesh Chaturthi",     month: 8,  day: 27, type: "festival",  demandTags: ["idols", "sweets", "decorations", "fruits", "modak"], multiplier: 1.8 },
  { name: "Onam",                 month: 9,  day: 5,  type: "festival",  demandTags: ["sweets", "flowers", "fruits", "decorations"], multiplier: 1.5 },
  { name: "Navratri Begins",      month: 10, day: 2,  type: "festival",  demandTags: ["fruits", "sweets", "decorations", "garba items", "pooja items"], multiplier: 1.8 },
  { name: "Dussehra / Vijayadashami", month: 10, day: 12, type: "festival", demandTags: ["sweets", "decorations", "gifts", "firecrackers"], multiplier: 1.7 },
  { name: "Karwa Chauth",         month: 10, day: 20, type: "festival",  demandTags: ["sweets", "gifts", "cosmetics", "clothing", "mehndi"], multiplier: 1.5 },
  { name: "Diwali",               month: 10, day: 31, type: "festival",  demandTags: ["sweets", "dry fruits", "gifts", "decorations", "firecrackers", "lights", "diyas", "candles", "chocolates"], multiplier: 2.5 },
  { name: "Bhai Dooj",            month: 11, day: 2,  type: "festival",  demandTags: ["sweets", "gifts", "chocolates"], multiplier: 1.4 },
  { name: "Children's Day",       month: 11, day: 14, type: "national",  demandTags: ["chocolates", "toys", "snacks", "gifts"], multiplier: 1.3 },
  { name: "Christmas",            month: 12, day: 25, type: "festival",  demandTags: ["cakes", "chocolates", "gifts", "decorations", "wine", "dry fruits"], multiplier: 1.8 },
  { name: "New Year's Eve",       month: 12, day: 31, type: "cultural",  demandTags: ["cold drinks", "snacks", "cakes", "party items", "decorations"], multiplier: 1.7 },
  { name: "Lohri",                month: 1,  day: 13, type: "festival",  demandTags: ["peanuts", "popcorn", "gajak", "rewri", "sweets"], multiplier: 1.5 },
  { name: "Makar Sankranti / Pongal", month: 1, day: 14, type: "festival", demandTags: ["til", "gajak", "sweets", "kites"], multiplier: 1.5 },
  { name: "Maha Shivaratri",      month: 2,  day: 26, type: "festival",  demandTags: ["milk", "fruits", "sweets", "pooja items"], multiplier: 1.3 },
];

// ── Seasonal Demand Patterns ──────────────────────────────────────────────────

const SEASONAL_EVENTS = [
  { name: "Summer Season",        months: [4, 5, 6],     type: "seasonal", demandTags: ["cold drinks", "ice cream", "water", "juices", "sunscreen", "coolers"], multiplier: 1.5 },
  { name: "Monsoon Season",       months: [7, 8, 9],     type: "seasonal", demandTags: ["tea", "coffee", "snacks", "pakora", "umbrellas", "raincoats"], multiplier: 1.4 },
  { name: "Winter Season",        months: [12, 1, 2],    type: "seasonal", demandTags: ["tea", "coffee", "soups", "warm foods", "heaters", "blankets"], multiplier: 1.3 },
  { name: "Wedding Season",       months: [11, 12, 1, 2, 4, 5], type: "cultural", demandTags: ["sweets", "dry fruits", "gifts", "decorations", "clothing", "catering"], multiplier: 1.8 },
  { name: "Exam Season",          months: [3, 4, 5],     type: "cultural", demandTags: ["stationery", "snacks", "energy drinks", "notebooks"], multiplier: 1.3 },
  { name: "Back to School",       months: [6, 7],        type: "cultural", demandTags: ["stationery", "bags", "uniforms", "books", "lunch boxes"], multiplier: 1.4 },
  { name: "Festive Quarter (Q4)", months: [10, 11],      type: "seasonal", demandTags: ["sweets", "dry fruits", "gifts", "decorations", "clothing"], multiplier: 1.6 },
];

// ── Weekend / Recurring Patterns ──────────────────────────────────────────────

const WEEKEND_BOOST = {
  demandTags: ["snacks", "cold drinks", "ice cream", "fast food", "party items"],
  multiplier: 1.2,
};

/**
 * Get upcoming events within a lookahead window from the given date.
 *
 * @param {string} location — city name (used for logging; all festivals are pan-India for now)
 * @param {Object} options
 * @param {Date}   options.fromDate — start date (default: now)
 * @param {number} options.lookaheadDays — how far ahead to look (default: 14)
 * @returns {{ festivals: Array, seasonal: Array, isWeekend: boolean, weekendBoost: Object|null }}
 */
function fetchEvents(location, { fromDate, lookaheadDays = 14 } = {}) {
  const now = fromDate || new Date();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();
  const currentYear = now.getFullYear();

  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + lookaheadDays);
  const endMonth = endDate.getMonth() + 1;
  const endDay = endDate.getDate();

  // Find festivals in the lookahead window
  const upcomingFestivals = FESTIVAL_CALENDAR
    .map((f) => {
      const festDate = new Date(currentYear, f.month - 1, f.day);

      // If the festival date has passed this year, check next year
      if (festDate < now) {
        festDate.setFullYear(currentYear + 1);
      }

      const daysUntil = Math.ceil((festDate - now) / (1000 * 60 * 60 * 24));

      if (daysUntil >= 0 && daysUntil <= lookaheadDays) {
        return {
          ...f,
          date: festDate.toISOString().split("T")[0],
          daysUntil,
          relevance: daysUntil <= 3 ? "imminent" : daysUntil <= 7 ? "upcoming" : "approaching",
        };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  // Active seasonal patterns
  const activeSeasonal = SEASONAL_EVENTS.filter((s) =>
    s.months.includes(currentMonth)
  ).map((s) => ({
    ...s,
    active: true,
    relevance: "active",
  }));

  // Weekend detection
  const dayOfWeek = now.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isFriday = dayOfWeek === 5;

  return {
    festivals: upcomingFestivals,
    seasonal: activeSeasonal,
    isWeekend: isWeekend || isFriday,
    weekendBoost: (isWeekend || isFriday) ? WEEKEND_BOOST : null,
    location: location || "India",
    lookaheadDays,
    fetchedAt: now.toISOString(),
    source: "builtin_calendar",
  };
}

/**
 * Check if a product name matches any demand tags from an event.
 */
function matchesProductTags(productName, demandTags) {
  const name = (productName || "").toLowerCase();
  return demandTags.some((tag) => {
    const t = tag.toLowerCase();
    return name.includes(t) || t.includes(name);
  });
}

module.exports = { fetchEvents, matchesProductTags, FESTIVAL_CALENDAR, SEASONAL_EVENTS };
