# 🛰️ SWOT Satellite River Discharge Integration

## Overview

**SWOT (Surface Water and Ocean Topography)** is a $1.2B joint NASA/CNES satellite mission providing unprecedented global river measurements from space. Combined with **Confluence**, an open-source processing framework built by UMass Amherst, it delivers both river discharge AND water quality/sediment data.

**Goal:** Create a map layer showing satellite-derived river discharge and water quality to complement NWM model data.

---

## The Technology Stack

```
┌─────────────────────────────────────────────────────────┐
│                    SATELLITES                           │
├─────────────────┬─────────────────┬─────────────────────┤
│     SWOT        │    LANDSAT      │    Sentinel-2       │
│  (NASA/CNES)    │    (NASA)       │     (ESA)           │
│                 │                 │                     │
│  River width,   │  Sediment &     │  Sediment &         │
│  elevation,     │  water quality  │  water quality      │
│  discharge      │  imagery        │  imagery            │
└────────┬────────┴────────┬────────┴──────────┬──────────┘
         │                 │                   │
         └────────────────┬┴───────────────────┘
                          ▼
         ┌────────────────────────────────────┐
         │     CONFLUENCE (UMass Amherst)     │
         │                                    │
         │  • Processes raw satellite data    │
         │  • AI/computer vision for sediment │
         │  • 0.8 sec/image processing        │
         │  • 400k images/day globally        │
         │  • Open source framework           │
         └────────────────┬───────────────────┘
                          ▼
         ┌────────────────────────────────────┐
         │    LEVEL 4 DATA PRODUCTS           │
         │                                    │
         │  • River discharge (m³/s)          │
         │  • Suspended sediment              │
         │  • Water surface elevation         │
         │  • Water quality indicators        │
         └────────────────────────────────────┘
```

---

## Confluence: The UMass Breakthrough

**Confluence** is an open-source framework developed at UMass Amherst that processes SWOT, LANDSAT, and Sentinel-2 data into usable river information.

### Team
- **Colin Gleason** — Armstrong Professor of Civil & Environmental Engineering, UMass Amherst (Principal Investigator for NASA)
- **Subhransu Maji** — Professor, Manning College of Information & Computer Science, UMass Amherst
- **Rangel Daroya** — Ph.D. student, developed the AI sediment detection algorithm

### Why Confluence Matters

> "Without Confluence, you need a staggering amount of specialized knowledge and computing power to even step in the batter's box. Now everyone with a computer can access these river data." — Colin Gleason

| Before Confluence | After Confluence |
|-------------------|------------------|
| Specialized knowledge required | Accessible to anyone |
| Massive computing power needed | Runs on standard computers |
| Discharge OR quality (separate) | Discharge AND quality (unified) |
| Model-dependent estimates | Direct satellite observations |

### Technical Achievements
- **Processing speed:** 0.8 seconds per image (down from 20 seconds)
- **Global scale:** 400,000 images per day
- **AI-powered:** Computer vision detects rivers, filters clouds/snow/shadows
- **No external data needed:** Doesn't rely on elevation maps or terrain models

