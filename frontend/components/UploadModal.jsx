"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileSpreadsheet,
  ImageIcon,
  Upload,
  CheckCircle2,
  Link2,
  Camera,
  Loader2,
  Sparkles,
  MapPin,
  ArrowRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

/* ─── OCR Mock Data ─── */
const OCR_MOCK_RESULTS = [
  { product: "Amul Taza Milk 500ml", quantity: 24, expiry: "2 days", price: 25 },
  { product: "Britannia Bread", quantity: 15, expiry: "1 day", price: 40 },
  { product: "Haldiram Namkeen 400g", quantity: 8, expiry: "5 days", price: 120 },
  { product: "Mother Dairy Curd 400g", quantity: 6, expiry: "3 days", price: 35 },
  { product: "Maggi Noodles Pack", quantity: 30, expiry: "8 months", price: 144 },
  { product: "Coca-Cola 2L", quantity: 12, expiry: "4 months", price: 90 },
];

const UPLOAD_STORAGE_KEY = "bharat-pulse-uploads";

function getStoredUploads() {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(UPLOAD_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveUpload(upload) {
  const existing = getStoredUploads();
  existing.push(upload);
  sessionStorage.setItem(UPLOAD_STORAGE_KEY, JSON.stringify(existing));
  return existing;
}

export function UploadModal({ open, onOpenChange, onComplete, branches = [] }) {
  const [mode, setMode] = useState("choose"); // choose | sheet | image | camera | branch | processing | success
  const [sheetLink, setSheetLink] = useState("");
  const [sheetError, setSheetError] = useState("");
  const [uploadedImages, setUploadedImages] = useState([]);
  const [extractedData, setExtractedData] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [uploadType, setUploadType] = useState(""); // sheet | image | camera
  const [processProgress, setProcessProgress] = useState(0);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const availableBranches = branches.length > 0 ? branches : ["Rajpura", "Chandigarh", "Pinjore"];

  // Clean up camera on close
  useEffect(() => {
    if (!open) {
      stopCamera();
      resetState();
    }
  }, [open]);

  function resetState() {
    setMode("choose");
    setSheetLink("");
    setSheetError("");
    setUploadedImages([]);
    setExtractedData([]);
    setSelectedBranch("");
    setUploadType("");
    setProcessProgress(0);
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  /* ─── Google Sheets validation ─── */
  function validateSheetLink(link) {
    const trimmed = link.trim();
    if (!trimmed) return "Please paste a Google Sheet link";
    if (!trimmed.includes("docs.google.com") && !trimmed.includes("sheets.google.com")) {
      return "Invalid link. Must be a Google Sheets URL (docs.google.com)";
    }
    return "";
  }

  function handleSheetSubmit() {
    const err = validateSheetLink(sheetLink);
    if (err) {
      setSheetError(err);
      return;
    }
    setSheetError("");
    console.log("📊 Google Sheet added:", sheetLink);
    setUploadType("sheet");
    // Move to branch selection
    setMode("branch");
  }

  /* ─── Image upload ─── */
  function handleImageSelect(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const previews = files.map((f) => ({
      name: f.name,
      url: URL.createObjectURL(f),
      size: f.size,
    }));
    setUploadedImages(previews);
    setUploadType("image");
    console.log(`📸 ${files.length} image(s) selected:`, files.map((f) => f.name));
    // Go to branch selection
    setMode("branch");
  }

  /* ─── Camera capture ─── */
  async function startCamera() {
    setMode("camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setSheetError("Could not access camera. Please allow camera permissions.");
      setMode("choose");
    }
  }

  function captureImage() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

    setUploadedImages([{ name: "camera_capture.jpg", url: dataUrl, size: 0 }]);
    setUploadType("camera");
    stopCamera();
    console.log("📸 Image captured from camera");
    setMode("branch");
  }

  /* ─── Branch selected → simulate processing ─── */
  function handleBranchSelect(branchName) {
    setSelectedBranch(branchName);
    setMode("processing");

    // Simulate OCR / Sheet processing
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 25 + 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setProcessProgress(100);

        // Generate mock extracted data
        const shuffled = [...OCR_MOCK_RESULTS].sort(() => Math.random() - 0.5);
        const cnt = 2 + Math.floor(Math.random() * 3);
        const extracted = shuffled.slice(0, cnt).map((d) => ({ ...d, branch: branchName }));
        setExtractedData(extracted);

        console.log(`🎙️ [Upload] Type: ${uploadType}, Branch: ${branchName}`);
        console.log("📦 Extracted data:", extracted);

        // Save to session storage
        const upload = {
          id: `upload-${Date.now()}`,
          type: uploadType,
          branch: branchName,
          source: uploadType === "sheet" ? sheetLink : uploadedImages.map((i) => i.name).join(", "),
          extractedData: extracted,
          timestamp: new Date().toISOString(),
        };
        const allUploads = saveUpload(upload);
        console.log("💾 All uploads:", allUploads);

        setTimeout(() => setMode("success"), 500);
      }
      setProcessProgress(Math.min(100, progress));
    }, 300);
  }

  /* ─── Success → complete ─── */
  function handleDone() {
    const uploadPayload = {
      type: uploadType,
      branch: selectedBranch,
      source: uploadType === "sheet" ? sheetLink : uploadedImages.map((i) => i.name).join(", "),
      extractedData,
    };
    onComplete?.(uploadPayload);
    resetState();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-w-2xl gap-0 overflow-hidden rounded-2xl border-white/50 bg-white/90 p-0 shadow-2xl backdrop-blur-xl ring-1 ring-border/20 sm:max-w-2xl"
      >
        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImageSelect}
        />
        <canvas ref={canvasRef} className="hidden" />

        <DialogHeader className="border-b border-border/40 bg-gradient-to-r from-primary/5 via-white/80 to-violet-500/5 px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Upload className="size-5 text-primary" />
            {mode === "choose" ? "Upload Data" :
             mode === "sheet" ? "Google Sheets" :
             mode === "image" ? "Upload Images" :
             mode === "camera" ? "Capture Image" :
             mode === "branch" ? "Select Branch" :
             mode === "processing" ? "Processing..." :
             "Success!"}
          </DialogTitle>
          <DialogDescription>
            {mode === "choose" ? "Choose how you'd like to add your business data" :
             mode === "sheet" ? "Paste your Google Sheet link below" :
             mode === "camera" ? "Point your camera at the ledger or invoice" :
             mode === "branch" ? "Which branch does this data belong to?" :
             mode === "processing" ? "Analyzing your data with AI..." :
             mode === "success" ? "Data extracted successfully" :
             "Select images from your device"}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* ─── CHOOSE MODE ─── */}
            {mode === "choose" && (
              <motion.div
                key="choose"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid gap-4 sm:grid-cols-2"
              >
                {/* Google Sheets */}
                <button
                  onClick={() => setMode("sheet")}
                  className="group relative flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary/20 bg-white/60 p-8 transition-all duration-300 hover:bg-primary/3 hover:border-primary/40 hover:shadow-lg cursor-pointer"
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-indigo-500/15 text-primary shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <Link2 className="size-8" strokeWidth={1.5} />
                  </span>
                  <div className="text-center">
                    <p className="text-base font-bold">Google Sheets</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Paste your sheet link
                    </p>
                  </div>
                </button>

                {/* Image Upload */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-violet-400/20 bg-white/60 p-8 transition-all duration-300 hover:bg-violet-500/3 hover:border-violet-500/40 hover:shadow-lg cursor-pointer"
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/15 to-purple-500/15 text-violet-700 shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <ImageIcon className="size-8" strokeWidth={1.5} />
                  </span>
                  <div className="text-center">
                    <p className="text-base font-bold">Upload Images</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Bahi-khata, invoices, bills
                    </p>
                  </div>
                </button>

                {/* Camera Capture */}
                <button
                  onClick={startCamera}
                  className="group relative flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-emerald-400/20 bg-white/60 p-8 transition-all duration-300 hover:bg-emerald-500/3 hover:border-emerald-500/40 hover:shadow-lg cursor-pointer sm:col-span-2"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/15 text-emerald-700 shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <Camera className="size-7" strokeWidth={1.5} />
                  </span>
                  <div className="text-center">
                    <p className="text-base font-bold">Use Camera</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Capture live image of your ledger
                    </p>
                  </div>
                </button>
              </motion.div>
            )}

            {/* ─── GOOGLE SHEETS INPUT ─── */}
            {mode === "sheet" && (
              <motion.div
                key="sheet"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/10 px-4 py-3">
                  <FileSpreadsheet className="size-5 text-primary shrink-0" />
                  <p className="text-xs text-primary font-medium">
                    Make sure the sheet has <strong>public view access</strong> enabled
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold">Paste your Google Sheet link</label>
                  <Input
                    value={sheetLink}
                    onChange={(e) => { setSheetLink(e.target.value); setSheetError(""); }}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="rounded-xl bg-white/80 shadow-sm"
                  />
                  {sheetError && (
                    <p className="text-xs text-red-500 font-medium">{sheetError}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button variant="outline" className="rounded-full" onClick={() => setMode("choose")}>
                    Back
                  </Button>
                  <Button
                    className="rounded-full btn-glow flex-1"
                    onClick={handleSheetSubmit}
                    disabled={!sheetLink.trim()}
                  >
                    <ArrowRight className="mr-2 size-4" />
                    Continue
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ─── CAMERA MODE ─── */}
            {mode === "camera" && (
              <motion.div
                key="camera"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4"
              >
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Viewfinder overlay */}
                  <div className="absolute inset-4 border-2 border-white/30 rounded-xl pointer-events-none" />
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-xs font-medium bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                    Position the ledger in the frame
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" className="rounded-full" onClick={() => { stopCamera(); setMode("choose"); }}>
                    Cancel
                  </Button>
                  <Button className="rounded-full btn-glow flex-1" onClick={captureImage}>
                    <Camera className="mr-2 size-4" />
                    Capture
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ─── BRANCH SELECTION ─── */}
            {mode === "branch" && (
              <motion.div
                key="branch"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 rounded-xl bg-violet-500/5 border border-violet-500/10 px-4 py-3">
                  <MapPin className="size-5 text-violet-600 shrink-0" />
                  <p className="text-xs text-violet-700 font-medium">
                    Which branch does this data belong to?
                  </p>
                </div>

                {/* Show uploaded source */}
                {uploadType === "sheet" && sheetLink && (
                  <div className="rounded-lg bg-primary/5 px-3 py-2 text-xs text-primary font-medium truncate">
                    📊 {sheetLink}
                  </div>
                )}
                {(uploadType === "image" || uploadType === "camera") && uploadedImages.length > 0 && (
                  <div className="rounded-lg bg-violet-500/5 px-3 py-2 text-xs text-violet-700 font-medium">
                    📸 {uploadedImages.length} image{uploadedImages.length > 1 ? "s" : ""} ready
                  </div>
                )}

                <div className="grid gap-2">
                  {availableBranches.map((b) => (
                    <button
                      key={b}
                      onClick={() => handleBranchSelect(b)}
                      className="flex items-center gap-3 rounded-xl border border-border/40 bg-white/70 px-4 py-3.5
                                 hover:bg-primary/5 hover:border-primary/30 hover:shadow-md transition-all duration-200
                                 cursor-pointer group"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-violet-500/10 text-primary group-hover:scale-110 transition-transform">
                        <MapPin className="size-4" />
                      </span>
                      <span className="text-sm font-bold group-hover:text-primary transition-colors">{b}</span>
                    </button>
                  ))}
                </div>

                <Button variant="outline" className="rounded-full" onClick={() => setMode("choose")}>
                  Back
                </Button>
              </motion.div>
            )}

            {/* ─── PROCESSING ─── */}
            {mode === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-8 space-y-6"
              >
                <div className="relative">
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/15 to-violet-500/15 flex items-center justify-center">
                    <Loader2 className="size-8 text-primary animate-spin" />
                  </div>
                  <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                    <Sparkles className="size-3 text-white" />
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <p className="text-sm font-bold">
                    {processProgress < 40 ? "Scanning data..." :
                     processProgress < 70 ? "Extracting fields..." :
                     processProgress < 100 ? "Analyzing with AI..." :
                     "Complete!"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Processing for <strong>{selectedBranch}</strong>
                  </p>
                </div>

                {/* Progress bar */}
                <div className="w-full max-w-xs">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-violet-600"
                      initial={{ width: "0%" }}
                      animate={{ width: `${processProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center mt-1">
                    {Math.round(processProgress)}%
                  </p>
                </div>
              </motion.div>
            )}

            {/* ─── SUCCESS ─── */}
            {mode === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                {/* Success header */}
                <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200/60 px-4 py-3">
                  <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-emerald-700">Data extracted successfully!</p>
                    <p className="text-xs text-emerald-600">
                      {extractedData.length} items found for <strong>{selectedBranch}</strong>
                    </p>
                  </div>
                </div>

                {/* Extracted data preview */}
                <div className="rounded-xl border border-border/40 overflow-hidden">
                  <div className="bg-muted/30 px-4 py-2 border-b border-border/20">
                    <p className="text-xs font-bold text-muted-foreground">Extracted Data Preview</p>
                  </div>
                  <div className="divide-y divide-border/20">
                    {extractedData.map((item, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5">
                        <div>
                          <p className="text-xs font-semibold">{item.product}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Expires in {item.expiry} · ₹{item.price}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-primary">{item.quantity} units</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => { resetState(); }}
                  >
                    Upload More
                  </Button>
                  <Button className="rounded-full btn-glow flex-1" onClick={handleDone}>
                    <CheckCircle2 className="mr-2 size-4" />
                    Done
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { UPLOAD_STORAGE_KEY, getStoredUploads };
