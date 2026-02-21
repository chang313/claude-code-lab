# Data Model: 006-viewport-search

## Entities

### Bounds (new)

Represents the geographic bounding box of the map viewport.

| Field | Type   | Description                    |
| ----- | ------ | ------------------------------ |
| sw    | LatLng | Southwest corner of viewport   |
| ne    | LatLng | Northeast corner of viewport   |

### LatLng (existing)

| Field | Type   | Description |
| ----- | ------ | ----------- |
| lat   | number | Latitude    |
| lng   | number | Longitude   |

### KakaoPlace (existing, unchanged)

No schema changes. The existing `KakaoPlace` type already contains all fields needed for viewport-based search results (id, place_name, x, y, distance, etc.).

### KakaoSearchResponse (existing, unchanged)

The `meta.is_end` and `meta.pageable_count` fields are already present and will be used for pagination logic (fetching all pages until `is_end === true`).

## State Changes (Search Page)

### New State Variables

| Variable            | Type               | Default     | Purpose                                                   |
| ------------------- | ------------------ | ----------- | --------------------------------------------------------- |
| currentQuery        | string \| null     | null        | Active search query (null = no active search)             |
| lastSearchedBounds  | Bounds \| null     | null        | Viewport bounds used for the most recent search           |
| currentBounds       | Bounds \| null     | null        | Current map viewport bounds (updated on map idle)         |
| showSearchButton    | boolean (derived)  | false       | `currentQuery !== null && currentBounds !== lastSearchedBounds` |
| viewportError       | string \| null     | null        | Error message from failed viewport search (for toast)     |

### Modified State Variables

| Variable  | Change                                                                 |
| --------- | ---------------------------------------------------------------------- |
| results   | Now updated by both initial search and "Search this area" re-searches  |
| isLoading | Now also set during viewport re-search                                 |

## Relationships

```
SearchPage
  ├── currentQuery ──→ gates viewport search (must be non-null)
  ├── currentBounds ←── MapView.onBoundsChange()
  ├── lastSearchedBounds ──→ compared against currentBounds to derive showSearchButton
  └── results ──→ markers (MapView) + list (BottomSheet)
```

## No Database Changes

This feature is entirely client-side. No Supabase schema changes, no new tables, no RLS policy updates. All data comes from the Kakao Local API and lives in React component state.
