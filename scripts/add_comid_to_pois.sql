-- =====================================================
-- Add nearest_comid to POI tables for fast route queries
-- This converts expensive spatial queries into simple index lookups
-- =====================================================

-- 1. Add columns
ALTER TABLE water_access.campgrounds ADD COLUMN IF NOT EXISTS nearest_comid BIGINT;
ALTER TABLE water_access.access_points_clean ADD COLUMN IF NOT EXISTS nearest_comid BIGINT;
ALTER TABLE water_access.waterfalls ADD COLUMN IF NOT EXISTS nearest_comid BIGINT;
ALTER TABLE water_access.rapids ADD COLUMN IF NOT EXISTS nearest_comid BIGINT;
ALTER TABLE hazards_dams ADD COLUMN IF NOT EXISTS nearest_comid BIGINT;

-- 2. Update campgrounds with nearest COMID (within 1km)
UPDATE water_access.campgrounds c
SET nearest_comid = sub.comid
FROM (
  SELECT DISTINCT ON (c.id) 
    c.id as camp_id,
    r.comid
  FROM water_access.campgrounds c
  CROSS JOIN LATERAL (
    SELECT comid, geom
    FROM river_edges
    WHERE ST_DWithin(geom::geography, c.geom::geography, 1000)
    ORDER BY ST_Distance(geom::geography, c.geom::geography)
    LIMIT 1
  ) r
) sub
WHERE c.id = sub.camp_id;

-- 3. Update access points with nearest COMID (within 500m - they should be close)
UPDATE water_access.access_points_clean a
SET nearest_comid = sub.comid
FROM (
  SELECT DISTINCT ON (a.id) 
    a.id as ap_id,
    r.comid
  FROM water_access.access_points_clean a
  CROSS JOIN LATERAL (
    SELECT comid, geom
    FROM river_edges
    WHERE ST_DWithin(geom::geography, a.geom::geography, 500)
    ORDER BY ST_Distance(geom::geography, a.geom::geography)
    LIMIT 1
  ) r
) sub
WHERE a.id = sub.ap_id;

-- 4. Update waterfalls with nearest COMID (within 500m)
UPDATE water_access.waterfalls w
SET nearest_comid = sub.comid
FROM (
  SELECT DISTINCT ON (w.id) 
    w.id as wf_id,
    r.comid
  FROM water_access.waterfalls w
  CROSS JOIN LATERAL (
    SELECT comid, geom
    FROM river_edges
    WHERE ST_DWithin(geom::geography, w.geom::geography, 500)
    ORDER BY ST_Distance(geom::geography, w.geom::geography)
    LIMIT 1
  ) r
) sub
WHERE w.id = sub.wf_id;

-- 5. Update rapids with nearest COMID (within 500m)
UPDATE water_access.rapids r
SET nearest_comid = sub.comid
FROM (
  SELECT DISTINCT ON (r.id) 
    r.id as rapid_id,
    re.comid
  FROM water_access.rapids r
  CROSS JOIN LATERAL (
    SELECT comid, geom
    FROM river_edges re
    WHERE ST_DWithin(re.geom::geography, r.geom::geography, 500)
    ORDER BY ST_Distance(re.geom::geography, r.geom::geography)
    LIMIT 1
  ) re
) sub
WHERE r.id = sub.rapid_id;

-- 6. Update dams with nearest COMID (within 200m - dams should be on rivers)
UPDATE hazards_dams d
SET nearest_comid = sub.comid
FROM (
  SELECT DISTINCT ON (d.id) 
    d.id as dam_id,
    r.comid
  FROM hazards_dams d
  CROSS JOIN LATERAL (
    SELECT comid, geom
    FROM river_edges
    WHERE ST_DWithin(geom::geography, d.geom::geography, 200)
    ORDER BY ST_Distance(geom::geography, d.geom::geography)
    LIMIT 1
  ) r
) sub
WHERE d.id = sub.dam_id;

-- 7. Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_campgrounds_nearest_comid ON water_access.campgrounds(nearest_comid);
CREATE INDEX IF NOT EXISTS idx_access_points_nearest_comid ON water_access.access_points_clean(nearest_comid);
CREATE INDEX IF NOT EXISTS idx_waterfalls_nearest_comid ON water_access.waterfalls(nearest_comid);
CREATE INDEX IF NOT EXISTS idx_rapids_nearest_comid ON water_access.rapids(nearest_comid);
CREATE INDEX IF NOT EXISTS idx_dams_nearest_comid ON hazards_dams(nearest_comid);

-- 8. Check results
SELECT 'campgrounds' as table_name, COUNT(*) as total, COUNT(nearest_comid) as with_comid FROM water_access.campgrounds
UNION ALL
SELECT 'access_points', COUNT(*), COUNT(nearest_comid) FROM water_access.access_points_clean
UNION ALL
SELECT 'waterfalls', COUNT(*), COUNT(nearest_comid) FROM water_access.waterfalls
UNION ALL
SELECT 'rapids', COUNT(*), COUNT(nearest_comid) FROM water_access.rapids
UNION ALL
SELECT 'dams', COUNT(*), COUNT(nearest_comid) FROM hazards_dams;
