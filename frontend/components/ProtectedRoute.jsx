"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

/**
 * ProtectedRoute — wraps pages that require authentication.
 *
 * - If not authenticated → redirect to /login
 * - If authenticated but onboarding not completed → redirect to /onboarding
 * - Shows loading skeleton while checking
 *
 * Usage:
 *   <ProtectedRoute><YourPageContent /></ProtectedRoute>
 */
export function ProtectedRoute({ children, requireOnboarding = true }) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (requireOnboarding && user && user.onboardingCompleted !== true) {
      router.replace("/onboarding");
    }
  }, [loading, isAuthenticated, user, requireOnboarding, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center page-gradient">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-violet-500/15">
            <Loader2 className="size-7 text-primary animate-spin" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground">Loading...</p>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  if (requireOnboarding && user && user.onboardingCompleted !== true) {
    return null; // Will redirect
  }

  return children;
}