### Source
- [UMass News Article](https://www.umass.edu/news/article/unprecedented-data-global-river-quality-quantity-now-gathered-space-powered-umass)
- [NASA Announcement](https://science.nasa.gov/blogs/science-news/2026/01/05/swot-offers-river-discharge-estimate/)

---

## Data Products

### SWOT Level 4 SoS (Sword of Science) Discharge
- **Dataset ID:** `SWOT_L4_DAWG_SOS_DISCHARGE`
- **Coverage:** Global rivers >50m wide
- **Variables:** 
  - River discharge (m³/s)
  - Water surface elevation
  - Suspended sediment concentration
  - Water quality indicators
- **Update frequency:** ~21-day orbital repeat cycle
- **Resolution:** River reaches defined by SWORD database

### Key Links
- [PO.DAAC SWOT Portal](https://podaac.jpl.nasa.gov/SWOT)
- [Dataset Page](https://podaac.jpl.nasa.gov/dataset/SWOT_L4_DAWG_SOS_DISCHARGE)
- [NASA Data Release](https://www.earthdata.nasa.gov/data/alerts-outages/swot-level-4-sword-science-river-discharge-products-version-3-released)

---

## Hydrocron API

**Hydrocron** is PO.DAAC's time series API that makes SWOT data accessible without downloading thousands of shapefiles.

### Base URL
```
https://soto.podaac.earthdatacloud.nasa.gov/hydrocron/v1/
```

### Endpoints

#### Get River Reach Time Series
```bash
GET /timeseries?feature=Reach&feature_id={SWORD_REACH_ID}&start_time={ISO}&end_time={ISO}&output=geojson&fields=reach_id,time_str,wse,width,slope,discharge
```

#### Example Request
```bash
curl "https://soto.podaac.earthdatacloud.nasa.gov/hydrocron/v1/timeseries?feature=Reach&feature_id=74267100061&start_time=2024-01-01T00:00:00Z&end_time=2024-12-31T23:59:59Z&output=geojson&fields=reach_id,time_str,discharge"
```

### Documentation
- [Hydrocron Docs](https://podaac.github.io/hydrocron/intro.html)
- [GitHub Repo](https://github.com/podaac/hydrocron)

---

## SWORD Database

**SWORD (SWOT River Database)** defines the river reach IDs used by SWOT. We need to map these to NHDPlus COMIDs.

### Key Resources
- [SWORD Explorer](https://swordexplorer.com) — Visual browser for SWORD reach IDs
- SWORD reach IDs are 11-digit identifiers (e.g., `74267100061`)

### SWORD ↔ NHDPlus Mapping
Research needed:
- [ ] Find official crosswalk table between SWORD reach_id and NHDPlus COMID
- [ ] Determine coverage overlap (SWORD covers rivers >50m wide)
- [ ] Investigate USGS's SWORD-NHD linking efforts

---

## Integration Plan

### Phase 1: Research & Prototype
- [ ] Get Earthdata Login credentials for API access
- [ ] Test Hydrocron API with sample Vermont/New England reaches
- [ ] Download SWORD database for study area
- [ ] Build SWORD → NHDPlus COMID crosswalk
- [ ] Identify which Vermont rivers have SWOT coverage (>50m wide)

### Phase 2: Database Integration
- [ ] Create `swot_discharge` table in PostgreSQL
- [ ] Create `swot_sediment` table for water quality data
- [ ] Build ingest script to pull from Hydrocron API
- [ ] Set up periodic sync (every 21 days or as data refreshes)

### Phase 3: Map Layer
- [ ] Add SWOT discharge layer to River Router
- [ ] Add sediment/water clarity layer
- [ ] Style by discharge magnitude and water quality
- [ ] Show trends over time
- [ ] Compare SWOT vs NWM estimates

---

## Potential Use Cases

| Use Case | Data Source | Value |
|----------|-------------|-------|
| **Real-time paddling conditions** | SWOT discharge | Know actual water levels before trips |
| **Fishing water clarity** | Confluence sediment | Avoid muddy water, find clear streams |
| **Flood monitoring** | SWOT discharge | Track discharge spikes |
| **Historical trends** | SWOT time series | Compare current vs seasonal averages |
| **Model validation** | SWOT + NWM | Cross-check NWM predictions against satellite |
| **Turbidity alerts** | Confluence sediment | Warn about runoff events |

---

## Coverage for Vermont/New England

Rivers likely covered by SWOT (>50m wide):
- ✅ Connecticut River
- ✅ Merrimack River  
- ✅ Winooski River (lower sections)
- ✅ Lamoille River (lower sections)
- ✅ Lake Champlain tributaries
- ❓ Smaller streams (need to verify via SWORD Explorer)

---

## Technical Notes

### Authentication
- Requires NASA Earthdata Login
- Token-based auth for Hydrocron API
- Register at: https://urs.earthdata.nasa.gov/

### Data Latency
- SWOT has a ~21-day revisit cycle
- Not true "real-time" like NWM (hourly)
- Best for: validation, trends, large rivers, water quality

### Coverage Limitations
- Only rivers >50m wide detected reliably
- Won't cover small headwater streams
- Good for: Major rivers, fishing spots on larger waters

---

## Sample Code

### Python: Query Hydrocron
```python
import requests

HYDROCRON_URL = "https://soto.podaac.earthdatacloud.nasa.gov/hydrocron/v1/timeseries"

def get_swot_discharge(reach_id: str, start_date: str, end_date: str):
    """Fetch SWOT discharge time series for a river reach."""
    params = {
        "feature": "Reach",
        "feature_id": reach_id,
        "start_time": start_date,
        "end_time": end_date,
        "output": "geojson",
        "fields": "reach_id,time_str,wse,width,slope,discharge"
    }
    
    response = requests.get(HYDROCRON_URL, params=params)
    response.raise_for_status()
    return response.json()

# Example: Get data for a reach
data = get_swot_discharge(
    reach_id="74267100061",
    start_date="2024-01-01T00:00:00Z",
    end_date="2024-12-31T23:59:59Z"
)
```

---

## References

1. [SWOT Mission Overview](https://swot.jpl.nasa.gov/)
2. [UMass Confluence Announcement](https://www.umass.edu/news/article/unprecedented-data-global-river-quality-quantity-now-gathered-space-powered-umass)
3. [NASA SWOT Discharge Release](https://science.nasa.gov/blogs/science-news/2026/01/05/swot-offers-river-discharge-estimate/)
4. [Level 4 SoS Discharge Algorithm](https://swot.jpl.nasa.gov/resources/272/river-discharge-from-the-swot-mission/)
5. [PO.DAAC Tutorials](https://podaac.github.io/tutorials/quarto_text/SWOT.html)
6. [USGS WISP Dashboard](https://www.earthdata.nasa.gov/news/blog/usgs-releases-wisp-dashboard)
7. [Hydrocron API Docs](https://podaac.github.io/hydrocron/intro.html)

---

## Status

**Current:** 📋 Research phase

**Next steps:**
1. Register for Earthdata Login
2. Test Hydrocron API access
3. Use SWORD Explorer to identify Vermont rivers with coverage
4. Prototype sediment layer visualization
