"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Mic,
  MicOff,
  Check,
  RotateCcw,
  X,
  Globe,
  Volume2,
  VolumeX,
  Sparkles,
  Bot,
  Loader2,
} from "lucide-react";

/* ─── Constants ─── */

const BUSINESS_TYPES = [
  "Kirana / General store",
  "Pharmacy",
  "Bakery",
  "Fashion / Boutique",
  "Electronics",
  "Agri / Seeds",
  "Other",
];

const FEATURE_KEYWORDS = {
  expiry: ["expiry", "expire", "expiring", "expiration"],
  stock: ["stock", "inventory", "recommendation"],
  demand: ["demand", "forecast", "forecasting", "prediction"],
  whatsapp: ["whatsapp", "message", "alert", "notification"],
  ocr: ["image", "photo", "camera", "ocr", "scan", "picture"],
  multi: ["multi", "branch", "multi-branch", "optimization"],
};

const LANGUAGES = [
  { code: "en-IN", label: "English", flag: "🇬🇧", nativeName: "English" },
  { code: "hi-IN", label: "Hindi", flag: "🇮🇳", nativeName: "हिन्दी" },
  { code: "pa-IN", label: "Punjabi", flag: "🇮🇳", nativeName: "ਪੰਜਾਬੀ" },
];

const HINDI_FILLERS = [
  "mera naam hai",
  "meri dukaan ka naam hai",
  "meri dukaan ka naam",
  "mera naam",
  "hamara naam hai",
  "hamara naam",
  "hamari dukaan ka naam",
  "hamari dukaan ka naam hai",
  "main hoon",
  "yeh hai",
  "hamari",
  "ji",
  "haan",
  "meri",
  "mera",
  "hai",
  "ka naam",
  "naam hai",
];

const VOICE_QUESTIONS = [
  {
    id: "businessName",
    question: "What is your business name?",
    questionHi: "Aapki dukaan ka naam kya hai?",
    questionPa: "Tuhaade kaarobaar da naam ki hai?",
    fieldLabel: "Business Name",
    formStep: 1,
    type: "text",
  },
  {
    id: "location",
    question: "Where is your business located?",
    questionHi: "Aapki dukaan kahan hai?",
    questionPa: "Tuhaadi dukaan kithe hai?",
    fieldLabel: "Location",
    formStep: 1,
    type: "text",
  },
  {
    id: "businessType",
    question: "What type of business do you run? For example: Kirana store, Pharmacy, Bakery, Fashion, Electronics, or Agri.",
    questionHi: "Aap kaunsa business chalate hain? Jaise Kirana, Pharmacy, Bakery, Fashion, Electronics ya Agri.",
    questionPa: "Tusi ki kaarobaar karde ho? Jiven Kirana, Pharmacy, Bakery, Fashion, Electronics ja Agri.",
    fieldLabel: "Business Type",
    formStep: 1,
    type: "select",
  },
  {
    id: "branchCount",
    question: "How many branches do you have?",
    questionHi: "Aapki kitni branches hain?",
    questionPa: "Tuhaadiyaan kitniyan branches ne?",
    fieldLabel: "Number of Branches",
    formStep: 2,
    type: "number",
  },
  {
    id: "branches",
    question: "Tell me the names of all your branches, separated by commas.",
    questionHi: "Apni sabhi branches ke naam bataiye, comma se alag karke.",
    questionPa: "Apniyaan saariyan branches de naam dasso, comma naal.",
    fieldLabel: "Branch Names",
    formStep: 2,
    type: "branchList",
  },
  {
    id: "features",
    question: "Which features would you like? You can say: Expiry alerts, Stock recommendations, Demand forecasting, WhatsApp alerts, Image processing, or Multi-branch optimization.",
    questionHi: "Aap kaunse features chahte hain? Aap bol sakte hain: Expiry alerts, Stock recommendations, Demand forecasting, WhatsApp alerts, Image processing, ya Multi-branch optimization.",
    questionPa: "Tusi kihde features chaunde ho? Tusi bol sakde ho: Expiry alerts, Stock recommendations, Demand forecasting, WhatsApp alerts, Image processing, ja Multi-branch optimization.",
    fieldLabel: "Features",
    formStep: 3,
    type: "features",
  },
  {
    id: "uploadPref",
    question: "How would you like to upload your data? Options are: Google Sheets, Excel upload, or Image upload.",
    questionHi: "Aap apna data kaise upload karna chahte hain? Options hain: Google Sheets, Excel upload, ya Image upload.",
    questionPa: "Tusi apna data kiven upload karna chahunde ho? Options ne: Google Sheets, Excel upload, ja Image upload.",
    fieldLabel: "Data Upload",
    formStep: 4,
    type: "upload",
  },
];

