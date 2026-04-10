"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/lib/auth-context";
import { sendOtp, verifyOtp, getUserData } from "@/lib/api";
import {
  Phone,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Zap,
  Shield,
  Globe,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, user, loading: authLoading } = useAuth();

  const [step, setStep] = useState("phone"); // phone | otp | success
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpHint, setOtpHint] = useState("");

  const otpRefs = useRef([]);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated && user) {
      if (user.onboardingCompleted) {
        router.replace("/dashboard");
      } else {
        router.replace("/onboarding");
      }
    }
  }, [authLoading, isAuthenticated, user, router]);

  // ── Send OTP ───────────────────────────────────────────────────────────────
  async function handleSendOtp(e) {
    e.preventDefault();
    setError("");

    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    setLoading(true);
    try {
      const res = await sendOtp(cleaned);
      if (res.success) {
        setStep("otp");
        setOtpHint(res.hint || "");
        // Focus first OTP input
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
    } catch (err) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  // ── OTP Input handling ─────────────────────────────────────────────────────
  function handleOtpChange(index, value) {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");

    // Auto-focus next
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (value && index === 5 && newOtp.every((d) => d)) {
      handleVerifyOtp(newOtp.join(""));
    }
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e) {
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (paste.length === 6) {
      const newOtp = paste.split("");
      setOtp(newOtp);
      otpRefs.current[5]?.focus();
      handleVerifyOtp(paste);
    }
  }

  // ── Verify OTP ─────────────────────────────────────────────────────────────
  async function handleVerifyOtp(otpString) {
    const code = otpString || otp.join("");
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit OTP");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const cleaned = phone.replace(/\D/g, "");
      const res = await verifyOtp(cleaned, code);

      if (res.success) {
        setStep("success");

        // Always hydrate auth context after OTP — if getUserData fails or returns
        // success: false without throwing, we still need login() so onboarding save runs.
        let userToLogin = null;
        try {
          const userData = await getUserData();
          if (userData.success && userData.user) {
            userToLogin = userData.user;
          }
        } catch {
          /* fall back to verify payload */
        }
        if (!userToLogin) {
          userToLogin = {
            id: res.userId,
            onboardingCompleted: !!res.onboardingCompleted,
            phoneNumber: cleaned,
          };
        }
        login(userToLogin);

        // Redirect after brief success animation
        setTimeout(() => {
          if (res.onboardingCompleted) {
            router.push("/dashboard");
          } else {
            router.push("/onboarding");
          }
        }, 1500);
      }
    } catch (err) {
      setError(err.message || "Invalid OTP");
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  // Don't show login page if already authenticated
  if (authLoading || (isAuthenticated && user)) {
    return (
      <div className="flex min-h-screen items-center justify-center page-gradient">
        <Loader2 className="size-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen page-gradient">
      {/* Header */}
      <header className="border-b border-white/30 glass-strong">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandLogo size="sm" />
            <span className="font-heading font-bold">BharatPulse</span>
          </Link>
        </div>
      </header>

      {/* Split layout */}
      <div className="mx-auto grid min-h-[calc(100vh-56px)] max-w-7xl lg:grid-cols-[1fr_1.15fr]">
        {/* LEFT — Decorative panel */}
        <div className="relative hidden overflow-hidden lg:block">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-rose-500" />

          <motion.div
            className="absolute -left-20 top-20 h-[300px] w-[300px] rounded-full opacity-25"
            style={{ background: "radial-gradient(circle, oklch(0.90 0.10 50) 0%, transparent 70%)" }}
            animate={{ scale: [1, 1.15, 1], x: [0, 20, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-16 -right-16 h-[250px] w-[250px] rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, oklch(0.88 0.12 350) 0%, transparent 70%)" }}
            animate={{ scale: [1.1, 1, 1.1], y: [0, -15, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="relative flex h-full flex-col justify-center px-10 py-16 xl:px-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm">
                <ShieldCheck className="size-3.5" />
                Secure Login
              </span>

              <h1 className="mt-6 font-heading text-4xl font-extrabold leading-tight tracking-tight text-white xl:text-5xl">
                Welcome to{" "}
                <span className="bg-gradient-to-r from-amber-200 to-orange-200 bg-clip-text text-transparent">
                  BharatPulse AI
                </span>
              </h1>

              <p className="mt-4 max-w-md text-lg leading-relaxed text-white/70">
                Login with your phone number to access your AI-powered business dashboard.
              </p>

              <div className="mt-10 space-y-4">
                {[
                  { icon: Zap, text: "Login in under 30 seconds" },
                  { icon: Shield, text: "Your data stays private & secure" },
                  { icon: Globe, text: "Works for any Indian business type" },
                ].map((f) => (
                  <motion.div
                    key={f.text}
                    className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6, duration: 0.4 }}
                  >
                    <f.icon className="size-5 text-amber-300" strokeWidth={1.75} />
                    <span className="text-sm font-medium text-white/90">{f.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* RIGHT — Login form */}
        <div className="flex items-center justify-center px-4 py-10 sm:px-8 lg:py-16">
          <div className="w-full max-w-md">
            {/* Mobile heading */}
            <div className="mb-8 text-center lg:hidden">
              <h1 className="font-heading text-3xl font-extrabold tracking-tight">
                Welcome to BharatPulse AI
              </h1>
              <p className="mt-2 text-muted-foreground">
                Login with your phone number
              </p>
            </div>

            <AnimatePresence mode="wait">
              {/* ── PHONE STEP ─── */}
              {step === "phone" && (
                <motion.div
                  key="phone"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                >
                  <Card className="overflow-hidden rounded-2xl border-white/50 bg-white/70 shadow-xl backdrop-blur-md gradient-border-top">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-xl font-bold">
                        <Phone className="size-5 text-primary" />
                        Enter phone number
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        We&apos;ll send a verification code to your number
                      </p>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSendOtp} className="space-y-5">
                        <div className="space-y-2">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                              +91
                            </span>
                            <Input
                              type="tel"
                              value={phone}
                              onChange={(e) => { setPhone(e.target.value); setError(""); }}
                              placeholder="98765 43210"
                              maxLength={15}
                              className="rounded-xl bg-white/80 pl-12 text-lg font-semibold shadow-sm tracking-wider"
                              autoFocus
                            />
                          </div>
                          {error && (
                            <motion.p
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-center gap-1.5 text-xs font-medium text-red-500"
                            >
                              <AlertCircle className="size-3.5" />
                              {error}
                            </motion.p>
                          )}
                        </div>

                        <Button
                          type="submit"
                          className="btn-glow w-full rounded-full py-3 text-base font-semibold shadow-md"
                          disabled={loading || phone.replace(/\D/g, "").length < 10}
                        >
                          {loading ? (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                          ) : (
                            <ArrowRight className="mr-2 size-4" />
                          )}
                          {loading ? "Sending OTP..." : "Send OTP"}
                        </Button>
                      </form>

                      {/* Demo hint */}
                      <div className="mt-4 flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/10 px-3.5 py-2.5">
                        <Sparkles className="size-4 text-primary shrink-0" />
                        <p className="text-[11px] text-primary font-medium">
                          Demo — enter any 10-digit number
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* ── OTP STEP ─── */}
              {step === "otp" && (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                >
                  <Card className="overflow-hidden rounded-2xl border-white/50 bg-white/70 shadow-xl backdrop-blur-md gradient-border-top">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-xl font-bold">
                        <KeyRound className="size-5 text-primary" />
                        Verify OTP
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Enter the 6-digit code sent to{" "}
                        <span className="font-semibold text-foreground">+91 {phone}</span>
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {/* OTP Input Boxes */}
                      <div className="flex justify-center gap-2.5" onPaste={handleOtpPaste}>
                        {otp.map((digit, i) => (
                          <input
                            key={i}
                            ref={(el) => (otpRefs.current[i] = el)}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(i, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                            className="h-14 w-12 rounded-xl border-2 border-border/50 bg-white/80 text-center text-xl font-bold shadow-sm
                                       transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
                                       hover:border-primary/30"
                          />
                        ))}
                      </div>

                      {error && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center justify-center gap-1.5 text-xs font-medium text-red-500"
                        >
                          <AlertCircle className="size-3.5" />
                          {error}
                        </motion.p>
                      )}

                      <Button
                        type="button"
                        className="btn-glow w-full rounded-full py-3 text-base font-semibold shadow-md"
                        disabled={loading || otp.some((d) => !d)}
                        onClick={() => handleVerifyOtp()}
                      >
                        {loading ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="mr-2 size-4" />
                        )}
                        {loading ? "Verifying..." : "Verify & Login"}
                      </Button>

                      {/* Demo hint */}
                      {otpHint && (
                        <div className="flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/10 px-3.5 py-2.5">
                          <Sparkles className="size-4 text-primary shrink-0" />
                          <p className="text-[11px] text-primary font-medium">
                            {otpHint}
                          </p>
                        </div>
                      )}

                      {/* Back / Resend */}
                      <div className="flex items-center justify-between text-xs">
                        <button
                          onClick={() => { setStep("phone"); setOtp(["", "", "", "", "", ""]); setError(""); }}
                          className="font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          ← Change number
                        </button>
                        <button
                          onClick={() => handleSendOtp({ preventDefault: () => {} })}
                          className="font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
                        >
                          Resend OTP
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* ── SUCCESS STEP ─── */}
              {step === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center text-center py-16"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-xl"
                  >
                    <CheckCircle2 className="size-12 text-white" />
                  </motion.div>
                  <h2 className="mt-6 font-heading text-2xl font-extrabold">
                    Verified! 🎉
                  </h2>
                  <p className="mt-2 text-muted-foreground">
                    Redirecting to your dashboard...
                  </p>
                  <Loader2 className="mt-4 size-5 text-primary animate-spin" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
