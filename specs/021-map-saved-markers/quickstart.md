# Quickstart: 021-map-saved-markers

## Prerequisites

- Node.js 18+, pnpm
- Kakao Developer Console access (Maps SDK JS key registered for localhost)
- Supabase project with `restaurants` table (no new migrations needed)

## Setup

```bash
# From repo root, switch to worktree
cd ../021-map-saved-markers
pnpm install
pnpm dev
```

## What to Build (in order)

### 1. New hook: `useSavedRestaurantsForMap()`
- **File**: `src/db/hooks.ts`
- Fetches all user's saved restaurants with map-relevant fields
- Add `"restaurants:map-markers"` to invalidation keys

### 2. Extend `MapMarker` interface
- **File**: `src/components/MapView.tsx`
- Replace `isWishlisted: boolean` with `markerType: "search" | "wishlist" | "visited"`
- Add optional `starRating` and `category` fields

### 3. Custom marker icons in MapView
- **File**: `src/components/MapView.tsx`
- Create SVG data URI marker images for each `markerType`
- Use `kakao.maps.MarkerImage` to apply custom icons
- Update info window content to show star rating for visited markers

### 4. Merge logic in search page
- **File**: `src/app/search/page.tsx`
- Call `useSavedRestaurantsForMap()` alongside existing search state
- Merge saved markers with search result markers (saved takes precedence)
- Add viewport-filtered saved-only markers when no search overlap

### 5. Toggle component
- **File**: `src/components/SavedMarkersToggle.tsx` (new)
- Floating button with bookmark icon
- Wire into search page state (`showSavedMarkers` boolean, default `true`)

### 6. Tests
- **File**: `tests/unit/saved-markers-hooks.test.ts` (new)
- Test `useSavedRestaurantsForMap()` with mock Supabase
- Test marker merge logic (search + saved dedup)
- Test toggle state behavior

## Verification

```bash
pnpm build    # type-check + bundle
pnpm test     # unit tests
```

## Key Files

| File | Change |
|------|--------|
| `src/db/hooks.ts` | Add `useSavedRestaurantsForMap()` |
| `src/components/MapView.tsx` | Extend `MapMarker`, add custom icons, update info window |
| `src/app/search/page.tsx` | Merge markers, add toggle state |
| `src/components/SavedMarkersToggle.tsx` | New toggle button component |
| `src/types/index.ts` | Add `SavedMarkerData`, `MarkerType` types |
| `tests/unit/saved-markers-hooks.test.ts` | New test file |
