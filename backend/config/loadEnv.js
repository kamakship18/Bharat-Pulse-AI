/**
 * Load environment variables from .env files.
 * Tries repo root, then backend/ (later files override). Works when .env is only at repo root or only under backend/.
 * Must be required before any code reads process.env.
 */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const backendDir = path.join(__dirname, "..");
const repoRoot = path.join(backendDir, "..");

const candidates = [
  path.join(repoRoot, ".env"),
  path.join(repoRoot, ".env.local"),
  path.join(backendDir, ".env"),
  path.join(backendDir, ".env.local"),
];

const loaded = [];
for (const p of candidates) {
  if (!fs.existsSync(p)) continue;
  const result = dotenv.config({ path: p, override: true });
  if (result.error) {
    console.warn(`[env] Could not read ${p}: ${result.error.message}`);
    continue;
  }
  loaded.push(p);
}

if (loaded.length === 0) {
  dotenv.config();
}

function rel(p) {
  try {
    return path.relative(repoRoot, p) || p;
  } catch {
    return p;
  }
}

if (loaded.length) {
  console.log(`[env] Loaded ${loaded.length} file(s): ${loaded.map(rel).join(", ")}`);
} else {
  console.warn(
    "[env] No .env found — looked for .env at repo root and backend/. Copy backend/.env.example to backend/.env"
  );
}
