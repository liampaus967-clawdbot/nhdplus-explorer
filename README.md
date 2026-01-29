# NHDPlus Waterbody Explorer

Interactive map application for exploring lakes, ponds, reservoirs, and other waterbodies from the USGS National Hydrography Dataset Plus (NHDPlus HR).

![NHDPlus Explorer](https://img.shields.io/badge/Data-USGS%20NHDPlus%20HR-blue)
![Next.js](https://img.shields.io/badge/Framework-Next.js%2014-black)
![Deploy](https://img.shields.io/badge/Deploy-Vercel-black)

## Features

- 🗺️ **Interactive Map** - Mapbox GL JS with smooth pan/zoom
- 🔍 **Dynamic Queries** - Fetch waterbodies as you pan the map
- 📊 **Detailed Stats** - Area, type, elevation, GNIS info
- 🎛️ **Filters** - Filter by waterbody type and minimum area
- 🔒 **Secure API** - Rate limiting, input validation, optional API key auth
- ⚡ **Edge Runtime** - Fast serverless functions on Vercel

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/YOUR_USERNAME/nhdplus-explorer.git
cd nhdplus-explorer
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Required: Your Mapbox token
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token_here

# Optional: Enable API key authentication
API_KEY=your-secret-api-key

# Optional: Adjust rate limits
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60
```

### 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

### Option A: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/nhdplus-explorer)

### Option B: CLI Deploy

```bash
npm i -g vercel
vercel
```

### Environment Variables on Vercel

Add these in your Vercel project settings:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | ✅ | Mapbox GL JS token |
| `API_KEY` | ❌ | Secret key for API auth |
| `RATE_LIMIT_REQUESTS` | ❌ | Max requests per window (default: 100) |
| `RATE_LIMIT_WINDOW` | ❌ | Rate limit window in seconds (default: 60) |

## API Endpoints

### GET `/api/waterbodies`

Query waterbodies by bounding box.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `min_lon` | float | ✅ | Western bound (-180 to 180) |
| `min_lat` | float | ✅ | Southern bound (-90 to 90) |
| `max_lon` | float | ✅ | Eastern bound (-180 to 180) |
| `max_lat` | float | ✅ | Northern bound (-90 to 90) |
| `ftype` | int | ❌ | Filter by feature type code |
| `gnis_name` | string | ❌ | Filter by GNIS name (partial match) |
| `min_area_sqkm` | float | ❌ | Minimum area in km² |
| `limit` | int | ❌ | Max results (default: 1000, max: 2000) |

**Example:**
```bash
curl "https://your-app.vercel.app/api/waterbodies?min_lon=-73&min_lat=44&max_lon=-72&max_lat=45&limit=100"
```

**Response:**
```json
{
  "type": "FeatureCollection",
  "features": [...],
  "metadata": {
    "bbox": [-73, 44, -72, 45],
    "limit": 100,
    "returned": 87,
    "source": "USGS NHDPlus HR"
  }
}
```

### GET `/api/waterbody/[id]`

Get a single waterbody by permanent identifier.

**Example:**
```bash
curl "https://your-app.vercel.app/api/waterbody/{48772983-F02C-4497-BE9C-F8EA84720B81}"
```

## Feature Type Codes

| Code | Type |
|------|------|
| 390 | Lake/Pond |
| 436 | Reservoir |
| 466 | Swamp/Marsh |
| 493 | Estuary |
| 378 | Ice Mass |
| 361 | Playa |

## Security

- **Rate Limiting**: 100 requests/minute per IP (configurable)
- **Bbox Size Limit**: Max 2° x 2° per query
- **Input Validation**: All inputs sanitized, SQL injection protected
- **Optional API Key**: Set `API_KEY` env var to require authentication

To use API key auth:
```bash
# Header
curl -H "Authorization: Bearer your-secret-key" "https://..."

# Query param
curl "https://...?api_key=your-secret-key"
```

## Data Source

Data is queried live from the USGS National Map NHDPlus HR service:
- **Service**: https://hydro.nationalmap.gov/arcgis/rest/services/NHDPlus_HR/MapServer
- **Layer**: 9 (NHDWaterbody)
- **Coverage**: Continental United States
- **Resolution**: High Resolution (1:24,000 scale)

## Project Structure

```
nhdplus-explorer/
├── app/
│   ├── api/
│   │   ├── waterbodies/
│   │   │   └── route.ts      # Bbox query endpoint
│   │   └── waterbody/
│   │       └── [id]/
│   │           └── route.ts  # Single waterbody lookup
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Main map page
│   └── page.module.css       # Page styles
├── lib/
│   └── security.ts           # Rate limiting, validation
├── public/
├── .env.example
├── next.config.js
├── package.json
├── tsconfig.json
└── vercel.json
```

## Running Without EC2

This project is fully self-contained and runs entirely on Vercel's serverless infrastructure:

1. **No EC2 needed** - All API routes run as Vercel Edge Functions
2. **No database needed** - Data is queried live from USGS
3. **No persistent storage** - Rate limiting uses in-memory store (resets on cold start)

For production rate limiting, consider adding [Vercel KV](https://vercel.com/storage/kv) or [Upstash Redis](https://upstash.com/).

## License

MIT

## Credits

- Data: [USGS National Hydrography Dataset Plus](https://www.usgs.gov/national-hydrography/nhdplus-high-resolution)
- Map: [Mapbox GL JS](https://www.mapbox.com/mapbox-gljs)
