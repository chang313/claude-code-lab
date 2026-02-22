# Hook API Contracts: 021-map-saved-markers

## New Hook: useSavedRestaurantsForMap

**File**: `src/db/hooks.ts`

```typescript
/**
 * Fetches all saved restaurants for the current user with minimal fields
 * needed for map marker rendering.
 *
 * Returns: SavedMarkerData[] — all saved restaurants (wishlist + visited)
 * Cache key: "restaurants:map-markers"
 * Invalidation: triggers on invalidateRestaurants()
 */
function useSavedRestaurantsForMap(): {
  data: SavedMarkerData[];
  isLoading: boolean;
}
```

**Query**:
```
supabase
  .from("restaurants")
  .select("kakao_place_id, name, lat, lng, star_rating, category")
  .eq("user_id", userId)   // explicit filter (RLS defense-in-depth)
  .order("created_at", { ascending: false })
```

**Returns**: Array of `SavedMarkerData` mapped from DB rows.

## Modified Interface: MapMarker

**File**: `src/components/MapView.tsx`

Before:
```typescript
interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  name: string;
  isWishlisted: boolean;
}
```

After:
```typescript
type MarkerType = "search" | "wishlist" | "visited";

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  name: string;
  markerType: MarkerType;
  starRating?: number | null;
  category?: string;
}
```

## Modified Component: MapView

**New props**:
```typescript
interface MapViewProps {
  center?: { lat: number; lng: number };
  markers: MapMarker[];
  fitBounds?: { lat: number; lng: number }[];
  onMarkerClick: (id: string) => void;
  onBoundsChange?: (bounds: Bounds) => void;
  className?: string;
}
```

Props interface unchanged — behavior changes are internal:
- Marker rendering selects icon based on `markerType`
- Info window content shows star rating for visited markers

## New Component: SavedMarkersToggle

**File**: `src/components/SavedMarkersToggle.tsx`

```typescript
interface SavedMarkersToggleProps {
  isVisible: boolean;
  onToggle: () => void;
}
```

Renders a floating button (top-right of map area) with:
- Filled bookmark icon when `isVisible === true`
- Outline bookmark icon when `isVisible === false`

## Marker Merge Logic (search page)

**File**: `src/app/search/page.tsx`

```typescript
// Pseudocode for marker merge
const savedSet = new Map(savedMarkers.map(s => [s.kakaoPlaceId, s]));

const mergedMarkers = results.map(result => {
  const saved = savedSet.get(result.id);
  if (saved) {
    return {
      id: result.id,
      lat: parseFloat(result.y),
      lng: parseFloat(result.x),
      name: result.place_name,
      markerType: saved.starRating !== null ? "visited" : "wishlist",
      starRating: saved.starRating,
      category: result.category_name,
    };
  }
  return {
    id: result.id,
    lat: parseFloat(result.y),
    lng: parseFloat(result.x),
    name: result.place_name,
    markerType: "search" as const,
  };
});

// Add saved markers not in search results (if toggle is on)
if (showSavedMarkers) {
  const searchIds = new Set(results.map(r => r.id));
  const additionalSaved = savedMarkers
    .filter(s => !searchIds.has(s.kakaoPlaceId))
    .filter(s => isInViewport(s, currentBounds))
    .map(s => ({
      id: s.kakaoPlaceId,
      lat: s.lat,
      lng: s.lng,
      name: s.name,
      markerType: s.starRating !== null ? "visited" : "wishlist",
      starRating: s.starRating,
      category: s.category,
    }));
  mergedMarkers.push(...additionalSaved);
}
```
