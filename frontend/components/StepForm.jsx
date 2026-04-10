"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { STORAGE_KEY } from "@/lib/mock-data";
import { VoiceOnboarding } from "@/components/VoiceOnboarding";
import { saveOnboarding, getToken } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  Building2,
  MapPin,
  Store,
  GitBranch,
  Sparkles,
  Cloud,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Rocket,
  Tag,
  Upload,
} from "lucide-react";

const BUSINESS_TYPES = [
  "Kirana / General store",
  "Pharmacy",
  "Bakery",
  "Fashion / Boutique",
  "Electronics",
  "Agri / Seeds",
  "Other",
];

const FEATURE_OPTIONS = [
  { id: "expiry", label: "Expiry Alerts", icon: "⏰" },
  { id: "stock", label: "Stock Recommendations", icon: "📦" },
  { id: "demand", label: "Demand Forecasting", icon: "📈" },
  { id: "whatsapp", label: "WhatsApp Alerts", icon: "💬" },
  { id: "ocr", label: "Image → Data Processing", icon: "📸" },
  { id: "multi", label: "Multi-branch optimization", icon: "🔀" },
];

const UPLOAD_TYPES = [
  { id: "sheets", label: "Google Sheets", icon: Cloud, desc: "Connect your sheet" },
  { id: "excel", label: "Excel Upload", icon: Upload, desc: "Upload .xlsx or .csv" },
  { id: "image", label: "Image Upload", icon: Store, desc: "Photo of your ledger" },
];

const initialFeatures = () =>
  FEATURE_OPTIONS.reduce((acc, f) => ({ ...acc, [f.id]: false }), {});

