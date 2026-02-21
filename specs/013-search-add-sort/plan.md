# Implementation Plan: Search Add & Sort

**Branch**: `013-search-add-sort` | **Date**: 2026-02-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-search-add-sort/spec.md`

## Summary

Two improvements to the search experience: (1) enhance the existing marker detail card with a star rating selector so users can rate restaurants at the time of adding from the map, and (2) change search result ordering from distance-first to relevance-first for both keyword and viewport searches. The marker detail card already has an add-to-wishlist button — this feature extends it with star rating and changes the underlying sort behavior.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16 (App Router), React 19, Tailwind CSS 4, Kakao Maps SDK, Kakao Local REST API, Supabase
**Storage**: Supabase Postgres with RLS (existing `restaurants` table — no schema changes)
**Testing**: Vitest + React Testing Library (unit tests in `tests/unit/`)
**Target Platform**: Mobile-first web app (browser)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Sort/re-render within 1 second for up to 300 results
**Constraints**: Mobile-first UI, existing component patterns, Kakao API sort parameter (`accuracy` | `distance`)
**Scale/Scope**: Single user session, up to 300 search results per query

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Minimal changes to 2 existing files. No new abstractions. No dead code introduced. |
| II. Testing Standards | PASS | Unit tests for sort behavior change and star rating flow. Tests written before implementation. |
| III. UX Consistency | PASS | Reuses existing RestaurantCard component and design patterns. Star selector follows existing 1-3 star pattern from wishlist. |
| IV. Performance Requirements | PASS | Deduplication of 300 results is O(n). No new API calls. Client-side distance computation is trivial. |
| V. Simplicity | PASS | 2 files modified, ~30 lines changed. No new dependencies, patterns, or abstractions. |

**Gate result**: ALL PASS. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/013-search-add-sort/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (no schema changes)
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (files to modify)

```text
src/
├── lib/
│   └── kakao.ts                    # Change sort param from "distance" to "accuracy"
│                                   #   - smartSearch(): line ~123
│                                   #   - viewportSearch(): line ~155
│                                   #   - deduplicateAndSort(): preserve insertion order
├── app/
│   └── search/
│       └── page.tsx                # Add star rating state + selector to detail card
│                                   #   - Add selectedRating state
│                                   #   - Render star selector in detail card area
│                                   #   - Pass rating to handleAdd()
└── components/
    └── StarSelector.tsx            # New: reusable 1-3 star selector (small component)

tests/
└── unit/
    ├── search-sort.test.ts         # New: tests for relevance sort behavior
    └── star-selector.test.ts       # New: tests for star rating on add
```

**Structure Decision**: Existing Next.js App Router structure. Only 2 production files modified (`kakao.ts`, `search/page.tsx`) plus 1 small new component (`StarSelector.tsx`). No structural changes.

## Key Implementation Details

### Change 1: Sort Parameter (P2 — Relevance Sort)

**Current behavior** (`src/lib/kakao.ts`):
- `smartSearch()` passes `sort: "distance"` to Kakao API when user location is available
- `viewportSearch()` passes `sort: "distance"` when userLocation is available
- `deduplicateAndSort()` sorts results by distance (ascending)

**New behavior**:
- Both functions pass `sort: "accuracy"` (or omit sort param, as accuracy is the API default)
- `deduplicateAndSort()` preserves insertion order (first result from primary query term ranked highest)
- Distance field is still populated by the Kakao API when `x`, `y` coordinates are provided, regardless of sort parameter
- Existing `formatDistance()` continues to work for distance labels

**Why this works**: `Promise.allSettled` preserves query order. The original query term runs first, expanded terms follow. Deduplication keeps the first occurrence, so the original term's relevance ranking is preserved.

### Change 2: Star Rating on Detail Card (P3)

**Current behavior** (`src/app/search/page.tsx`):
- `handleAdd(place)` calls `addRestaurant(place, 1)` — hardcoded rating of 1
- Detail card renders RestaurantCard with add button but no star selector

**New behavior**:
- Add `selectedRating` state (default 1)
- Render a compact star selector (1-3 stars) next to the add button in the detail card area
- `handleAdd(place)` uses `selectedRating` instead of hardcoded 1
- Reset `selectedRating` to 1 when `selectedPlace` changes

### Change 3: Existing Add-from-Map (P1 — Already Works)

The marker detail card already renders a RestaurantCard with `variant="search-result"` that includes the "+ 맛집 추가" button and "✓ 저장됨" saved state. **No changes needed for P1 functionality.** The existing code at `search/page.tsx` lines 185-201 already handles this flow.

## Complexity Tracking

No violations to justify. All changes are minimal and use existing patterns.
