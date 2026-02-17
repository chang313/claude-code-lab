# Quickstart: Smart Search Implementation

## Build Sequence

### Phase 1: Foundation (can be tested independently)

1. **Extend `searchByKeyword`** — Add `radius` and `sort` parameters to the existing Kakao API wrapper (`src/lib/kakao.ts`). Non-breaking change; existing callers unaffected.

2. **Create `formatDistance`** utility — Pure function to format meters → "350m" / "1.2km" (`src/lib/format-distance.ts`).

3. **Pass user coordinates to search** — Modify `SearchPage` to pass `center` (already available from geolocation) as `x`/`y` to search calls. Verify `distance` field appears in API responses.

### Phase 2: Semantic Expansion

4. **Create expansion dictionary** — Static mapping of 12 food categories with trigger keywords and search terms (`src/lib/search-expansions.ts`).

5. **Create `smartSearch` orchestrator** — New function that calls `getExpandedTerms`, fires parallel queries, merges, deduplicates, and sorts results (`src/lib/kakao.ts`).

6. **Wire `smartSearch` into SearchPage** — Replace `searchByKeyword` call with `smartSearch` in the search handler.

### Phase 3: UI Enhancements

7. **Display distance on RestaurantCard** — Add optional `distance` prop to show formatted distance label on each result card.

8. **Handle no-location gracefully** — When coordinates unavailable, omit x/y/radius/sort from queries; hide distance labels.

9. **Empty state for no nearby results** — Show "no nearby results" message when 5km radius returns zero results.

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/search-expansions.ts` | Expansion dictionary + lookup function |
| `src/lib/format-distance.ts` | Distance formatting utility |

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/kakao.ts` | Add `radius`/`sort` params to `searchByKeyword`; add `smartSearch` function |
| `src/app/search/page.tsx` | Use `smartSearch`, pass coordinates, handle loading/empty states |
| `src/components/RestaurantCard.tsx` | Add optional `distance` prop for display |

## Key Technical Decisions

- **No new dependencies**: All functionality uses existing Kakao API features + vanilla TypeScript
- **No database changes**: Entirely client-side enhancement
- **No breaking changes**: `searchByKeyword` signature extended with optional params
- **Parallel queries via `Promise.allSettled`**: Resilient to partial failures
- **5km radius via API `radius` param**: Server-side filtering, no client-side distance calculation
