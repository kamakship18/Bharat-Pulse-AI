const axios = require("axios");
const csvtojson = require("csvtojson");

// Shared axios headers that mimic a real browser (needed for Google to serve content)
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

// ── URL helpers ───────────────────────────────────────────────────────────────

/**
 * Extracts the spreadsheet ID from a Google Sheets URL.
 * Supports: /spreadsheets/d/SHEET_ID/edit#gid=0  and  /spreadsheets/d/SHEET_ID/
 */
function parseSheetUrl(url) {
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) {
    throw new Error(
      'Invalid Google Sheets URL. It must contain "/spreadsheets/d/<ID>".'
    );
  }

  const sheetId = idMatch[1];

  // If the URL contains a specific gid, honour it (single-sheet mode)
  const gidMatch = url.match(/[#&?]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : null;

  return { sheetId, gid };
}

/**
 * Builds the gviz/tq CSV URL for a single tab.
 *
 * We prefer &sheet=NAME over &gid=N because:
 *  - Google's gviz endpoint silently returns the first sheet when a gid is not
 *    found, making it impossible to detect invalid gids.
 *  - The sheet name is reliably parsed from the viewer HTML.
 *
 * Falls back to &gid=VALUE when only a numeric gid is available (e.g. URL
 * supplied with #gid=...).
 */
function buildCsvUrl(sheetId, { name, gid } = {}) {
  const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
  if (name) return `${base}&sheet=${encodeURIComponent(name)}`;
  return `${base}&gid=${gid ?? 0}`;
}

// ── Sheet list discovery ──────────────────────────────────────────────────────

/**
 * Fetches the spreadsheet viewer HTML and extracts all tab names.
 *
 * Google renders tab names as:
 *   <div class="goog-inline-block docs-sheet-tab-caption">Tab Name</div>
 *
 * This is present in the initial HTML payload for "Anyone with the link" sheets.
 * If parsing fails we fall back to [{ name: "Sheet1", gid: "0" }].
 *
 * @param {string} sheetId
 * @returns {Promise<Array<{ name: string, gid: null }>>}
 */
async function fetchSheetList(sheetId) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}`;

  let html = "";
  try {
    const res = await axios.get(url, {
      responseType: "text",
      timeout: 15_000,
      maxRedirects: 10,
      headers: BROWSER_HEADERS,
    });
    html = res.data || "";
  } catch (err) {
    console.warn(`[sheetList] HTML fetch failed (${err.message}); defaulting to Sheet1`);
    return [{ name: "Sheet1", gid: "0" }];
  }

  // ── Primary pattern: docs-sheet-tab-caption ────────────────────────────────
  // Present in the viewer HTML for public spreadsheets.
  const tabPattern = /docs-sheet-tab-caption">([^<]+)</g;
  const names = [];
  let m;
  while ((m = tabPattern.exec(html)) !== null) {
    const name = m[1].trim();
    if (name && !names.includes(name)) names.push(name);
  }

  if (names.length > 0) {
    console.log(`[sheetList] Found ${names.length} tab(s): ${names.join(", ")}`);
    // Return without gid — we will fetch by name via gviz &sheet=NAME
    return names.map((name) => ({ name, gid: null }));
  }

  // ── Fallback: look for any "sheetId"/title JSON blobs ─────────────────────
  const regA = /"sheetId":(\d+),"title":"([^"]+)"/g;
  const fallbackSheets = [];
  while ((m = regA.exec(html)) !== null) {
    const entry = { gid: m[1], name: m[2] };
    if (!fallbackSheets.find((s) => s.gid === entry.gid)) {
      fallbackSheets.push(entry);
    }
  }
  if (fallbackSheets.length > 0) {
    console.log(`[sheetList] Found ${fallbackSheets.length} tab(s) via fallback JSON pattern`);
    return fallbackSheets;
  }

  console.warn("[sheetList] Could not parse tab list; defaulting to Sheet1 (gid=0)");
  return [{ name: "Sheet1", gid: "0" }];
}

// ── CSV fetch + parse ─────────────────────────────────────────────────────────

/**
 * Fetches CSV text from a gviz/tq URL.
 *
 * Returns null for 404 (tab doesn't exist) so callers can skip gracefully.
 * Throws on 401/403 (private sheet) and network errors.
 */
async function fetchCsv(csvUrl) {
  let response;
  try {
    response = await axios.get(csvUrl, {
      responseType: "text",
      timeout: 15_000,
      maxRedirects: 10,
      headers: { ...BROWSER_HEADERS, Accept: "text/csv,text/plain,*/*" },
    });
  } catch (err) {
    if (err.response) {
      const s = err.response.status;
      if (s === 401 || s === 403) {
        throw new Error(
          `Access denied (HTTP ${s}). Share the sheet as "Anyone with the link → Viewer".`
        );
      }
      if (s === 404) return null;
      throw new Error(`Google returned HTTP ${s}. The sheet may be private or the URL invalid.`);
    }
    if (
      err.code === "SELF_SIGNED_CERT_IN_CHAIN" ||
      err.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE"
    ) {
      throw new Error(
        "SSL certificate error reaching Google (corporate proxy). " +
          "Add NODE_TLS_REJECT_UNAUTHORIZED=0 to your .env file."
      );
    }
    throw new Error(`Network error: ${err.message}`);
  }

  // Detect Google login-redirect: HTTP 200 but HTML body instead of CSV
  const ct = (response.headers["content-type"] || "").toLowerCase();
  const body = response.data || "";
  if (
    ct.includes("text/html") ||
    body.trimStart().startsWith("<!DOCTYPE") ||
    body.trimStart().startsWith("<html")
  ) {
    throw new Error(
      'The sheet is private — Google redirected to a login page. ' +
        'Share the sheet as "Anyone with the link → Viewer" and try again.'
    );
  }

  return body;
}

/**
 * Parses a raw CSV string into an array of plain row objects.
 * First row is used as column headers (keys).
 */
async function csvToJsonArray(csvText) {
  try {
    return await csvtojson({ trim: true, ignoreEmpty: true }).fromString(csvText);
  } catch (err) {
    throw new Error(`Failed to parse CSV: ${err.message}`);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * parseSheetToArray  —  used by GET /parse-sheet
 *
 * Fetches ALL sub-sheets and returns a flat JSON array.
 * Each row has two extra meta-fields to identify the source sub-sheet:
 *
 *   __sheet  → tab name   (e.g. "Classification")
 *   __gid    → gid or null if fetched by name
 *
 * Example output:
 *   [
 *     { "__sheet": "Intro",          "__gid": null, "Topics": "Search", ... },
 *     { "__sheet": "Classification", "__gid": null, "Web page title": "...", ... }
 *   ]
 *
 * Pass a URL with #gid=N to extract only that one tab (single-tab mode).
 */
async function parseSheetToArray(url) {
  const { sheetId, gid: requestedGid } = parseSheetUrl(url);

  let tabs;
  if (requestedGid) {
    // Specific gid in URL → single-tab mode
    tabs = [{ name: null, gid: requestedGid }];
  } else {
    tabs = await fetchSheetList(sheetId);
  }

  console.log(`[parse-sheet] Fetching ${tabs.length} tab(s) for sheet ${sheetId}`);

  const allRows = [];

  for (const tab of tabs) {
    const csvUrl = buildCsvUrl(sheetId, tab);
    const label = tab.name || `gid_${tab.gid}`;
    console.log(`  → tab "${label}"`);

    const csvText = await fetchCsv(csvUrl);
    if (!csvText || csvText.trim() === "") {
      console.log(`     (empty — skipped)`);
      continue;
    }

    const rows = await csvToJsonArray(csvText);
    if (!rows.length) continue;

    for (const row of rows) {
      allRows.push({ __sheet: label, __gid: tab.gid ?? null, ...row });
    }
  }

  return allRows;
}

/**
 * extractSheetData  —  used by POST /api/extract
 *
 * Fetches ALL sub-sheets and returns a structured response grouped by sheet.
 *
 * Example output:
 *   {
 *     sheetId:     "1GtpmiL6...",
 *     totalSheets: 5,
 *     totalRows:   83,
 *     sheets: [
 *       { sheetName: "Intro",          gid: null, rowCount: 8,  headers: [...], data: [...] },
 *       { sheetName: "Classification", gid: null, rowCount: 10, headers: [...], data: [...] },
 *       ...
 *     ]
 *   }
 */
async function extractSheetData(url) {
  const { sheetId, gid: requestedGid } = parseSheetUrl(url);

  let tabs;
  if (requestedGid) {
    tabs = [{ name: null, gid: requestedGid }];
  } else {
    tabs = await fetchSheetList(sheetId);
  }

  console.log(`[extract] Fetching ${tabs.length} tab(s) for sheet ${sheetId}`);

  const sheets = [];
  let totalRows = 0;

  for (const tab of tabs) {
    const csvUrl = buildCsvUrl(sheetId, tab);
    const label = tab.name || `gid_${tab.gid}`;
    console.log(`  → tab "${label}"`);

    const csvText = await fetchCsv(csvUrl);
    if (!csvText || csvText.trim() === "") {
      console.log(`     (empty — skipped)`);
      continue;
    }

    const data = await csvToJsonArray(csvText);
    if (!data.length) continue;

    const headers = Object.keys(data[0]);
    totalRows += data.length;

    sheets.push({
      sheetName: label,
      gid: tab.gid ?? null,
      rowCount: data.length,
      headers,
      data,
    });
  }

  return { sheetId, totalSheets: sheets.length, totalRows, sheets };
}

module.exports = { extractSheetData, parseSheetToArray, parseSheetUrl };