export function StepForm() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [branchCount, setBranchCount] = useState("1");
  const [branches, setBranches] = useState([""]);
  const [features, setFeatures] = useState(initialFeatures);
  const [uploadPref, setUploadPref] = useState("sheets");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Voice mode state
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceActiveField, setVoiceActiveField] = useState(null);

  // Helper to get voice-active class for a field
  const vf = (fieldId) =>
    voiceMode && voiceActiveField === fieldId ? "voice-active-field" : "";

  const progress = (step / 5) * 100;

  const syncBranches = (n) => {
    const num = Math.max(1, Math.min(12, Number.parseInt(n, 10) || 1));
    setBranchCount(String(num));
    setBranches((prev) => {
      const next = [...prev];
      if (num > next.length) {
        while (next.length < num) next.push(`Branch ${next.length + 1}`);
      } else {
        next.length = num;
      }
      return next;
    });
  };

  const updateBranch = (i, v) => {
    setBranches((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  };

  const toggleFeature = (id) => {
    setFeatures((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const canNext = () => {
    if (step === 1)
      return businessName.trim() && location.trim() && businessType;
    if (step === 2) return branches.every((b) => b.trim());
    if (step === 3)
      return Object.values(features).some(Boolean);
    if (step === 4) return Boolean(uploadPref);
    return true;
  };

  const persistAndGo = async () => {
    const payload = {
      businessName,
      location,
      businessType,
      branchCount: Number.parseInt(branchCount, 10) || 1,
      branches,
      features,
      uploadPreference: uploadPref,
    };

    // Always persist to sessionStorage as fallback
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }

    // Save to backend whenever we have a session token (isAuthenticated can lag behind
    // right after login, which previously skipped save and caused a second onboarding).
    const hasSession = Boolean(getToken());
    if (hasSession) {
      setSaving(true);
      setSaveError("");
      try {
        await saveOnboarding(payload);
        await refreshUser();
      } catch (err) {
        console.warn("[Onboarding] Backend save failed:", err.message);
        setSaveError("Could not save to server. Please try again.");
        setSaving(false);
        return;
      } finally {
        setSaving(false);
      }
    }

    router.push("/dashboard");
  };

  const stepLabels = ["Business", "Branches", "Features", "Data", "Review"];

  return (
    <div className="w-full">
      {/* Voice Onboarding Layer */}
      <VoiceOnboarding
        businessName={businessName}
        location={location}
        businessType={businessType}
        branchCount={branchCount}
        branches={branches}
        features={features}
        uploadPref={uploadPref}
        setBusinessName={setBusinessName}
        setLocation={setLocation}
        setBusinessType={setBusinessType}
        setBranchCount={setBranchCount}
        setBranches={setBranches}
        setFeatures={setFeatures}
        setUploadPref={setUploadPref}
        setStep={setStep}
        syncBranches={syncBranches}
        voiceMode={voiceMode}
        setVoiceMode={setVoiceMode}
        setVoiceActiveField={setVoiceActiveField}
      />

      {/* Progress Section */}
      <div className="mb-8">
        {/* Step dots */}
        <div className="mb-4 flex items-center justify-between">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                  i + 1 < step
                    ? "bg-primary text-white shadow-md"
                    : i + 1 === step
                    ? "bg-gradient-to-br from-primary to-violet-600 text-white shadow-lg scale-110"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1 < step ? <CheckCircle2 className="size-4" /> : i + 1}
              </div>
              <span className={`text-[10px] font-medium ${
                i + 1 === step ? "text-primary" : "text-muted-foreground"
              }`}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Gradient progress bar */}
        <div className="h-3 w-full overflow-hidden rounded-full bg-muted/60 shadow-inner">
          <motion.div
            className="shimmer-bar h-full rounded-full"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 22 }}
          />
        </div>
      </div>

      {/* Form Steps */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -24, scale: 0.98 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          {step === 1 && (
            <Card className="overflow-hidden rounded-2xl border-white/50 bg-white/70 shadow-xl backdrop-blur-md gradient-border-top">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <Building2 className="size-5 text-primary" />
                  Business info
                </CardTitle>
                <p className="text-sm text-muted-foreground">Tell us about your business</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="bn" className="font-semibold">Business name</Label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="bn"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Sharma General Store"
                      readOnly={voiceMode && voiceActiveField === "businessName"}
                      className={`rounded-xl bg-white/80 pl-10 shadow-sm transition-shadow focus:shadow-md focus:ring-2 focus:ring-primary/20 ${vf("businessName")}`}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loc" className="font-semibold">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="loc"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="City, State"
                      readOnly={voiceMode && voiceActiveField === "location"}
                      className={`rounded-xl bg-white/80 pl-10 shadow-sm transition-shadow focus:shadow-md focus:ring-2 focus:ring-primary/20 ${vf("location")}`}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Business type</Label>
                  <Select value={businessType} onValueChange={setBusinessType}>
                    <SelectTrigger className={`w-full rounded-xl bg-white/80 shadow-sm ${vf("businessType")}`}>
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card className="overflow-hidden rounded-2xl border-white/50 bg-white/70 shadow-xl backdrop-blur-md gradient-border-top">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <GitBranch className="size-5 text-primary" />
                  Branch setup
                </CardTitle>
                <p className="text-sm text-muted-foreground">How many outlets do you operate?</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="bc" className="font-semibold">Number of branches</Label>
                  <Input
                    id="bc"
                    type="number"
                    min={1}
                    max={12}
                    value={branchCount}
                    onChange={(e) => syncBranches(e.target.value)}
                    readOnly={voiceMode && voiceActiveField === "branchCount"}
                    className={`rounded-xl bg-white/80 shadow-sm transition-shadow focus:shadow-md focus:ring-2 focus:ring-primary/20 ${vf("branchCount")}`}
                  />
                </div>
                <Separator />
                <div className="space-y-3">
                  {branches.map((b, i) => (
                    <div key={i} className="relative">
                      <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={b}
                        onChange={(e) => updateBranch(i, e.target.value)}
                        placeholder={`Branch ${i + 1} name`}
                        readOnly={voiceMode && voiceActiveField === "branches"}
                        className={`rounded-xl bg-white/80 pl-10 shadow-sm transition-shadow focus:shadow-md focus:ring-2 focus:ring-primary/20 ${voiceMode && voiceActiveField === "branches" ? "voice-active-field" : ""}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card className="overflow-hidden rounded-2xl border-white/50 bg-white/70 shadow-xl backdrop-blur-md gradient-border-top">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <Sparkles className="size-5 text-primary" />
                  Features
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Choose what BharatPulse should optimize for you.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3">
                {FEATURE_OPTIONS.map((f) => (
                  <label
                    key={f.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition-all duration-200 ${
                      features[f.id]
                        ? "border-primary/30 bg-primary/5 shadow-md ring-1 ring-primary/20"
                        : "border-border/50 bg-white/50 hover:bg-white/70 hover:shadow-sm"
                    }`}
                  >
                    <Checkbox
                      checked={features[f.id]}
                      onCheckedChange={() => toggleFeature(f.id)}
                    />
                    <span className="text-lg">{f.icon}</span>
                    <span className="text-sm font-semibold">{f.label}</span>
                  </label>
                ))}
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card className="overflow-hidden rounded-2xl border-white/50 bg-white/70 shadow-xl backdrop-blur-md gradient-border-top">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <Cloud className="size-5 text-primary" />
                  Data preferences
                </CardTitle>
                <p className="text-sm text-muted-foreground">How do you want to connect your data?</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {UPLOAD_TYPES.map((u) => (
                  <label
                    key={u.id}
                    className={`flex cursor-pointer items-center gap-4 rounded-xl border px-4 py-4 transition-all duration-200 ${
                      uploadPref === u.id
                        ? "border-primary/30 bg-primary/5 shadow-md ring-1 ring-primary/20"
                        : "border-border/50 bg-white/50 hover:bg-white/70 hover:shadow-sm"
                    }`}
                  >
                    <input
                      type="radio"
                      name="upload"
                      className="size-4 accent-primary"
                      checked={uploadPref === u.id}
                      onChange={() => setUploadPref(u.id)}
                    />
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <u.icon className="size-5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold">{u.label}</span>
                      <p className="text-xs text-muted-foreground">{u.desc}</p>
                    </div>
                  </label>
                ))}
              </CardContent>
            </Card>
          )}

          {step === 5 && (
            <Card className="overflow-hidden rounded-2xl border-white/50 bg-white/70 shadow-xl backdrop-blur-md gradient-border-top">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-600 text-2xl font-black text-white shadow-lg">
                    {businessName?.slice(0, 1)?.toUpperCase() || "B"}
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold">{businessName || "Your Business"}</CardTitle>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="size-3.5" />
                      {location || "India"}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Business Type Badge */}
                <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary/10 to-violet-500/10 px-4 py-3">
                  <Tag className="size-4 text-primary" />
                  <span className="text-sm font-bold text-primary">{businessType || "MSME"}</span>
                </div>

                <Separator />

                {/* Branches */}
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <GitBranch className="size-3.5" />
                    Branches ({branches.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {branches.map((b) => (
                      <span key={b} className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-white/80 px-3 py-1.5 text-xs font-medium shadow-sm">
                        <MapPin className="size-3 text-muted-foreground" />
                        {b}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Features */}
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <Sparkles className="size-3.5" />
                    Features enabled
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {FEATURE_OPTIONS.filter((f) => features[f.id]).map((f) => (
                      <span key={f.id} className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary/10 to-violet-500/10 px-3 py-1.5 text-xs font-semibold text-primary">
                        {f.icon} {f.label}
                      </span>
                    ))}
                    {!Object.values(features).some(Boolean) && (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </div>

                {/* Upload */}
                <div className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-3">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Data source</span>
                  <span className="text-sm font-semibold">
                    {UPLOAD_TYPES.find((u) => u.id === uploadPref)?.label}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="mt-8 flex justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          className="rounded-full bg-white/70 px-6 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:shadow-md"
          disabled={step === 1}
          onClick={() => setStep((s) => Math.max(1, s - 1))}
        >
          <ArrowLeft className="mr-2 size-4" />
          Back
        </Button>
        {step < 5 ? (
          <Button
            type="button"
            className="btn-glow rounded-full px-8 font-semibold shadow-md"
            disabled={!canNext()}
            onClick={() => setStep((s) => s + 1)}
          >
            Continue
            <ArrowRight className="ml-2 size-4" />
          </Button>
        ) : (
          <Button
            type="button"
            className="btn-glow rounded-full px-8 font-semibold shadow-md"
            disabled={saving}
            onClick={persistAndGo}
          >
            {saving ? (
              <>
                <span className="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Saving...
              </>
            ) : (
              <>
                <Rocket className="mr-2 size-4" />
                Launch Dashboard
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
