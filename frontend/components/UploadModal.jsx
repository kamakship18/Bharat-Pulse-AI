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
  AlertTriangle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { linkSheet, uploadExcel } from "@/lib/api";

/* ─── OCR Mock Data (fallback for image/camera only) ─── */
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
  const [mode, setMode] = useState("choose"); // choose | sheet | image | camera | branch | processing | success | error
  const [sheetLink, setSheetLink] = useState("");
  const [sheetError, setSheetError] = useState("");
  const [uploadedImages, setUploadedImages] = useState([]);
  const [extractedData, setExtractedData] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [uploadType, setUploadType] = useState(""); // sheet | image | camera
  const [processProgress, setProcessProgress] = useState(0);
  const [syncResult, setSyncResult] = useState(null);
  const [apiError, setApiError] = useState("");

  const fileInputRef = useRef(null);
  const excelInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [excelFile, setExcelFile] = useState(null);
  const [excelResult, setExcelResult] = useState(null);

  const availableBranches = branches.length > 0 ? branches : ["Delhi", "Jammu", "Chandigarh", "Panchkula", "Mohali"];

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
    setSyncResult(null);
    setApiError("");
    setExcelFile(null);
    setExcelResult(null);
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
    // Skip branch selection — backend auto-detects branches from tab names
    handleSheetSync();
  }

  async function handleSheetSync() {
    setMode("processing");
    setSelectedBranch("Auto");
    setProcessProgress(0);
    setApiError("");

    try {
      setProcessProgress(10);
      const progressInterval = setInterval(() => {
        setProcessProgress((prev) => Math.min(prev + 4, 85));
      }, 500);

      const result = await linkSheet(sheetLink.trim(), "Auto");
      clearInterval(progressInterval);

      if (result.success) {
        setProcessProgress(100);
        setSyncResult(result);

        if (result.isMultiTab && result.branches) {
          setExcelResult({ branches: result.branches, totalItems: result.itemsUpserted });
          setSelectedBranch(Object.keys(result.branches).join(", "));
        } else {
          setSelectedBranch(result.branch || "Auto");
        }

        const items = (result.items || []).map((item) => ({
          product: item.name,
          quantity: item.quantity,
          price: item.price,
          expiry: item.expiryDate
            ? `${Math.max(0, Math.ceil((new Date(item.expiryDate) - new Date()) / (1000*60*60*24)))} days`
            : "N/A",
          category: item.category,
          branch: item.branch,
        }));
        setExtractedData(items);

        const upload = {
          id: `upload-${Date.now()}`,
          type: "sheet",
          branch: result.isMultiTab ? Object.keys(result.branches).join(", ") : (result.branch || "Auto"),
          source: sheetLink,
          extractedData: items,
          timestamp: new Date().toISOString(),
        };
        saveUpload(upload);

        console.log(`✅ Sheet synced: ${result.itemsUpserted} items${result.isMultiTab ? ` across ${Object.keys(result.branches).length} branches` : ""}`);
        setTimeout(() => setMode("success"), 500);
      } else {
        throw new Error(result.error || "Failed to sync sheet");
      }
    } catch (err) {
      console.error("[UploadModal] Sheet sync failed:", err.message);
      setApiError(err.message);
      setMode("error");
    }
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

  /* ─── Excel file selected → skip branch step, upload directly ─── */
  async function handleExcelSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFile(file);
    setUploadType("excel");
    setSelectedBranch("(auto-detected from sheets)");
    setMode("processing");
    setProcessProgress(0);
    setApiError("");

    try {
      setProcessProgress(10);
      const progressInterval = setInterval(() => {
        setProcessProgress((prev) => Math.min(prev + 4, 85));
      }, 400);

      const result = await uploadExcel(file);
      clearInterval(progressInterval);

      if (result.success) {
        setProcessProgress(100);
        setExcelResult(result);
        setSyncResult(result);
        setExtractedData([]);

        const upload = {
          id: `upload-${Date.now()}`,
          type: "excel",
          branch: Object.keys(result.branches || {}).join(", "),
          source: file.name,
          extractedData: [],
          timestamp: new Date().toISOString(),
        };
        saveUpload(upload);

        console.log(`✅ Excel uploaded: ${result.totalItems} items across ${Object.keys(result.branches || {}).length} branches`);
        setTimeout(() => setMode("success"), 500);
      } else {
        throw new Error(result.error || "Upload failed");
      }
    } catch (err) {
      console.error("[UploadModal] Excel upload failed:", err.message);
      setApiError(err.message);
      setMode("error");
    }

    if (excelInputRef.current) excelInputRef.current.value = "";
  }

  /* ─── Branch selected → process data (image/camera only) ─── */
  async function handleBranchSelect(branchName) {
    setSelectedBranch(branchName);
    setMode("processing");
    setProcessProgress(0);
    setApiError("");

    // Mock processing for image/camera (OCR not implemented yet)
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 25 + 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setProcessProgress(100);

        const shuffled = [...OCR_MOCK_RESULTS].sort(() => Math.random() - 0.5);
        const cnt = 2 + Math.floor(Math.random() * 3);
        const extracted = shuffled.slice(0, cnt).map((d) => ({ ...d, branch: branchName }));
        setExtractedData(extracted);

        const upload = {
          id: `upload-${Date.now()}`,
          type: uploadType,
          branch: branchName,
          source: uploadedImages.map((i) => i.name).join(", "),
          extractedData: extracted,
          timestamp: new Date().toISOString(),
        };
        saveUpload(upload);

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
        <input
          ref={excelInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleExcelSelect}
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
             mode === "error" ? "Error" :
             "Success!"}
          </DialogTitle>
          <DialogDescription>
            {mode === "choose" ? "Choose how you'd like to add your business data" :
             mode === "sheet" ? "Paste your Google Sheet link below" :
             mode === "camera" ? "Point your camera at the ledger or invoice" :
             mode === "branch" ? "Which branch does this data belong to?" :
             mode === "processing" && uploadType === "excel" ? "Parsing Excel sheets and mapping branches..." :
             mode === "processing" ? "Fetching and analyzing your real data..." :
             mode === "error" ? "Something went wrong" :
             mode === "success" ? "Data extracted and synced successfully" :
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
                      Paste link — branches auto-detected from tabs
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
                  className="group relative flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-emerald-400/20 bg-white/60 p-8 transition-all duration-300 hover:bg-emerald-500/3 hover:border-emerald-500/40 hover:shadow-lg cursor-pointer"
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/15 text-emerald-700 shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <Camera className="size-8" strokeWidth={1.5} />
                  </span>
                  <div className="text-center">
                    <p className="text-base font-bold">Use Camera</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Capture live image of your ledger
                    </p>
                  </div>
                </button>

                {/* Excel fallback — secondary option */}
                <button
                  onClick={() => excelInputRef.current?.click()}
                  className="group flex items-center gap-3 rounded-xl border border-dashed border-border/40 bg-white/40 px-4 py-3 transition-all hover:bg-white/70 hover:border-border/60 cursor-pointer sm:col-span-2"
                >
                  <FileSpreadsheet className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <div className="text-left">
                    <p className="text-sm font-semibold">Have a local Excel file?</p>
                    <p className="text-[10px] text-muted-foreground">Upload .xlsx — each sheet name becomes a branch</p>
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
                    Make sure the sheet has <strong>public view access</strong>. Multiple tabs? Each tab name becomes a <strong>branch</strong> automatically.
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

                <div className="text-center text-[10px] text-muted-foreground">
                  Note: If the sheet has an Outlet/Location column, items will be auto-assigned to their branches
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
                    {uploadType === "excel"
                      ? processProgress < 20 ? "Reading Excel file..." :
                        processProgress < 40 ? "Detecting sheet names (branches)..." :
                        processProgress < 60 ? "Mapping rows to branches..." :
                        processProgress < 80 ? "Storing in database..." :
                        processProgress < 100 ? "Running AI analysis & alerts..." :
                        "Complete!"
                      : uploadType === "sheet"
                      ? processProgress < 15 ? "Connecting to Google Sheets..." :
                        processProgress < 35 ? "Detecting tabs & branches..." :
                        processProgress < 55 ? "Fetching real data from all tabs..." :
                        processProgress < 75 ? "Parsing & storing in database..." :
                        processProgress < 100 ? "Running AI analysis & alerts..." :
                        "Complete!"
                      : processProgress < 40 ? "Scanning data..." :
                        processProgress < 70 ? "Extracting fields..." :
                        processProgress < 100 ? "Analyzing with AI..." :
                        "Complete!"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {uploadType === "excel"
                      ? <>Uploading <strong>{excelFile?.name}</strong></>
                      : uploadType === "sheet"
                      ? <>Auto-detecting branches from sheet tabs</>
                      : <>Processing for <strong>{selectedBranch}</strong></>}
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

            {/* ─── ERROR ─── */}
            {mode === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200/60 px-4 py-3">
                  <AlertTriangle className="size-5 text-red-600 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-red-700">Failed to sync sheet</p>
                    <p className="text-xs text-red-600 mt-0.5">{apiError}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button variant="outline" className="rounded-full" onClick={resetState}>
                    Try Again
                  </Button>
                  <Button
                    className="rounded-full flex-1"
                    onClick={() => handleBranchSelect(selectedBranch)}
                  >
                    Retry
                  </Button>
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
                    <p className="text-sm font-bold text-emerald-700">
                      {excelResult?.branches
                        ? `${uploadType === "excel" ? "Excel" : "Sheet"} synced — ${Object.keys(excelResult.branches).length} branches detected!`
                        : uploadType === "sheet" ? "Sheet synced successfully!"
                        : "Data extracted successfully!"}
                    </p>
                    <p className="text-xs text-emerald-600">
                      {excelResult?.branches
                        ? <>{excelResult.totalItems || syncResult?.itemsUpserted} items across {Object.keys(excelResult.branches).length} branch(es)
                            {syncResult?.alerts > 0 && <> · {syncResult.alerts} alerts</>}</>
                        : <>{extractedData.length} items found for <strong>{selectedBranch}</strong>
                            {syncResult?.alerts > 0 && <> · {syncResult.alerts} alerts generated</>}</>}
                    </p>
                  </div>
                </div>

                {/* Multi-branch breakdown (for both Excel and multi-tab Google Sheets) */}
                {excelResult?.branches && Object.keys(excelResult.branches).length > 0 && (
                  <div className="rounded-xl border border-border/40 overflow-hidden">
                    <div className="bg-emerald-50/50 px-4 py-2 border-b border-border/20">
                      <p className="text-xs font-bold text-emerald-800">
                        Branch Breakdown (auto-detected from {uploadType === "excel" ? "sheet names" : "tab names"})
                      </p>
                    </div>
                    <div className="divide-y divide-border/20">
                      {Object.entries(excelResult.branches).map(([branch, info]) => (
                        <div key={branch} className="flex items-center justify-between px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <MapPin className="size-3.5 text-primary" />
                            <p className="text-sm font-bold">{branch}</p>
                          </div>
                          <span className="text-xs font-bold text-primary">
                            {typeof info === "number" ? info : info.upserted} items
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Auto-sync badge */}
                {uploadType === "sheet" && (
                  <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    <p className="text-[10px] font-medium text-primary">
                      Auto-sync enabled — your sheet will sync every 60 seconds automatically
                    </p>
                  </div>
                )}

                {/* Extracted data preview (for sheet/image/camera) */}
                {uploadType !== "excel" && extractedData.length > 0 && (
                <div className="rounded-xl border border-border/40 overflow-hidden">
                  <div className="bg-muted/30 px-4 py-2 border-b border-border/20">
                    <p className="text-xs font-bold text-muted-foreground">
                      {uploadType === "sheet" ? "Synced Data Preview" : "Extracted Data Preview"}
                    </p>
                  </div>
                  <div className="divide-y divide-border/20 max-h-[250px] overflow-y-auto">
                    {extractedData.slice(0, 15).map((item, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5">
                        <div>
                          <p className="text-xs font-semibold">{item.product}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {item.category ? `${item.category} · ` : ""}
                            Expires in {item.expiry} · ₹{item.price}
                            {item.branch && item.branch !== selectedBranch ? ` · 📍 ${item.branch}` : ""}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-primary">{item.quantity} units</span>
                      </div>
                    ))}
                    {extractedData.length > 15 && (
                      <div className="px-4 py-2 text-center text-[10px] text-muted-foreground">
                        + {extractedData.length - 15} more items
                      </div>
                    )}
                  </div>
                </div>
                )}

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
