# 🗺️ NavX — Full-Stack GPS Navigation App

A production-ready GPS navigation application inspired by Garmin/TomTom, built with React + TypeScript + SCSS + Bootstrap (frontend) and Node.js + Express + TypeScript (backend). Uses **OpenStreetMap** (free, no API key needed) and **OSRM** for routing.

---

## ✨ Features

| Feature | Detail |
|---|---|
| **Live predictive search** | Debounced autocomplete via Nominatim OSM API |
| **Multi-mode routing** | Driving 🚗 · Walking 🚶 · Cycling 🚴 |
| **Turn-by-turn directions** | Step-by-step with maneuver icons |
| **GPS tracking** | Real-time position via browser Geolocation API |
| **Active navigation HUD** | Distance remaining, ETA, current maneuver |
| **Reverse geocoding** | "Use my location" button fills the origin field |
| **Dark map theme** | CSS-filtered tiles for the futuristic look |
| **Response caching** | NodeCache on backend to reduce API calls |
| **Rate limiting** | 100 req/min per IP |
| **Mobile responsive** | Panel slides up on small screens |

---

## 🛠️ Tech Stack

### Frontend
- **React 18** + **TypeScript**
- **Bootstrap 5** (layout & utilities)
- **SCSS** (custom design system, variables, components)
- **React-Leaflet** + **Leaflet.js** (interactive map)
- **Vite** (bundler + dev server)

### Backend
- **Node.js** + **Express** + **TypeScript**
- **Nominatim** (OSM geocoding & place search — free, no key)
- **OSRM** (routing engine — free public demo server)
- **NodeCache** (in-memory response caching)
- **Helmet** + **CORS** + **express-rate-limit** (security)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### 1. Clone & install

```bash
# Backend
cd backend
cp .env.example .env
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Run development servers

```bash
# Terminal 1 — Backend (port 3001)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 📡 API Reference

### Search

| Endpoint | Method | Description |
|---|---|---|
| `GET /api/search/suggest?q=<query>&limit=8` | GET | Predictive place search |
| `GET /api/search/reverse?lat=<lat>&lon=<lon>` | GET | Reverse geocode coordinates |

**Suggest response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "way:12345",
      "displayName": "Baker Street, Westminster, London",
      "shortName": "Baker Street",
      "type": "Street",
      "coordinates": { "lat": 51.5227, "lon": -0.1571 },
      "country": "United Kingdom",
      "city": "London"
    }
  ]
}
```

### Routing

| Endpoint | Method | Description |
|---|---|---|
| `POST /api/route/calculate` | POST | Calculate route between two points |

**Request body:**
```json
{
  "origin": { "lat": 51.5074, "lon": -0.1278 },
  "destination": { "lat": 48.8566, "lon": 2.3522 },
  "mode": "driving"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "distance": 342000,
    "duration": 10800,
    "summary": "342.0 km · 180 min",
    "mode": "driving",
    "geometry": [{ "lat": 51.5074, "lon": -0.1278 }, ...],
    "steps": [
      {
        "instruction": "Start onto Whitehall (342.0 km)",
        "distance": 500,
        "duration": 60,
        "maneuver": "depart-straight",
        "coordinates": { "lat": 51.5074, "lon": -0.1278 },
        "streetName": "Whitehall"
      }
    ]
  }
}
```

---

## 🗂️ Project Structure

```
gps-nav-app/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express app entry
│   │   ├── routes/
│   │   │   ├── search.ts         # Search endpoints
│   │   │   └── route.ts          # Route calculation endpoint
│   │   ├── services/
│   │   │   ├── searchService.ts  # Nominatim integration
│   │   │   └── routingService.ts # OSRM integration
│   │   └── types/index.ts        # Shared TypeScript types
│   ├── tsconfig.json
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── main.tsx               # React entry point
    │   ├── App.tsx                # Root component & state
    │   ├── components/
    │   │   ├── MapView.tsx        # Leaflet map component
    │   │   ├── SearchInput.tsx    # Autocomplete input
    │   │   ├── DirectionsPanel.tsx # Step-by-step list
    │   │   ├── NavHUD.tsx         # Active nav overlay
    │   │   └── Toast.tsx          # Notification toast
    │   ├── services/
    │   │   └── api.ts             # Backend API calls
    │   ├── types/index.ts         # TypeScript interfaces
    │   ├── utils/
    │   │   ├── hooks.ts           # Custom React hooks
    │   │   └── helpers.ts         # Format/utility functions
    │   └── styles/
    │       ├── _variables.scss    # SCSS variables & tokens
    │       └── main.scss          # Full app stylesheet
    ├── vite.config.ts
    ├── tsconfig.json
    └── package.json
```

---

## 🔧 Production Deployment

### Build

```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build
```

### Environment variables (production)

```env
PORT=3001
FRONTEND_URL=https://your-domain.com
NODE_ENV=production
```

### Self-host OSRM (recommended for production)

For production, run your own OSRM instance instead of the public demo server:

```bash
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/europe.osm.pbf
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-partition /data/europe.osrm
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-customize /data/europe.osrm
docker run -t -i -p 5000:5000 -v "${PWD}:/data" osrm/osrm-backend osrm-routed --algorithm mld /data/europe.osrm
```

Then update `OSRM_PROFILES` in `routingService.ts` to point to `http://localhost:5000`.

---

## 📱 PWA Upgrade Path

To make this installable on mobile (like Garmin/Google Maps):
1. Add `vite-plugin-pwa`
2. Configure `manifest.json` with app icons
3. Add a service worker for offline tile caching

---

## 🗺️ Data Sources

- **Tiles**: OpenStreetMap contributors (© OSM)
- **Geocoding**: Nominatim (openstreetmap.org)
- **Routing**: OSRM Project (project-osrm.org)

All data sources are **free** and require **no API key** for development.