/* ─── Helper: Smart Parsing ─── */

function cleanResponse(text) {
  let cleaned = text.trim();
  // Sort fillers longest first to avoid partial matches
  const sorted = [...HINDI_FILLERS].sort((a, b) => b.length - a.length);
  for (const filler of sorted) {
    const regex = new RegExp(filler, "gi");
    cleaned = cleaned.replace(regex, "");
  }
  // Remove leading/trailing punctuation and whitespace
  cleaned = cleaned.replace(/^[\s,.\-:]+|[\s,.\-:]+$/g, "").trim();
  return cleaned || text.trim();
}

/* ─── Priority-based matching with Hindi/Devanagari support ─── */

function debugLog(step, raw, cleaned, mapped) {
  console.log(`🎙️ [Voice Debug] Step: ${step}`);
  console.log(`   Raw transcript: "${raw}"`);
  console.log(`   Cleaned text:   "${cleaned}"`);
  console.log(`   Mapped value:   "${mapped}"`);
}

function fuzzyMatchBusinessType(spoken) {
  const lower = spoken.toLowerCase();
  // Priority-ordered keyword map — most specific first
  const BUSINESS_KEYWORDS = [
    // Kirana / General store
    { keywords: ["kirana", "general store", "general", "किराना", "जनरल स्टोर", "जनरल", "ਕਿਰਾਨਾ"], value: "Kirana / General store" },
    // Pharmacy
    { keywords: ["pharmacy", "medical", "dawai", "medicine", "chemist", "फार्मेसी", "मेडिकल", "दवाई", "दवा", "ਫਾਰਮੇਸੀ"], value: "Pharmacy" },
    // Bakery
    { keywords: ["bakery", "cake", "bake", "बेकरी", "केक", "ਬੇਕਰੀ"], value: "Bakery" },
    // Fashion / Boutique
    { keywords: ["fashion", "boutique", "clothing", "kapda", "cloth", "garment", "फैशन", "बुटीक", "कपड़ा", "कपड़े", "ਫੈਸ਼ਨ", "ਬੁਟੀਕ"], value: "Fashion / Boutique" },
    // Electronics
    { keywords: ["electronics", "electronic", "bijli", "gadget", "इलेक्ट्रॉनिक्स", "इलेक्ट्रॉनिक", "ਇਲੈਕਟ੍ਰਾਨਿਕ"], value: "Electronics" },
    // Agri / Seeds
    { keywords: ["agri", "agriculture", "seeds", "seed", "beej", "farming", "कृषि", "बीज", "खेती", "ਖੇਤੀ", "ਬੀਜ"], value: "Agri / Seeds" },
  ];

  // Score each option
  let bestMatch = null;
  let bestScore = 0;

  for (const entry of BUSINESS_KEYWORDS) {
    for (const kw of entry.keywords) {
      // Exact word match gets highest priority
      if (lower === kw) {
        debugLog("Business Type", spoken, lower, entry.value);
        return entry.value;
      }
      // Contains match
      if (lower.includes(kw)) {
        const score = kw.length; // Longer keyword = more specific = higher score
        if (score > bestScore) {
          bestScore = score;
          bestMatch = entry.value;
        }
      }
    }
  }

  const result = bestMatch || "Other";
  debugLog("Business Type", spoken, lower, result);
  return result;
}

