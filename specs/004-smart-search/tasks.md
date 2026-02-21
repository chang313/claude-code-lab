# Tasks: Smart Search

**Branch**: `004-smart-search` | **Date**: 2026-02-17
**Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md)

## Phase 1: Foundation

- [x] **T-001**: Extend `searchByKeyword` with `radius` and `sort` parameters
  - File: `src/lib/kakao.ts`
  - Add optional `radius` (number) and `sort` (string) params to function signature
  - Map them to Kakao API query params when provided
  - Non-breaking: existing callers unaffected

- [x] **T-002**: Create `formatDistance` utility
  - File: `src/lib/format-distance.ts` (NEW)
  - Pure function: meters string → "350m" / "1.2km" / undefined
  - Rules: <1000 → "{n}m", ≥1000 → "{n.n}km", empty → undefined

## Phase 2: Semantic Expansion

- [x] **T-003**: Create search expansion dictionary
  - File: `src/lib/search-expansions.ts` (NEW)
  - 12 food category entries with Korean/English triggers + brand terms
  - `getExpandedTerms(query)` function with case-insensitive matching
  - Always includes original query in returned terms

- [x] **T-004**: Create `smartSearch` orchestrator function
  - File: `src/lib/kakao.ts`
  - Depends on: T-001, T-003
  - Calls `getExpandedTerms`, fires parallel `searchByKeyword` via `Promise.allSettled`
  - Each call passes x, y, sort="distance", radius=5000, size=15
  - Merge fulfilled results, deduplicate by `id`, sort by distance, cap at 45

## Phase 3: UI Integration

- [x] **T-005**: Add distance display to RestaurantCard
  - File: `src/components/RestaurantCard.tsx`
  - Add optional `distance` prop (string, e.g., "350m")
  - Display distance label next to category text when provided

- [x] **T-006**: Wire smartSearch into SearchPage
  - File: `src/app/search/page.tsx`
  - Depends on: T-004, T-005
  - Replace `searchByKeyword` with `smartSearch`
  - Pass user coordinates (center.lng, center.lat) as x, y
  - Format distance for each result using `formatDistance`
  - Pass distance to RestaurantCard

- [x] **T-007**: Handle no-location and empty states
  - File: `src/app/search/page.tsx`
  - Depends on: T-006
  - When no coordinates: omit x/y/radius/sort (standard keyword search)
  - When results empty within 5km: show "no nearby results" message
  - Hide distance labels when location unavailable

## Phase 4: Verification

- [x] **T-008**: Manual verification against acceptance scenarios
  - Test semantic expansion: search "chicken" → verify KFC/BBQ results appear
  - Test distance sorting: verify results ordered nearest-first with distance labels
  - Test no-location fallback: deny location → verify standard search still works
  - Test empty radius: search obscure term → verify empty state message
  - Build check: `pnpm build` passes with no errors
