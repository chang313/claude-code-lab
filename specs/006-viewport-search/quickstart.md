# Quickstart: 006-viewport-search

## Overview

Remove the 45-result search cap and show all matching restaurants within the visible map area. Users pan/zoom the map, tap "Search this area" to re-search the visible region.

## Setup

```bash
cd /Users/parkchanghyeon/github/006-viewport-search
pnpm install
pnpm dev
```

Requires `.env.local` with Kakao API keys and Supabase credentials (same as main branch).

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/kakao.ts` | Add `rect` param to `searchByKeyword`, add `viewportSearch` function with pagination |
| `src/lib/search-expansions.ts` | No changes |
| `src/app/search/page.tsx` | Add viewport state tracking, "Search this area" button, viewport search flow |
| `src/components/MapView.tsx` | No changes (onBoundsChange already exists) |
| `src/components/BottomSheet.tsx` | No changes |

## New Files

| File | Purpose |
|------|---------|
| `src/components/SearchThisAreaButton.tsx` | Floating button component |
| `src/components/ErrorToast.tsx` | Dismissible error notification (if not already exists) |

## Build Sequence

1. Extend `searchByKeyword` with `rect` parameter support
2. Create `viewportSearch` function (pagination + dedup + cap)
3. Add viewport state tracking to search page
4. Add "Search this area" button component
5. Wire button to viewport search flow
6. Add error toast for failed searches
7. Write tests

## Key Technical Decisions

- **`rect` parameter** for bounding-box queries (not radius)
- **Pagination per expanded term** (3 pages × 15 = 45 per term, 5 terms max = 225 before dedup)
- **300 result cap** to prevent performance issues
- **Button-triggered** re-search (not auto-refresh)
- **Initial search preserves auto-fit** behavior; button appears only after user moves map