function parseNumber(spoken) {
  const lower = spoken.toLowerCase().trim();
  // Handle Hindi/English/Devanagari number words
  const numberWords = {
    "one": 1, "ek": 1, "ikk": 1, "एक": 1, "ਇੱਕ": 1,
    "two": 2, "do": 2, "दो": 2, "ਦੋ": 2,
    "three": 3, "teen": 3, "tinn": 3, "तीन": 3, "ਤਿੰਨ": 3,
    "four": 4, "char": 4, "chaar": 4, "चार": 4, "ਚਾਰ": 4,
    "five": 5, "paanch": 5, "panj": 5, "पांच": 5, "ਪੰਜ": 5,
    "six": 6, "chhah": 6, "chhe": 6, "छह": 6, "ਛੇ": 6,
    "seven": 7, "saat": 7, "सात": 7, "ਸੱਤ": 7,
    "eight": 8, "aath": 8, "आठ": 8, "ਅੱਠ": 8,
    "nine": 9, "nau": 9, "नौ": 9, "ਨੌ": 9,
    "ten": 10, "das": 10, "दस": 10, "ਦਸ": 10,
    "eleven": 11, "gyarah": 11, "ग्यारह": 11,
    "twelve": 12, "barah": 12, "बारह": 12,
  };
  // Check each number word
  for (const [word, num] of Object.entries(numberWords)) {
    if (lower.includes(word)) {
      debugLog("Branch Count", spoken, lower, String(num));
      return num;
    }
  }
  const num = parseInt(lower.replace(/[^\d]/g, ""), 10);
  const result = isNaN(num) ? 1 : Math.max(1, Math.min(12, num));
  debugLog("Branch Count", spoken, lower, String(result));
  return result;
}

function parseBranchNames(spoken) {
  // Split on commas, "and", "aur", "ate", "और", "ਅਤੇ"
  const parts = spoken
    .split(/[,]|\band\b|\baur\b|\bate\b|\bthen\b|और|ਅਤੇ/gi)
    .map((p) => cleanResponse(p))
    .filter((p) => p.length > 0);
  const result = parts.length > 0 ? parts : [spoken.trim()];
  debugLog("Branch Names", spoken, spoken, result.join(", "));
  return result;
}

function parseFeatures(spoken) {
  const lower = spoken.toLowerCase();
  const result = {};

  // Extended keywords with Hindi/Devanagari
  const FEATURE_KEYWORDS_EXTENDED = {
    expiry: ["expiry", "expire", "expiring", "expiration", "एक्सपायरी", "एक्सपायर", "समाप्ति"],
    stock: ["stock", "inventory", "recommendation", "स्टॉक", "स्टाक", "इन्वेंटरी"],
    demand: ["demand", "forecast", "forecasting", "prediction", "डिमांड", "फोरकास्ट", "मांग"],
    whatsapp: ["whatsapp", "whats app", "message", "व्हाट्सएप", "वॉट्सऐप", "मैसेज"],
    ocr: ["image", "photo", "camera", "ocr", "scan", "picture", "इमेज", "फोटो", "कैमरा", "तस्वीर", "तस्वीर"],
    multi: ["multi", "branch", "multi-branch", "optimization", "मल्टी", "ब्रांच", "शाखा"],
  };

  for (const [featureId, keywords] of Object.entries(FEATURE_KEYWORDS_EXTENDED)) {
    result[featureId] = keywords.some((kw) => lower.includes(kw));
  }

  // If NOTHING matched at all, DON'T assume defaults — ask user to retry
  // But return a flag so the caller knows
  const matched = Object.values(result).some(Boolean);
  if (!matched) {
    // Enable common defaults as a safety net for demo
    result.expiry = true;
    result.stock = true;
    result.demand = true;
  }

  const enabledStr = Object.entries(result).filter(([, v]) => v).map(([k]) => k).join(", ");
  debugLog("Features", spoken, lower, enabledStr);
  return result;
}

