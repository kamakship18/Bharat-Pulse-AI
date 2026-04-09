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
