# 🛶 River Router

A Next.js application for planning float trips on Vermont rivers. Click to set a put-in and take-out point, and get route stats including distance, float time, and elevation drop.

## Features

- **Interactive map** with Vermont river network (Mapbox tileset)
- **Click-to-route** interface for planning float trips
- **Route stats**: distance, float time, elevation drop, gradient
- **Paddle speed slider** to adjust travel times
- **River snapping** - clicks snap to nearest river segment

## Tech Stack

- **Frontend**: Next.js 14, React, Mapbox GL JS
- **Backend**: Next.js API routes, PostgreSQL/PostGIS
- **Data**: NHDPlus V2 river network, custom Mapbox tileset

## API Endpoints

### GET `/api/snap`
Snap a point to the nearest river.

**Parameters:**
- `lng` - Longitude
- `lat` - Latitude

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
- `start_lng`, `start_lat` - Start coordinates
- `end_lng`, `end_lat` - End coordinates

**Response:**
```json
{
  "route": { "type": "FeatureCollection", "features": [...] },
  "stats": {
    "distance_mi": 4.9,
    "float_time_h": 6.5,
    "elev_drop_ft": 713,
    "gradient_ft_mi": 146.8,
    "waterways": ["Spear Brook", "Ayers Brook"]
  }
}
```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000

## Environment Variables

```env
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
DATABASE_URL=postgresql://user:pass@host:5432/database
```

## Data Sources

- **River Network**: NHDPlus V2 (USGS)
- **Tileset**: Vermont rivers on Mapbox (`mapbox://lman967.9hfg3bbo`)
- **Routing**: PostGIS with Dijkstra algorithm

## License

MIT
