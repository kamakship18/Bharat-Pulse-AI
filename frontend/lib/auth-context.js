"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getUserData, getToken, clearAuth as clearAuthStorage } from "@/lib/api";

const AuthContext = createContext(null);

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
        setUser(data.user);
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
    setUser(userData);
    setIsAuthenticated(true);
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

  const refreshUser = useCallback(async () => {
    try {
      const data = await getUserData();
      if (data.success && data.user) {
        setUser(data.user);
      }
    } catch (err) {
      console.warn("[Auth] Refresh failed:", err.message);
    }
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
