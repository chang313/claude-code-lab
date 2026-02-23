# Data Model: Adjust Map Icons to Circular Shape

## No Data Model Changes

This feature is a purely visual/UI change. No database tables, columns, relationships, or migrations are affected.

### Unchanged Entities

- **`MarkerType`** (`"search" | "wishlist" | "visited"`): No changes to type definition or usage.
- **`SavedMarkerData`**: No changes to the data shape used by marker merge logic.
- **`MapMarker` interface** (in MapView.tsx): No changes to the interface — `markerType`, `lat`, `lng`, `name`, `starRating`, `category` remain the same.

### What Changes (Code Only)

| Item | Before | After |
|------|--------|-------|
| `MARKER_SVGS` constant | 28×40 teardrop SVGs | 20×20 circular SVGs |
| `MarkerImage` size | `Size(28, 40)` | `Size(20, 20)` |
| `MarkerImage` anchor | Default (bottom-center) | `Point(10, 10)` (center) |
| TypeScript types | No `Point` type | Add `Point` constructor type |