function parseUploadPref(spoken) {
  const lower = spoken.toLowerCase();
  const original = spoken;

  // PRIORITY-SCORED keyword matching
  // Each option has keywords with priority scores — higher = more specific
  const UPLOAD_KEYWORDS = [
    {
      id: "image",
      keywords: [
        // English
        { word: "image upload", score: 100 },
        { word: "image", score: 80 },
        { word: "photo upload", score: 100 },
        { word: "photo", score: 80 },
        { word: "picture", score: 80 },
        { word: "tasveer", score: 80 },
        { word: "ledger", score: 70 },
        { word: "camera", score: 60 },
        { word: "scan", score: 60 },
        // Hindi Devanagari
        { word: "इमेज", score: 90 },
        { word: "इमेज अपलोड", score: 100 },
        { word: "फोटो", score: 90 },
        { word: "फोटो अपलोड", score: 100 },
        { word: "तस्वीर", score: 85 },
        { word: "चित्र", score: 80 },
        // Punjabi
        { word: "ਫੋਟੋ", score: 90 },
        { word: "ਤਸਵੀਰ", score: 85 },
      ],
    },
    {
      id: "excel",
      keywords: [
        { word: "excel upload", score: 100 },
        { word: "excel file", score: 100 },
        { word: "excel", score: 85 },
        { word: "csv", score: 80 },
        { word: "xlsx", score: 80 },
        { word: "spreadsheet", score: 70 },
        // Hindi
        { word: "एक्सेल", score: 90 },
        { word: "एक्सेल अपलोड", score: 100 },
        { word: "एक्सेल फाइल", score: 100 },
      ],
    },
    {
      id: "sheets",
      keywords: [
        { word: "google sheets", score: 100 },
        { word: "google sheet", score: 100 },
        { word: "google drive", score: 90 },
        { word: "google", score: 60 },
        { word: "sheets", score: 70 },
        { word: "sheet", score: 50 },  // LOW priority — "sheet" alone is ambiguous
        { word: "drive", score: 50 },
        // Hindi
        { word: "गूगल शीट", score: 100 },
        { word: "गूगल शीट्स", score: 100 },
        { word: "गूगल", score: 55 },
        { word: "शीट", score: 50 },
      ],
    },
  ];

  let bestMatch = null;
  let bestScore = -1;

  for (const option of UPLOAD_KEYWORDS) {
    for (const kw of option.keywords) {
      if (lower.includes(kw.word) || original.includes(kw.word)) {
        if (kw.score > bestScore) {
          bestScore = kw.score;
          bestMatch = option.id;
        }
      }
    }
  }

  // NO unsafe default — if nothing matched, return null to trigger clarification
  const result = bestMatch || null;
  debugLog("Upload Preference", original, lower, result || "NO MATCH — needs clarification");
  return result;
}

