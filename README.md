# 🛶 River Router

A Next.js application for planning float trips on Vermont rivers. Click to set a put-in and take-out point, and get route stats including distance, float time, elevation profile, and gradient.

## Features

- **Interactive map** with Vermont river network (Mapbox vector tileset)
- **Click-to-route** interface for planning float trips
- **Flow condition selector** — adjust for low/normal/high water
- **Route statistics** — distance, float time, elevation drop, gradient
- **Elevation profile chart** — visualize the river's descent
- **Paddle speed slider** — calculate times with paddling effort
- **River snapping** — clicks snap to nearest river segment

## Tech Stack

- **Frontend**: Next.js 14, React, Mapbox GL JS, Canvas API
- **Backend**: Next.js API routes, PostgreSQL/PostGIS
- **Data**: NHDPlus V2 river network, custom Mapbox tileset

---

## Velocity & Float Time Methodology

### Data Source
Velocity estimates come from **USGS NHDPlus EROM** (Extended Reach Output Model), a peer-reviewed hydrologic model that estimates streamflow velocity based on:
- Channel geometry
- Drainage area
- Slope
- Regional regression equations

### Flow Condition Multipliers
EROM velocities represent **baseflow conditions** (typical low water). We apply multipliers based on Leopold & Maddock (1953) hydraulic geometry relationships:

| Condition | Multiplier | Description |
|-----------|------------|-------------|
| **Low Water** | 1.0× | Late summer, drought — EROM baseline |
| **Normal** | 1.5× | Typical paddling conditions |
| **High Water** | 2.0× | Spring runoff, after rain |

### Velocity by Stream Order
Average EROM velocities in the dataset:

| Stream Order | Avg Velocity | Description |
|--------------|--------------|-------------|
| 1-2 | 0.5-0.6 mph | Headwater creeks |
| 3-4 | 0.7-0.8 mph | Small streams |
| 5-6 | 0.9-1.0 mph | Medium rivers |
| 7-8 | 1.0-1.3 mph | Large rivers |
| 9-10 | 1.9-2.4 mph | Major rivers |

### References
- **NHDPlus EROM**: USGS NHDPlus Value Added Attributes documentation
- **Flow-velocity relationships**: Leopold, L.B. & Maddock, T. (1953). *The Hydraulic Geometry of Stream Channels and Some Physiographic Implications*. USGS Professional Paper 252.

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
  "gnis_name": "Spear Brook",
  "stream_order": 1,
  "distance_m": 868,
  "snap_point": { "lng": -72.701, "lat": 43.992 }
}
```

### GET `/api/route`
Calculate route between two points.

**Parameters:**
- `start_lng`, `start_lat` — Start coordinates
- `end_lng`, `end_lat` — End coordinates
- `flow` — Flow condition: `low`, `normal`, or `high` (default: `normal`)

**Response:**
```json
{
  "route": { 
    "type": "FeatureCollection", 
    "features": [...] 
  },
  "stats": {
    "distance_mi": 4.9,
    "float_time_h": 4.3,
    "float_time_s": 15600,
    "elev_drop_ft": 713,
    "gradient_ft_mi": 146.8,
    "waterways": ["Spear Brook", "Ayers Brook"],
    "flow_condition": "normal",
    "flow_multiplier": 1.5,
    "elevation_profile": [
      { "dist_m": 0, "elev_m": 417.8 },
      { "dist_m": 380, "elev_m": 400.2 },
      ...
    ]
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
│  display        │     │                  │     │  (2.7M rows)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### How Routing Works
1. **Snap** — Find nearest river node to click point (PostGIS spatial index)
2. **Load** — Query edges within bounding box of start/end points
3. **Route** — Run Dijkstra's algorithm in-memory on the subgraph
4. **Stats** — Calculate distance, time, elevation from route edges

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

---

## Database Schema

### `river_edges` table
```sql
comid        BIGINT PRIMARY KEY  -- NHDPlus segment ID
gnis_name    VARCHAR(255)        -- River name
from_node    BIGINT              -- Start node (graph edge)
to_node      BIGINT              -- End node (graph edge)
lengthkm     FLOAT               -- Segment length in km
stream_order INT                 -- Strahler order (1-10)
velocity_fps FLOAT               -- EROM velocity (ft/s)
min_elev_m   FLOAT               -- Downstream elevation (m)
max_elev_m   FLOAT               -- Upstream elevation (m)
slope        FLOAT               -- Channel slope
geom         GEOMETRY            -- PostGIS LineString (EPSG:4326)
```

---

## Data Sources

- **River Network**: NHDPlus V2 (USGS)
- **Tileset**: Vermont rivers on Mapbox (`mapbox://lman967.9hfg3bbo`)
- **Routing**: PostGIS with bbox-constrained Dijkstra

---

## License

MIT
