# BharatPulse AI

**AI-powered operations for Indian MSMEs** — turn messy inventory data (Google Sheets, uploads, images) into **alerts**, **branch-level clarity**, **demand-aware recommendations**, and optional **WhatsApp** nudges so local businesses stop flying blind.

---

## Why this exists

Small and medium retailers (kirana, pharmacy, bakery, fashion, electronics, agri, and more) often run stock on **spreadsheets** and gut feel. BharatPulse connects that reality to a **modern stack**: sync data → detect expiry / low stock / imbalance → run **rules + optional LLM (Groq)** for recommendations → surface everything on a **dashboard** built for quick decisions.

**Objectives**

- Reduce silent leakage (expiry, stockouts, overstock).
- Make multi-branch stock **visible** and suggest **internal transfers** when one outlet is dry and another has surplus.
- Layer **weather / events / demand signals** (predictive intelligence) so recommendations feel contextual, not generic.
- Support **onboarding on the web** or **via WhatsApp** (Twilio) for demos and low-friction signup.

---

## What’s in this repo

| Area | Stack |
|------|--------|
| **Frontend** | Next.js (App Router), Tailwind, Framer Motion — `frontend/` |
| **Backend** | Node.js, Express, MongoDB (Mongoose), Twilio (optional) — `backend/` |
| **Data** | Google Sheets (public CSV-style fetch), Excel upload, in-app uploads |
| **AI** | Groq (OpenAI-compatible) for recommendation copy when `GROQ_API_KEY` is set |

High-level flow:

```text
Google Sheet / Excel / Upload  →  MongoDB (inventory, alerts, recommendations)
                                      ↓
                         Rule engine + optional Groq AI
                                      ↓
                    Dashboard + WhatsApp (alerts, restock, transfers)
```

---

## Features (product)

- **Auth** — Phone OTP (demo-friendly), JWT session, onboarding (web or WhatsApp).
- **Inventory** — Flexible column mapping from sheets; multi-tab workbooks → branch per tab.
- **Alerts** — Low / out-of-stock, expiry, overstock; severity and branch context.
- **AI recommendations** — Product-level suggestions with reasoning when Groq is enabled.
- **Predictive intelligence** — Weather + events + demand-style insights (configurable providers).
- **Transfers** — Suggested internal moves between branches; optional WhatsApp for orders/transfers.
- **Business Pulse (0–100)** — Composite **resilience score** from stock health, expiry pressure, open alerts, and AI load — with **actionable drivers** on the dashboard (`GET /api/inventory/pulse-score`).
- **WhatsApp onboarding** — Conversational setup via Twilio webhook: `POST /api/whatsapp/webhook` (see `backend/utils/whatsappOnboardingFlow.js`).

---

## Repository layout

```text
bharat/
├── frontend/          # Next.js UI — dashboard, onboarding, login
├── backend/           # Express API, models, jobs (sheet polling), webhooks
└── README.md          # This file
```

---

## Prerequisites

- **Node.js 18+**
- **MongoDB** (Atlas or local) — `MONGODB_URI`
- **Groq** (optional) — `GROQ_API_KEY` for AI recommendation text
- **Twilio** (optional) — WhatsApp outbound + inbound webhook for WA onboarding

---

## Local development

### Backend

```bash
cd backend
# Add .env with at least MONGODB_URI (see backend README)
npm install
npm run dev            # default port from PORT or 5000 / 5001
```

Health check: `GET http://localhost:<PORT>/api/health`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The Next app proxies `/api/*` to the backend (see `frontend/next.config.mjs` — `BACKEND_URL` in production, local port in dev).

---

## Environment variables (summary)

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing for `/api/user/*` and auth |
| `GROQ_API_KEY` | AI recommendations (optional) |
| `OPENWEATHER_API_KEY` | Weather in predictive stack (optional; fallback providers may exist) |
| `TWILIO_*` | WhatsApp via Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`) |
| `WHATSAPP_ONBOARDING_DEMO_PHONE` / `WHATSAPP_ONBOARDING_ALLOWLIST` | Restrict WA onboarding to specific numbers (demo) |
| `BACKEND_URL` | Vercel: origin of API for rewrites (no trailing slash) |

---

## Deployment (typical)

- **Frontend** — Vercel, root directory `frontend`, set `BACKEND_URL` to your API origin.
- **Backend** — Render / Railway / Fly.io; set env vars; ensure MongoDB Atlas allows the host’s outbound IPs.

**Twilio WhatsApp webhook** (inbound onboarding):

`https://<your-api-host>/api/whatsapp/webhook` — `POST`, `application/x-www-form-urlencoded`.

---

## API highlights

Public / common routes include:

- `GET /api/health` — Liveness
- `POST /api/auth/send-otp`, `POST /api/auth/verify-otp`
- `GET /api/user/me`, `POST /api/user/save-onboarding`, `POST /api/user/link-sheet`
- `POST /api/sync-sheet`, `GET /api/inventory/summary`, **`GET /api/inventory/pulse-score`**
- `GET /api/alerts`, `GET /api/recommendations`, predictive routes under `/api/predictions/*`
- `POST /api/whatsapp/webhook` — Twilio inbound (onboarding bot)

Full detail: `backend/README.md`.

---

## Scripts

| Location | Command | Purpose |
|----------|---------|---------|
| `frontend/` | `npm run dev` | Next.js dev server |
| `frontend/` | `npm run build` | Production build |
| `backend/` | `npm run dev` | Nodemon API |
| `backend/` | `npm start` | Production API |

---

## License & contributions

Private / team project unless stated otherwise. For issues and PRs, keep changes focused and match existing patterns (see project rules).

---

## Acknowledgements

Built for **Bharat’s MSME** operators — spreadsheets today, AI-assisted operations tomorrow.
