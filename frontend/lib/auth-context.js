"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getUserData, getToken, clearAuth as clearAuthStorage } from "@/lib/api";

const AuthContext = createContext(null);

/** API may omit or stringify flags — only explicit true counts as done. */
function normalizeUser(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    ...raw,
    onboardingCompleted: raw.onboardingCompleted === true,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const token = getToken();
    if (!token) {
      setLoading(false);
      setIsAuthenticated(false);
      return;
    }

    try {
      const data = await getUserData();
      if (data.success && data.user) {
        setUser(normalizeUser(data.user));
        setIsAuthenticated(true);
      } else {
        clearAuthStorage();
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.warn("[Auth] Token validation failed:", err.message);
      // Don't clear auth on network failure — keep local state
      if (err.message.includes("401") || err.message.includes("Invalid token")) {
        clearAuthStorage();
        setIsAuthenticated(false);
      } else {
        // Network error — keep existing auth state
        setIsAuthenticated(!!token);
      }
    } finally {
      setLoading(false);
    }
  }

  const login = useCallback((userData) => {
    setUser(normalizeUser(userData));
    setIsAuthenticated(true);
  }, []);

  /** Merge fields into session user (e.g. after onboarding save when refresh lags). */
  const patchUser = useCallback((partial) => {
    setUser((prev) => normalizeUser({ ...(prev || {}), ...partial }));
  }, []);

  const logout = useCallback(() => {
    clearAuthStorage();
    setUser(null);
    setIsAuthenticated(false);
    // Redirect to login
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }, []);

  /** Returns true if /me returned a user payload. */
  const refreshUser = useCallback(async () => {
    try {
      const data = await getUserData();
      if (data.success && data.user) {
        setUser(normalizeUser(data.user));
        return true;
      }
    } catch (err) {
      console.warn("[Auth] Refresh failed:", err.message);
    }
    return false;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        login,
        logout,
        refreshUser,
        patchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
