# 🤖 AI-Powered Inventory System

> **Google Sheet → MongoDB → Alerts & AI Recommendations — in real time.**

A Node.js / Express backend that syncs any public Google Sheet into MongoDB, automatically detects inventory problems with a rule-based alert engine, and generates actionable AI recommendations via **Groq** (OpenAI-compatible chat API).

---

## Architecture

```
POST /api/sync-sheet
        │
  Google Sheet (CSV)
        │
  InventoryItem (MongoDB)  ◄──── Change Streams (real-time)
        │                                │
  Alert Engine  ──────────────────► Alert (MongoDB)
        │
  Groq AI Engine ────────────────► Recommendation (MongoDB)
        │
  GET /api/inventory
  GET /api/alerts
  GET /api/recommendations
```

---

## Quick Start

### 1. Clone & Install

```bash
git clone <your-repo>
cd ai-inventory-system
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB Atlas or local connection string |
| `GROQ_API_KEY` | ⚠️ Recommended | Free from [console.groq.com/keys](https://console.groq.com/keys) |
| `GROQ_MODEL` | No | Default: `llama-3.3-70b-versatile` |
| `PORT` | No | Default: `5000` (see your `.env`) |
| `POLLING_INTERVAL_MS` | No | Auto-refresh interval. Default: `60000` (1 min) |

> **Alerts work without a Groq key.** AI recommendations are skipped if `GROQ_API_KEY` is not set.

### 3. Start the Server

```bash
npm run dev       # development (nodemon — auto-restarts)
npm start         # production
```

---

## Google Sheet Format

Your sheet must be **public** ("Anyone with the link → Viewer").

The system auto-detects column names using flexible matching:

| Inventory Field | Accepted Column Names *(case-insensitive)* |
|---|---|
| Product ID | `id`, `product_id`, `sku`, `item_id`, `code` |
| Name | `name`, `product`, `product_name`, `item`, `title` |
| Category | `category`, `type`, `department`, `group` |
| Quantity | `quantity`, `qty`, `stock`, `count`, `units`, `available` |
| Min Stock Level | `min_stock`, `min_level`, `reorder_point`, `minimum` |
| Max Stock Level | `max_stock`, `max_level`, `maximum` |
| Price | `price`, `cost`, `unit_price`, `selling_price` |
| Expiry Date | `expiry`, `expiry_date`, `expiration`, `best_before`, `use_by` |

**Example sheet layout:**

| Product Name | SKU | Category | Qty | Min Stock | Max Stock | Price | Expiry Date |
|---|---|---|---|---|---|---|---|
| Apple Juice | AJ-001 | Beverages | 5 | 20 | 200 | 1.99 | 2026-04-12 |
| Hand Sanitizer | HS-002 | Healthcare | 0 | 10 | 100 | 3.49 | |
| Olive Oil | OO-003 | Groceries | 350 | 30 | 150 | 8.99 | |

---

## API Reference

### 🔄 Data Sync

#### `POST /api/sync-sheet`

Fetches the sheet, upserts inventory, and runs alerts + AI.

```json
// Request body
{
  "sheetUrl": "https://docs.google.com/spreadsheets/d/YOUR_ID/edit",
  "enablePolling": true,
  "pollingIntervalMs": 60000
}

