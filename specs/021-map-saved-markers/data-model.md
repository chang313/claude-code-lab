# Data Model: 021-map-saved-markers

**Date**: 2026-02-22

## Schema Changes

**No database migration required.** This feature reads existing data from the `restaurants` table.

## Existing Entities Used

### restaurants (existing table — no changes)

| Column | Type | Usage in this feature |
|--------|------|----------------------|
| id | UUID | Internal PK |
| user_id | UUID | Filter by current user (RLS) |
| kakao_place_id | TEXT | Match against search results for merge |
| name | TEXT | Marker info window display |
| lat | FLOAT | Marker position |
| lng | FLOAT | Marker position |
| star_rating | INTEGER NULL | NULL = wishlist marker, 1-5 = visited marker |
| category | TEXT | Info window secondary text |

### Query for Map Markers

```sql
-- Fetch all saved restaurants for the current user (RLS filters by user_id)
SELECT kakao_place_id, name, lat, lng, star_rating, category
FROM restaurants
ORDER BY created_at DESC;
```

No viewport filtering at the DB level — client-side filtering is sufficient for <200 rows.

## New TypeScript Types

### SavedMarkerData

```typescript
interface SavedMarkerData {
  kakaoPlaceId: string;
  name: string;
  lat: number;
  lng: number;
  starRating: number | null;  // null = wishlist, 1-5 = visited
  category: string;
}
```

### Extended MapMarker

```typescript
// Current interface (unchanged for backward compat):
interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  name: string;
  isWishlisted: boolean;
}

// Extended with marker type:
type MarkerType = "search" | "wishlist" | "visited";

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  name: string;
  markerType: MarkerType;       // replaces isWishlisted
  starRating?: number | null;   // for visited markers
  category?: string;            // for info window
}
```

## State Transitions

```
[Not Saved] --addToWishlist--> [Wishlist Marker (blue)]
[Wishlist Marker] --addRating--> [Visited Marker (orange)]
[Visited Marker] --moveToWishlist--> [Wishlist Marker (blue)]
[Any Saved] --delete--> [Not Saved / Search Result Marker (red)]
```

Marker appearance updates reactively via query invalidation (existing `invalidateRestaurants()` pattern).
