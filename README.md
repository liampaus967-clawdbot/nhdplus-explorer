# 🛶 River Router

A Next.js application for planning float trips on US rivers with **real-time flow data**. Click to set a put-in and take-out point, and get route stats including distance, float time, elevation profile, and live conditions.

## Features

- **Interactive map** with multiple basemap options (Outdoors, Satellite, Dark)
- **Click-to-route** interface for planning float trips
- **Real-time velocities** from NOAA National Water Model (NWM)
- **Live conditions panel** — current vs historical flow comparison
- **Route statistics** — distance, float time, elevation drop, gradient
- **Elevation profile chart** with rapids/riffles detection
- **Flow direction arrows** showing downstream direction
- **Paddle speed slider** — calculate times with paddling effort
- **Downstream-only routing** — prevents upstream route errors

## Tech Stack

- **Frontend**: Next.js 14, React, Mapbox GL JS, Canvas API
- **Backend**: Next.js API routes, PostgreSQL/PostGIS
- **Data**: NHDPlus V2 (2.7M river reaches), NOAA NWM (hourly velocities)

---

## Velocity & Float Time Methodology

### Real-Time Data: NOAA National Water Model (NWM)

The primary velocity source is the **NOAA National Water Model**, which provides hourly forecasts for all 2.7 million NHDPlus reaches in the United States.

| Metric | Details |
|--------|---------|
| **Coverage** | 2.7M river reaches (CONUS) |
| **Update Frequency** | Hourly |
| **Variables** | Velocity (m/s), Streamflow (CMS) |
| **Source** | `s3://noaa-nwm-pds/` |

The NWM uses:
- Land surface models
- Channel routing physics
- Data assimilation from USGS stream gages
- Weather forecast inputs

### Historical Baseline: USGS NHDPlus EROM

When NWM data is unavailable, we fall back to **EROM** (Extended Reach Output Model) velocities:
- Mean annual velocity estimates
- Based on channel geometry, drainage area, and slope
- Peer-reviewed USGS methodology

### Live Conditions Display

The app shows real-time comparisons:
- **Flow Status**: High / Normal / Low (based on NWM vs EROM)
- **Current velocity** vs **historical average**
- **Time difference**: "12 min faster than average!"
- **Streamflow** in CFS

---

## Elevation Profile & Rapids Detection

The elevation profile chart color-codes gradient to identify potential rapids:

| Color | Classification | Gradient (ft/mi) | Description |
|-------|----------------|------------------|-------------|
| 🔵 Blue | Pool | < 5 | Flat, calm water |
| 🟡 Yellow | Riffle | 5-15 | Small waves, easy |
| 🟠 Orange | Rapid I-II | 15-30 | Moderate whitewater |
| 🔴 Red | Rapid III+ | > 30 | Significant rapids |

**Interactive feature**: Click and drag on the elevation profile to highlight that section on the map.

---

## API Endpoints

### GET `/api/snap`
Snap a point to the nearest river.

**Parameters:**
- `lng` — Longitude
- `lat` — Latitude

**Response:**
```json
{
  "node_id": "150058160",
  "comid": "6084563",
  "gnis_name": "Lamoille River",
  "stream_order": 5,
  "distance_m": 234,
  "snap_point": { "lng": -72.701, "lat": 44.523 }
}
```

### GET `/api/route`
Calculate route between two points using real-time NWM velocities.

**Parameters:**
- `start_lng`, `start_lat` — Start coordinates
- `end_lng`, `end_lat` — End coordinates

**Response:**
```json
{
  "route": { 
    "type": "FeatureCollection", 
    "features": [...] 
  },
  "stats": {
    "distance_mi": 10.6,
    "float_time_h": 8.2,
    "elev_drop_ft": 33,
    "gradient_ft_mi": 3.1,
    "waterways": ["Lamoille River"],
    "elevation_profile": [...],
    "steep_sections": [...],
    "live_conditions": {
      "nwm_coverage_percent": 100,
      "data_timestamp": "2026-01-31T04:00:00Z",
      "avg_velocity_mph": 0.5,
      "baseline_velocity_mph": 0.9,
      "avg_streamflow_cfs": 453.5,
      "time_diff_s": -1420,
      "flow_status": "low"
    }
  }
}
```

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Mapbox        │     │  Next.js App     │     │   PostgreSQL    │
│   Tileset       │     │                  │     │   (PostGIS)     │
│                 │     │  /api/snap       │     │                 │
│  Visual river   │◄────│  /api/route      │────►│  river_edges    │
│  display        │     │                  │     │  nwm_velocity   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                         ▲
                                                         │
                                                ┌────────┴────────┐
                                                │  NWM Ingest     │
                                                │  (hourly cron)  │
                                                │                 │
                                                │  NOAA S3 → DB   │
                                                └─────────────────┘
```

### Data Flow
1. **NWM Ingest** — Hourly cron downloads latest NWM NetCDF from NOAA S3
2. **Snap** — Find nearest river node using PostGIS spatial index
3. **Route** — Dijkstra on bbox-constrained subgraph (downstream only)
4. **Velocity** — Join with `nwm_velocity` for real-time data, fallback to EROM
5. **Stats** — Calculate distance, time, elevation, live conditions comparison

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
DATABASE_URL=postgresql://user:pass@host:5432/database
```

### 3. Run development server
```bash
npm run dev
```

Open http://localhost:3000

### 4. Set up NWM ingest (optional, for real-time data)
```bash
cd ~/river-router-api
source venv/bin/activate
python scripts/ingest_nwm.py  # Run once to populate
./scripts/setup_nwm_cron.sh   # Set up hourly updates
```

---

## Database Schema

### `river_edges` table (2.7M rows)
```sql
comid        BIGINT PRIMARY KEY  -- NHDPlus segment ID
gnis_name    VARCHAR(255)        -- River name
from_node    BIGINT              -- Start node (graph edge)
to_node      BIGINT              -- End node (graph edge)
lengthkm     FLOAT               -- Segment length in km
stream_order INT                 -- Strahler order (1-10)
velocity_fps FLOAT               -- EROM baseline velocity (ft/s)
min_elev_m   FLOAT               -- Downstream elevation (m)
max_elev_m   FLOAT               -- Upstream elevation (m)
slope        FLOAT               -- Channel slope
geom         GEOMETRY            -- PostGIS LineString (EPSG:4326)
```

### `nwm_velocity` table (2.4M rows, updated hourly)
```sql
comid           BIGINT PRIMARY KEY  -- Links to river_edges
velocity_ms     FLOAT               -- Real-time velocity (m/s)
streamflow_cms  FLOAT               -- Real-time streamflow (m³/s)
updated_at      TIMESTAMP           -- NWM data timestamp
```

---

## Data Sources

| Data | Source | Update Frequency |
|------|--------|------------------|
| River Network | USGS NHDPlus V2 | Static |
| Baseline Velocity | NHDPlus EROM | Static |
| Real-time Velocity | NOAA NWM | Hourly |
| Map Tiles | Mapbox | — |

