/**
 * BharatPulse AI — API Client
 *
 * Centralized API layer for all frontend ↔ backend communication.
 * Handles auth tokens, error formatting, and endpoint helpers.
 */

const API_BASE = "/api";

// ── Token helpers ─────────────────────────────────────────────────────────────

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bp-token");
}

export function setToken(token) {
  if (typeof window === "undefined") return;
  localStorage.setItem("bp-token", token);
}

export function getUserId() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bp-userId");
}

export function setUserId(id) {
  if (typeof window === "undefined") return;
  localStorage.setItem("bp-userId", id);
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("bp-token");
  localStorage.removeItem("bp-userId");
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

export async function apiFetch(endpoint, options = {}) {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      const snippet = text.replace(/\s+/g, " ").trim().slice(0, 120);
      const looksLikeProxyFailure =
        res.status >= 500 &&
        (/internal server error/i.test(text) || !text || snippet.length < 3);
      throw new Error(
        looksLikeProxyFailure
          ? "API unreachable (is the backend running on the port in frontend/next.config.mjs, usually 5001?). From the repo root run: cd backend && npm run dev"
          : snippet || `Invalid response (HTTP ${res.status})`
      );
    }

    if (!res.ok) {
      if (res.status === 401) {
        clearAuth();
      }
      throw new Error(data.error || `Request failed (${res.status})`);
    }

    return data;
  } catch (err) {
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      throw new Error("Cannot connect to server. Please check your connection.");
    }
    throw err;
  }
}

// ── Auth APIs ─────────────────────────────────────────────────────────────────

export async function sendOtp(phoneNumber) {
  return apiFetch("/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ phoneNumber }),
  });
}

export async function verifyOtp(phoneNumber, otp) {
  const data = await apiFetch("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ phoneNumber, otp }),
  });

  if (data.success && data.token) {
    setToken(data.token);
    setUserId(data.userId);
  }

  return data;
}

// ── User APIs ─────────────────────────────────────────────────────────────────

export async function getUserData() {
  return apiFetch("/user/me");
}

export async function saveOnboarding(payload) {
  return apiFetch("/user/save-onboarding", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function addUpload(uploadData) {
  return apiFetch("/user/add-upload", {
    method: "POST",
    body: JSON.stringify(uploadData),
  });
}

export async function getUploads() {
  return apiFetch("/user/uploads");
}

// ── Sheet Management APIs ─────────────────────────────────────────────────────

export async function linkSheet(sheetUrl, branch) {
  return apiFetch("/user/link-sheet", {
    method: "POST",
    body: JSON.stringify({ sheetUrl, branch }),
  });
}

export async function getSheetSources() {
  return apiFetch("/user/sheet-sources");
}

export async function unlinkSheet(index) {
  return apiFetch(`/user/sheet-sources/${index}`, {
    method: "DELETE",
  });
}

export async function syncAllSheets() {
  return apiFetch("/user/sync-all", {
    method: "POST",
  });
}

// ── Inventory APIs (Real Data) ────────────────────────────────────────────────

export async function getInventory(params = {}) {
  const q = new URLSearchParams();
  if (params.branch) q.set("branch", params.branch);
  if (params.category) q.set("category", params.category);
  if (params.search) q.set("search", params.search);
  if (params.page) q.set("page", params.page);
  if (params.limit) q.set("limit", params.limit);
  if (params.sortBy) q.set("sortBy", params.sortBy);
  if (params.order) q.set("order", params.order);
  const qs = q.toString();
  return apiFetch(`/inventory${qs ? "?" + qs : ""}`);
}

export async function getInventoryByBranch() {
  return apiFetch("/inventory/by-branch");
}

export async function getInventorySummary() {
  return apiFetch("/inventory/summary");
}

export async function getAlerts(params = {}) {
  const q = new URLSearchParams();
  if (params.type) q.set("type", params.type);
  if (params.resolved) q.set("resolved", params.resolved);
  if (params.page) q.set("page", params.page);
  if (params.limit) q.set("limit", params.limit);
  const qs = q.toString();
  return apiFetch(`/alerts${qs ? "?" + qs : ""}`);
}

export async function resolveAlert(alertId) {
  return apiFetch(`/alerts/${alertId}/resolve`, {
    method: "PATCH",
  });
}

export async function getRecommendations(params = {}) {
  const q = new URLSearchParams();
  if (params.type) q.set("type", params.type);
  if (params.priority) q.set("priority", params.priority);
  if (params.page) q.set("page", params.page);
  if (params.limit) q.set("limit", params.limit);
  const qs = q.toString();
  return apiFetch(`/recommendations${qs ? "?" + qs : ""}`);
}

// ── Notification APIs ─────────────────────────────────────────────────────────

export async function getNotifications(params = {}) {
  const q = new URLSearchParams();
  if (params.unreadOnly) q.set("unreadOnly", params.unreadOnly);
  if (params.page) q.set("page", params.page);
  if (params.limit) q.set("limit", params.limit);
  const qs = q.toString();
  return apiFetch(`/notifications${qs ? "?" + qs : ""}`);
}

export async function markNotificationsRead(ids) {
  return apiFetch("/notifications/mark-read", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export async function sendTestWhatsApp(to) {
  return apiFetch("/notifications/test-whatsapp", {
    method: "POST",
    body: JSON.stringify({ to }),
  });
}

export async function sendWhatsAppReport({ to, items }) {
  return apiFetch("/notifications/send-report", {
    method: "POST",
    body: JSON.stringify({ to, items }),
  });
}

// ── Profile APIs ──────────────────────────────────────────────────────────────

export async function updateProfile(data) {
  return apiFetch("/user/update-profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ── Restock & Transfer APIs ───────────────────────────────────────────────────

export async function sendRestockOrder(data) {
  return apiFetch("/inventory/restock-order", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getTransferSuggestions() {
  return apiFetch("/inventory/transfer-suggestions");
}

export async function initiateTransfer(data) {
  return apiFetch("/inventory/initiate-transfer", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Excel Upload API ─────────────────────────────────────────────────────

export async function uploadExcel(file) {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/upload-excel`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
  return data;
}

// ── Predictive Intelligence APIs ─────────────────────────────────────────────

export async function runPrediction(location, lookaheadDays = 14) {
  return apiFetch("/predictions/run", {
    method: "POST",
    body: JSON.stringify({ location, lookaheadDays }),
  });
}

export async function getPrediction(location) {
  return apiFetch(`/predictions/run?location=${encodeURIComponent(location || "Chandigarh")}`);
}

export async function getWeather(location) {
  return apiFetch(`/predictions/weather?location=${encodeURIComponent(location || "Chandigarh")}`);
}

export async function getEvents(location, lookaheadDays = 14) {
  return apiFetch(`/predictions/events?location=${encodeURIComponent(location || "Chandigarh")}&lookaheadDays=${lookaheadDays}`);
}

export async function simulatePrediction(location, products) {
  return apiFetch("/predictions/simulate", {
    method: "POST",
    body: JSON.stringify({ location, products }),
  });
}