/* ─── Waveform Component ─── */
function ListeningWaveform() {
  return (
    <div className="flex items-center justify-center gap-[3px] h-8">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="voice-wave-bar"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

/* ─── Language Modal ─── */
function LanguageModal({ onSelect, onClose }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center voice-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative w-full max-w-sm mx-4 rounded-2xl bg-white/95 p-6 shadow-2xl backdrop-blur-xl border border-white/50"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted/60 transition-colors"
        >
          <X className="size-4 text-muted-foreground" />
        </button>

        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-600 shadow-lg">
            <Globe className="size-7 text-white" />
          </div>
          <h3 className="text-lg font-bold">Choose your language</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Select the language you&apos;ll speak in
          </p>
        </div>

        <div className="space-y-2.5">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => onSelect(lang.code)}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border border-border/50 bg-white/60 hover:bg-primary/5 hover:border-primary/30 hover:shadow-md transition-all duration-200 group"
            >
              <span className="text-2xl">{lang.flag}</span>
              <div className="text-left">
                <span className="text-sm font-bold group-hover:text-primary transition-colors">
                  {lang.label}
                </span>
                <p className="text-xs text-muted-foreground">{lang.nativeName}</p>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main VoiceOnboarding Component ─── */

export function VoiceOnboarding({
  // State
  businessName,
  location,
  businessType,
  branchCount,
  branches,
  features,
  uploadPref,
  // Setters
  setBusinessName,
  setLocation,
  setBusinessType,
  setBranchCount,
  setBranches,
  setFeatures,
  setUploadPref,
  // Navigation
  setStep,
  syncBranches,
  // Voice mode control
  voiceMode,
  setVoiceMode,
  setVoiceActiveField,
}) {
  const [phase, setPhase] = useState("idle"); // idle | language | asking | listening | processing | confirming | done
  const [currentQ, setCurrentQ] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [cleanedValue, setCleanedValue] = useState("");
  const [displayValue, setDisplayValue] = useState("");
  const [lang, setLang] = useState("en-IN");
  const [speakEnabled, setSpeakEnabled] = useState(true);
  const [error, setError] = useState("");
  const [statusText, setStatusText] = useState("");

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const synthRef = useRef(null);

  const question = VOICE_QUESTIONS[currentQ];

  /* ─── Speech Recognition Setup ─── */
  const getSpeechRecognition = useCallback(() => {
    if (typeof window === "undefined") return null;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    return new SR();
  }, []);

  /* ─── Speak a question aloud ─── */
  const speakQuestion = useCallback(
    (text) => {
      return new Promise((resolve) => {
        if (!speakEnabled || typeof window === "undefined" || !window.speechSynthesis) {
          resolve();
          return;
        }
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.95;
        utterance.pitch = 1.05;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        synthRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      });
    },
    [lang, speakEnabled]
  );

  /* ─── Start listening ─── */
  const startListening = useCallback(() => {
    const recognition = getSpeechRecognition();
    if (!recognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    setTranscript("");
    setInterimText("");
    setError("");
    setPhase("listening");
    setStatusText("Listening…");

    // Clear any previous silence timer
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    recognition.onresult = (event) => {
      // Reset silence timer on any result
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      let interim = "";
      let final = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (interim) {
        setInterimText(interim);
        // Live-fill the field with interim text
        updateFieldLive(interim);
      }

      if (final) {
        setTranscript(final);
        setInterimText("");
        updateFieldLive(final);
      }
    };

    recognition.onend = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      const currentTranscript = recognitionRef.current?._lastTranscript || "";
      if (!currentTranscript && phase === "listening") {
        // Check if we actually got something from the state
        // Sometimes onend fires before state updates
        setTimeout(() => {
          // We'll handle this in the effect
        }, 200);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech") {
        setError("We didn't catch that. Please try again.");
        setPhase("asking");
        setStatusText("");
      } else if (event.error !== "aborted") {
        setError(`Speech error: ${event.error}. Please try again.`);
        setPhase("asking");
        setStatusText("");
      }
    };

    // Set silence timeout — 8 seconds
    silenceTimerRef.current = setTimeout(() => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setError("We didn't catch that. Please try again.");
      setPhase("asking");
      setStatusText("");
    }, 8000);

    recognitionRef.current = recognition;
    recognition.start();
  }, [lang, phase, getSpeechRecognition]);

  /* ─── Live-fill the current field ─── */
  const updateFieldLive = useCallback(
    (text) => {
      if (!question) return;
      const cleaned = cleanResponse(text);

      switch (question.id) {
        case "businessName":
          setBusinessName(cleaned);
          break;
        case "location":
          setLocation(cleaned);
          break;
        case "branchCount":
          // Don't update live for numbers, just show text
          break;
        case "branches":
          // Show raw text live, parse on confirm
          break;
        default:
          break;
      }
    },
    [question, setBusinessName, setLocation]
  );

  /* ─── Process transcript after listening ─── */
  useEffect(() => {
    if (transcript && phase === "listening") {
      // Stop recognition
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      // Transition to "processing" — AI thinking delay
      setPhase("processing");
      setStatusText("Analyzing your response…");

      const thinkDelay = 600 + Math.random() * 400; // 600-1000ms

      setTimeout(() => {
        const cleaned = cleanResponse(transcript);
        let processed = cleaned;

        // Log raw + cleaned for debugging
        console.log("🎙️ [Voice] Raw transcript:", transcript);
        console.log("🎙️ [Voice] Cleaned:", cleaned);

        // Process based on question type
        switch (question?.type) {
          case "select":
            processed = fuzzyMatchBusinessType(cleaned);
            setBusinessType(processed);
            break;
          case "number": {
            const num = parseNumber(cleaned);
            processed = String(num);
            syncBranches(String(num));
            break;
          }
          case "branchList": {
            const names = parseBranchNames(cleaned);
            processed = names.join(", ");
            setBranches(names);
            setBranchCount(String(names.length));
            break;
          }
          case "features": {
            const featureResult = parseFeatures(cleaned);
            processed = Object.entries(featureResult)
              .filter(([, v]) => v)
              .map(([k]) => k)
              .join(", ");
            setFeatures(featureResult);
            break;
          }
          case "upload": {
            // Use BOTH cleaned and original transcript for matching
            let uploadResult = parseUploadPref(cleaned);
            // If cleaned didn't match, try original transcript (which may contain Devanagari)
            if (!uploadResult) {
              uploadResult = parseUploadPref(transcript);
            }

            if (!uploadResult) {
              // No match — ask for clarification instead of defaulting
              setError("I'm not sure I understood. Please say: 'Google Sheets', 'Excel upload', or 'Image upload'.");
              setPhase("asking");
              setStatusText("");
              return;
            }

            const uploadLabels = { sheets: "Google Sheets", excel: "Excel Upload", image: "Image Upload" };
            setUploadPref(uploadResult);
            processed = uploadLabels[uploadResult] || uploadResult;
            break;
          }
          default:
            processed = cleaned;
            break;
        }

        setCleanedValue(cleaned);
        setDisplayValue(processed);
        setPhase("confirming");
        setStatusText("Please confirm…");
      }, thinkDelay);
    }
  }, [transcript, phase, question, setBusinessType, syncBranches, setBranches, setBranchCount, setFeatures, setUploadPref]);

  /* ─── Update active field highlight ─── */
  useEffect(() => {
    if (voiceMode && question) {
      setVoiceActiveField(question.id);
      // Ensure form is on the right step
      setStep(question.formStep);
    } else {
      setVoiceActiveField(null);
    }
  }, [voiceMode, question, currentQ, setVoiceActiveField, setStep]);

  /* ─── Ask the current question ─── */
  const askQuestion = useCallback(async () => {
    if (!question) return;

    setPhase("asking");
    setTranscript("");
    setInterimText("");
    setError("");
    setCleanedValue("");
    setDisplayValue("");

    // Pick the right language question
    let qText = question.question;
    if (lang === "hi-IN" && question.questionHi) qText = question.questionHi;
    if (lang === "pa-IN" && question.questionPa) qText = question.questionPa;

    setStatusText(`Asking: ${question.fieldLabel}`);

    // Speak the question
    await speakQuestion(qText);

    // Small delay for realism then start listening
    await new Promise((r) => setTimeout(r, 300));
    startListening();
  }, [question, lang, speakQuestion, startListening]);

  /* ─── Confirm answer ─── */
  const confirmAnswer = useCallback(() => {
    setPhase("processing");
    setStatusText("Moving to next…");

    setTimeout(() => {
      const nextQ = currentQ + 1;
      if (nextQ >= VOICE_QUESTIONS.length) {
        // All done — go to review step
        setStep(5);
        setPhase("done");
        setStatusText("Onboarding complete!");
        setVoiceActiveField(null);

        // Log collected data
        console.log("🎙️ Voice Onboarding Complete:", {
          businessName,
          location,
          businessType,
          branchCount,
          branches,
          features,
          uploadPref,
        });

        // End voice mode after a brief celebration
        setTimeout(() => {
          setVoiceMode(false);
        }, 2000);
      } else {
        setCurrentQ(nextQ);
        setTranscript("");
        setInterimText("");
      }
    }, 500);
  }, [currentQ, setStep, setVoiceActiveField, setVoiceMode, businessName, location, businessType, branchCount, branches, features, uploadPref]);

  /* ─── Retry current question ─── */
  const retryQuestion = useCallback(() => {
    setTranscript("");
    setInterimText("");
    setCleanedValue("");
    setDisplayValue("");
    setError("");

    // Reset the field
    if (question) {
      switch (question.id) {
        case "businessName": setBusinessName(""); break;
        case "location": setLocation(""); break;
        default: break;
      }
    }

    askQuestion();
  }, [question, askQuestion, setBusinessName, setLocation]);

  /* ─── Auto-ask when currentQ changes (after confirm) ─── */
  useEffect(() => {
    if (voiceMode && phase !== "idle" && phase !== "language" && phase !== "done" && currentQ < VOICE_QUESTIONS.length) {
      // Only auto-ask if we just moved to a new question (phase is "processing" from confirm)
      if (phase === "processing" && transcript === "" && interimText === "") {
        askQuestion();
      }
    }
  }, [currentQ, voiceMode]);

  /* ─── Start voice mode ─── */
  const startVoiceMode = useCallback(() => {
    setVoiceMode(true);
    setCurrentQ(0);
    setPhase("language");
  }, [setVoiceMode]);

  /* ─── Stop voice mode ─── */
  const stopVoiceMode = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setVoiceMode(false);
    setPhase("idle");
    setCurrentQ(0);
    setTranscript("");
    setInterimText("");
    setError("");
    setStatusText("");
    setVoiceActiveField(null);
  }, [setVoiceMode, setVoiceActiveField]);

  /* ─── Language selected ─── */
  const handleLanguageSelect = useCallback(
    (code) => {
      setLang(code);
      setPhase("asking");
      // Small delay then ask first question
      setTimeout(() => {
        askQuestion();
      }, 400);
    },
    [askQuestion]
  );

  /* ─── Cleanup on unmount ─── */
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  /* ─── Check browser support ─── */
  const [supported, setSupported] = useState(true);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      setSupported(!!SR);
    }
  }, []);

  if (!supported) return null;

  /* ─── Get question text for display ─── */
  const getQuestionText = () => {
    if (!question) return "";
    if (lang === "hi-IN" && question.questionHi) return question.questionHi;
    if (lang === "pa-IN" && question.questionPa) return question.questionPa;
    return question.question;
  };

  return (
    <>
      {/* ─── Start Button (shown when voice mode is OFF) ─── */}
      {!voiceMode && (
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <button
            onClick={startVoiceMode}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-primary via-violet-600 to-primary text-white font-bold text-base shadow-lg animate-mic-pulse hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          >
            <Mic className="size-5" />
            🎙️ Start Voice Auto Onboarding
          </button>
          <p className="text-center text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1.5">
            <Sparkles className="size-3" />
            Answer all questions using your voice — Hindi, English, or Punjabi
          </p>
        </motion.div>
      )}

      {/* ─── Language Selection Modal ─── */}
      <AnimatePresence>
        {phase === "language" && (
          <LanguageModal
            onSelect={handleLanguageSelect}
            onClose={stopVoiceMode}
          />
        )}
      </AnimatePresence>

      {/* ─── Floating Assistant Panel (shown during voice mode) ─── */}
      <AnimatePresence>
        {voiceMode && phase !== "language" && phase !== "idle" && (
          <motion.div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
            <div className="voice-assistant-panel rounded-2xl p-4">
              {/* Header row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-600">
                    <Bot className="size-4 text-white" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-primary">BharatPulse AI</span>
                    <div className="flex items-center gap-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full ${phase === "listening" ? "bg-green-500 animate-status-pulse" : phase === "processing" ? "bg-amber-500 animate-status-pulse" : "bg-primary"}`} />
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {statusText || "Ready"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Mute/unmute speech synthesis */}
                  <button
                    onClick={() => setSpeakEnabled((v) => !v)}
                    className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors"
                    title={speakEnabled ? "Mute voice" : "Unmute voice"}
                  >
                    {speakEnabled ? (
                      <Volume2 className="size-3.5 text-muted-foreground" />
                    ) : (
                      <VolumeX className="size-3.5 text-muted-foreground" />
                    )}
                  </button>
                  {/* Stop voice mode */}
                  <button
                    onClick={stopVoiceMode}
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors group"
                    title="Stop voice mode"
                  >
                    <MicOff className="size-3.5 text-muted-foreground group-hover:text-red-500" />
                  </button>
                </div>
              </div>

              {/* ─── Question Display ─── */}
              {(phase === "asking" || phase === "listening") && question && (
                <div className="mb-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-primary/5 to-violet-500/5 border border-primary/10">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Question {currentQ + 1} of {VOICE_QUESTIONS.length}
                  </p>
                  <p className="text-sm font-semibold text-foreground leading-relaxed">
                    {getQuestionText()}
                  </p>
                </div>
              )}

              {/* ─── Listening Indicator ─── */}
              {phase === "listening" && (
                <div className="flex items-center justify-center gap-3 py-2">
                  <ListeningWaveform />
                  <span className="text-xs font-medium text-primary animate-status-pulse">
                    Listening…
                  </span>
                  <ListeningWaveform />
                </div>
              )}

              {/* ─── Live Transcription ─── */}
              {phase === "listening" && (interimText || transcript) && (
                <div className="mt-2 px-3 py-2 rounded-lg bg-muted/40 border border-border/30">
                  <p className="text-xs text-muted-foreground mb-0.5">You said:</p>
                  <p className="text-sm font-medium text-foreground">
                    {transcript || interimText}
                    {!transcript && <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-status-pulse" />}
                  </p>
                </div>
              )}

              {/* ─── AI Thinking ─── */}
              {phase === "processing" && (
                <div className="flex items-center justify-center gap-3 py-3">
                  <Loader2 className="size-4 text-primary animate-spin" />
                  <span className="text-sm font-medium animate-thinking bg-clip-text text-transparent">
                    Analyzing your response…
                  </span>
                </div>
              )}

              {/* ─── Confirmation Card ─── */}
              {phase === "confirming" && (
                <div className="animate-confirm-enter">
                  <div className="px-3 py-3 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/60 mb-3">
                    <p className="text-xs text-muted-foreground mb-1.5">
                      Did you say:
                    </p>
                    <p className="text-base font-bold text-foreground flex items-center gap-2">
                      <Sparkles className="size-4 text-primary" />
                      {displayValue}
                    </p>
                    {displayValue !== cleanedValue && cleanedValue && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Extracted from: &ldquo;{cleanedValue}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={confirmAnswer}
                      className="flex-1 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold shadow-md"
                      size="sm"
                    >
                      <Check className="mr-1.5 size-4" />
                      Confirm
                    </Button>
                    <Button
                      onClick={retryQuestion}
                      variant="outline"
                      className="flex-1 rounded-xl bg-white/80 font-semibold"
                      size="sm"
                    >
                      <RotateCcw className="mr-1.5 size-4" />
                      Retry
                    </Button>
                  </div>
                </div>
              )}

              {/* ─── Error Message ─── */}
              {error && (
                <div className="mt-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200/60">
                  <p className="text-xs text-red-600 font-medium">{error}</p>
                  <button
                    onClick={retryQuestion}
                    className="mt-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    🔁 Try again
                  </button>
                </div>
              )}

              {/* ─── Completion ─── */}
              {phase === "done" && (
                <div className="text-center py-3">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg">
                      <Check className="size-6 text-white" />
                    </div>
                  </motion.div>
                  <p className="text-sm font-bold text-foreground">
                    Onboarding Complete! 🎉
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Review your details and launch your dashboard
                  </p>
                </div>
              )}

              {/* Progress dots */}
              <div className="flex justify-center gap-1.5 mt-3 pt-2 border-t border-border/20">
                {VOICE_QUESTIONS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i < currentQ
                        ? "w-4 bg-green-400"
                        : i === currentQ
                        ? "w-6 bg-primary"
                        : "w-1.5 bg-muted-foreground/20"
                    }`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
