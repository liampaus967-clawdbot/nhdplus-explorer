# 🛰️ SWOT Satellite River Discharge Integration

## Overview

**SWOT (Surface Water and Ocean Topography)** is a joint NASA/CNES satellite mission providing unprecedented global river discharge measurements from space. The **Level 4 River Discharge v3** data (released January 2026) offers real-time river discharge, sediment, and water quality estimates.

**Goal:** Create a map layer showing satellite-derived river discharge to complement NWM model data.

---

## Data Products

### SWOT Level 4 SoS (Sword of Science) Discharge
- **Dataset ID:** `SWOT_L4_DAWG_SOS_DISCHARGE`
- **Coverage:** Global rivers (>100m wide)
- **Variables:** 
  - River discharge (m³/s)
  - Water surface elevation
  - Water quality indicators
  - Sediment estimates
- **Update frequency:** ~21-day orbital repeat cycle
- **Resolution:** River reaches defined by SWORD database

### Key Links
- [PO.DAAC SWOT Portal](https://podaac.jpl.nasa.gov/SWOT)
- [Dataset Page](https://podaac.jpl.nasa.gov/dataset/SWOT_L4_DAWG_SOS_DISCHARGE)
- [NASA Announcement](https://www.earthdata.nasa.gov/data/alerts-outages/swot-level-4-sword-science-river-discharge-products-version-3-released)

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
- [ ] Determine coverage overlap (SWORD only covers rivers >100m wide)
- [ ] Investigate USGS's SWORD-NHD linking efforts

---

## Integration Plan

### Phase 1: Research & Prototype
- [ ] Get Earthdata Login credentials for API access
- [ ] Test Hydrocron API with sample Vermont reaches
- [ ] Download SWORD database for study area
- [ ] Build SWORD → NHDPlus COMID crosswalk for Vermont

### Phase 2: Database Integration
- [ ] Create `swot_discharge` table in PostgreSQL
- [ ] Build ingest script to pull from Hydrocron API
- [ ] Set up periodic sync (every 21 days or as data refreshes)

### Phase 3: Map Layer
- [ ] Add SWOT layer to River Router
- [ ] Style by discharge magnitude
- [ ] Show discharge trends over time
- [ ] Compare SWOT vs NWM estimates

---

## Potential Use Cases

| Use Case | Value |
|----------|-------|
| **Real-time paddling conditions** | Know actual water levels before trips |
| **Flood monitoring** | Track discharge spikes in real-time |
| **Historical trends** | Compare current vs seasonal averages |
| **Model validation** | Cross-check NWM predictions against satellite observations |
| **Water quality alerts** | Sediment/turbidity warnings for fishing |

---

## Technical Notes

### Authentication
- Requires NASA Earthdata Login
- Token-based auth for Hydrocron API
- Register at: https://urs.earthdata.nasa.gov/

### Data Latency
- SWOT has a ~21-day revisit cycle
- Not true "real-time" like NWM (hourly)
- Best for: validation, trends, large rivers

### Coverage Limitations
- Only rivers >100m wide detected reliably
- Won't cover small Vermont streams
- Good for: Connecticut River, Lake Champlain tributaries, major rivers

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
2. [Level 4 SoS Discharge Algorithm](https://swot.jpl.nasa.gov/resources/272/river-discharge-from-the-swot-mission/)
3. [PO.DAAC Tutorials](https://podaac.github.io/tutorials/quarto_text/SWOT.html)
4. [USGS WISP Dashboard](https://www.earthdata.nasa.gov/news/blog/usgs-releases-wisp-dashboard)

---

## Status

**Current:** 📋 Research phase

**Next steps:**
1. Register for Earthdata Login
2. Test Hydrocron API access
3. Identify Vermont rivers with SWORD coverage