// Response
{
  "success": true,
  "message": "Sheet synced and analysis complete.",
  "sheetId": "1abc...",
  "totalRows": 25,
  "itemsUpserted": 25,
  "alerts": 4,
  "recommendations": 25,
  "aiEnabled": true,
  "polling": "Auto-refreshing every 1 minute(s)."
}
```

#### `POST /api/run-analysis`

Re-runs alert engine + AI on all inventory **without** re-fetching the sheet.

```json
// Response
{
  "success": true,
  "itemsScanned": 25,
  "alerts": 4,
  "recommendations": 25,
  "aiEnabled": true
}
```

---

### 📦 Inventory

#### `GET /api/inventory`

| Query Param | Default | Description |
|---|---|---|
| `category` | — | Filter by category (partial match) |
| `search` | — | Full-text search on name/category |
| `page` | `1` | Pagination |
| `limit` | `20` | Max 100 |
| `sortBy` | `name` | Any field name |
| `order` | `asc` | `asc` or `desc` |

#### `GET /api/inventory/summary`

Dashboard-ready counts:

```json
{
  "summary": {
    "totalItems": 25,
    "outOfStock": 1,
    "lowStock": 2,
    "expiringSoon": 1,
    "overstock": 1,
    "openAlerts": 4,
    "totalRecommendations": 25,
    "aiEnabled": true
  }
}
```

---

### 🚨 Alerts

#### `GET /api/alerts`

| Query Param | Values | Description |
|---|---|---|
| `type` | `low_stock` \| `out_of_stock` \| `expiring_soon` \| `overstock` | Filter by type |
| `resolved` | `false` (default) \| `true` \| `all` | Filter by resolution status |
| `page` | `1` | Pagination |

#### Alert Types

| Type | Rule | Severity |
|---|---|---|
| `out_of_stock` | `quantity === 0` | 🔴 critical |
| `low_stock` | `quantity <= minStockLevel` | 🟡 warning |
| `expiring_soon` | Expiry within 3 days | 🟡 warning |
| `overstock` | `quantity >= maxStockLevel × 1.5` | 🔵 info |

#### `PATCH /api/alerts/:id/resolve`

Manually marks an alert as resolved.

---

### 🤖 AI Recommendations

#### `GET /api/recommendations`

| Query Param | Values | Description |
|---|---|---|
| `type` | `restock` \| `discount` \| `demand_insight` \| `hold` \| `other` | Filter |
| `priority` | `low` \| `medium` \| `high` \| `urgent` | Filter |

**Example response item:**

```json
{
  "productName": "Apple Juice",
  "type": "restock",
  "suggestion": "Immediately reorder at least 50 units of Apple Juice to avoid stockout disruption.",
  "reasoning": "Current quantity of 5 is 75% below the minimum stock level of 20, and expiry in 3 days adds urgency.",
  "priority": "urgent",
  "confidence": 0.97
}
```

---

### 🏥 System

#### `GET /api/health`

```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2026-04-09T14:22:02.632Z",
  "mongodb": "connected"
}
```

---

## Real-Time Updates

The system uses **MongoDB Change Streams** to watch the `inventoryitems` collection.

```
Any DB write to inventoryitems
        │
        ▼
[ChangeStream] detects insert / update / replace
        │
        ├── alertEngine.runForItem(item)   → upsert alerts
        └── aiEngine.runForItem(item)      → upsert recommendation
```

**Fallback:** If your MongoDB deployment doesn't support change streams (requires Atlas M0+ or a replica set), the system falls back gracefully. Alerts and AI still run on every `POST /api/sync-sheet` call — just not on raw DB writes.

---

## Project Structure

```
.
├── server.js                     # Express app entry point
├── .env                          # Environment variables (gitignored)
├── .env.example                  # Template for new contributors
├── package.json
│
├── config/
│   └── db.js                     # MongoDB connection
│
├── models/
│   ├── SheetImport.js            # Raw sheet import log
│   ├── InventoryItem.js          # ⭐ Inventory product model
│   ├── Alert.js                  # ⭐ Rule-based alert model
│   └── Recommendation.js        # ⭐ AI recommendation model
│
├── routes/
│   ├── sheets.js                 # Original sheet import routes
│   └── inventory.js             # ⭐ Full inventory API routes
│
└── utils/
    ├── sheetExtractor.js         # Google Sheets → JSON parser
    ├── alertEngine.js           # ⭐ Rule-based alert engine
    ├── aiEngine.js              # ⭐ Groq AI engine
    └── changeStreamListener.js  # ⭐ Real-time MongoDB watcher
```

> ⭐ = new in v2.0

---

## Notes

- **Groq** has generous free-tier limits; the AI engine adds a short delay between items to stay polite to the API.
- **Upsert logic** means running `/sync-sheet` or `/run-analysis` multiple times is always safe — no duplicates.
- **productId** is the upsert key. Use a consistent `sku` / `id` column for reliable updates.
