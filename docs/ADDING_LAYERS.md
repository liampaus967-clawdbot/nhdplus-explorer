# Adding Map Layers

When adding a new layer to the NHDPlus Explorer map, you need to update several files:

## Checklist

### 1. Create the layer file
- Create `app/layers/{layerName}.ts`
- Export `add{LayerName}Source()` and `add{LayerName}Backdrop()` (or `add{LayerName}Layers()`)
- Follow the existing pattern (see `campgrounds.ts` as reference)

### 2. Add to constants
Update `app/constants/index.ts`:
- Add tileset URL to `TILESETS`
- Add source layer name to `SOURCE_LAYERS`
- Add color to `COLORS` (if applicable)

### 3. Add to layer index
Update `app/layers/index.ts`:
- Import the new layer functions
- Export from the module
- Add to `addAllLayers()` in the correct order

### 4. Add POI icon (if symbol layer)
Update `app/layers/poiIcons.ts`:
- Add colors to `POI_COLORS`
- Add drawer function to `ICON_DRAWERS`
- The icon will be auto-registered as `poi-{key}`

### 5. **Add to Map Layers toggle** ⚠️
Update `app/components/Map/MapControls.tsx`:
- Add to `LayerVisibility` interface
- Add to appropriate layer group (`WATER_FEATURES`, `POINTS_OF_INTEREST`, etc.)
- Import any needed Lucide icon

### 6. Add to page.tsx
Update `app/page.tsx`:
- Add to initial `layerVisibility` state (with default on/off)
- Add to BOTH `layerMapping` objects (there are 2!)
  - One in `handleLayersChange` callback (~line 380)
  - One in the `useEffect` timeout (~line 665)

### 7. Update design file (optional)
Update `designs/icons.pen`:
- Add the icon design matching the Iteration 5 style

## Layer Order

Layers are added in this order (bottom to top):
1. Land layers (BLM, Wilderness)
2. Lakes
3. Rivers
4. POI symbols (Waterfalls, Rapids, Dams, Campgrounds, Access Points)
5. Gauges
6. Route (on top)

## Example: Adding Dams Layer

```typescript
// app/layers/dams.ts
export function addDamsSource(map: mapboxgl.Map) {
  if (map.getSource('dams')) return;
  map.addSource('dams', {
    type: 'vector',
    url: TILESETS.dams,
  });
}

export function addDamsBackdrop(map: mapboxgl.Map) {
  if (map.getLayer('dams-backdrop')) return;
  map.addLayer({
    id: 'dams-backdrop',
    type: 'symbol',
    source: 'dams',
    'source-layer': SOURCE_LAYERS.dams,
    minzoom: 8,
    layout: {
      'icon-image': 'poi-dam',
      'icon-size': [...],
      'icon-allow-overlap': false,
      'icon-anchor': 'bottom',
    },
  });
}
```
