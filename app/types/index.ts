// Route and map related types

export interface ElevationPoint {
  dist_m: number;
  elev_m: number;
  gradient_ft_mi?: number;
  classification?: string;
}

export interface SteepSection {
  start_m: number;
  end_m: number;
  gradient_ft_mi: number;
  classification: string;
}

export interface DirectionInfo {
  is_upstream: boolean;
  upstream_segments: number;
  impossible_segments: number;
  paddle_speed_mph: number;
  paddle_speed_ms: number;
}

export interface LiveConditions {
  nwm_segments: number;
  erom_segments: number;
  nwm_coverage_percent: number;
  data_timestamp: string | null;
  avg_velocity_mph: number | null;
  min_velocity_mph?: number;
  max_velocity_mph?: number;
  avg_streamflow_cfs: number | null;
  baseline_velocity_mph: number;
  baseline_float_time_s: number;
  baseline_float_time_h: number;
  time_diff_s: number;
  time_diff_percent: number;
  flow_status: 'low' | 'normal' | 'high' | null;
}

export interface RouteStats {
  distance_m: number;
  distance_mi: number;
  float_time_h: number;
  float_time_s: number;
  has_impossible_segments?: boolean;
  elev_start_m: number | null;
  elev_end_m: number | null;
  elev_drop_ft: number;
  elev_gain_ft?: number;
  gradient_ft_mi: number;
  segment_count: number;
  waterways: string[];
  flow_condition: string;
  flow_multiplier: number;
  elevation_profile: ElevationPoint[];
  steep_sections: SteepSection[];
  direction?: DirectionInfo;
  live_conditions: LiveConditions;
}

export interface SnapResult {
  node_id: string;
  comid: number;
  gnis_name: string | null;
  stream_order: number;
  distance_m: number;
  snap_point: { lng: number; lat: number };
  node_point: { lng: number; lat: number };
}

export interface RouteResult {
  route: GeoJSON.FeatureCollection;
  stats: RouteStats;
  warnings?: string[];
  path: { nodes: string[]; comids: number[] };
}

export type FlowCondition = 'low' | 'normal' | 'high';
export type BasemapStyle = 'outdoors' | 'satellite' | 'dark';
export type PersonaMode = 'whitewater' | 'explorer' | 'floater' | 'lake';

// Lake mode specific types
export type LakeDrawingMode = 'waypoint' | 'freehand';

export interface LakeWaypoint {
  id: string;
  lng: number;
  lat: number;
  index: number;
}

export interface LakeRoute {
  waypoints: LakeWaypoint[];
  geojson: GeoJSON.FeatureCollection | null;
  distance_mi: number;
  paddle_time_min: number;
}
