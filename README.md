# ✈️ FlightPredict — AI-Powered Flight Price Tracker

Track flight prices over time and get AI-powered buy recommendations from Claude.

![Flight Price Predictor](frontend/public/vite.svg)

## 🏗 Architecture

```
User → React Frontend (Vite)
         ↓
    Express Backend (Port 3001)
    ├── Amadeus API       → real-time fares, analysis
    ├── PostgreSQL DB     → price snapshots, tracked routes
    ├── Events Service    → holidays, school breaks
    └── Claude API        → AI buy recommendations
```

## 📁 Project Structure

```
/frontend             React app (Vite + Recharts)
/backend
  /routes             REST API endpoints
    search.js         Flight search & location lookup
    history.js        Price history & route tracking
    predict.js        AI predictions & events
    alerts.js         Price alert CRUD
  /services           External service clients
    amadeus.js        Amadeus flight data API
    claude.js         Claude AI predictions
    events.js         Holiday/event data
  /jobs               Background tasks
    priceScraper.js   Daily cron for price polling
  /db                 Database layer
    schema.sql        PostgreSQL schema
    pool.js           Connection pool
    migrate.js        Migration runner
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- [Amadeus API credentials](https://developers.amadeus.com)
- [Anthropic API key](https://console.anthropic.com)

### 1. Database Setup
```bash
createdb flight_predictor
cd backend
cp .env.example .env
# Edit .env with your credentials
npm run migrate
```

### 2. Backend
```bash
cd backend
npm install
npm run dev
# → http://localhost:3001
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

## 🔑 API Keys Required

| Service | Get Key At | Env Variable |
|---------|-----------|-------------|
| Amadeus | [developers.amadeus.com](https://developers.amadeus.com) | `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET` |
| Anthropic | [console.anthropic.com](https://console.anthropic.com) | `ANTHROPIC_API_KEY` |

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/search/flights` | Search flight offers |
| GET | `/api/search/locations` | Airport/city autocomplete |
| GET | `/api/search/price-analysis` | Amadeus price metrics |
| GET | `/api/search/cheapest-dates` | Find cheapest travel dates |
| GET | `/api/history` | List tracked routes |
| POST | `/api/history/track` | Start tracking a route |
| DELETE | `/api/history/track/:id` | Stop tracking |
| GET | `/api/history/:routeId` | Get price history |
| POST | `/api/predict/:routeId` | Get AI prediction |
| POST | `/api/predict/quick` | Quick prediction (no tracking) |
| GET | `/api/predict/events` | Get events near a date |
| GET | `/api/alerts` | List price alerts |
| POST | `/api/alerts` | Create alert |
| DELETE | `/api/alerts/:id` | Delete alert |
| GET | `/api/health` | Health check |

## 🤖 How the AI Prediction Works

1. The daily cron job polls Amadeus for all tracked routes and stores price snapshots
2. When you request a prediction, Claude receives:
   - Full price history curve
   - Route details & days until departure
   - Nearby events (holidays, school breaks)
   - Amadeus price analysis data
3. Claude returns a structured recommendation:
   - **BUY_NOW** / **WAIT** / **PRICE_DROPPING** / **PRICE_RISING** / **LAST_CHANCE**
   - Predicted best buy date & price
   - Confidence score (0-100%)
   - Price zone (LOW / MEDIUM / HIGH / PEAK)
   - Detailed reasoning

## 📋 Phase Progress

- [x] Phase 1: Backend scaffolding + Amadeus + DB schema
- [x] Phase 2: Daily price polling cron job
- [x] Phase 3: Frontend — search, chart, event overlay
- [x] Phase 4: Claude prediction engine
- [x] Phase 5: Price alerts + tracked routes management
