# Implementation Plan: Global Search Beyond Viewport

**Branch**: `015-global-search` | **Date**: 2026-02-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/015-global-search/spec.md`

## Summary

Modify `smartSearch` to use a local-first-with-fallback strategy: search locally (5km radius) first, and if results are insufficient (<5), retry without geographic restrictions to find results nationwide. The map already auto-fits results via `fitBounds`, so distant results from a global search will automatically reposition the map. No new components, hooks, or API endpoints needed.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16 (App Router), React 19, Kakao Maps SDK, Kakao Local REST API
**Storage**: N/A (no data model changes)
**Testing**: Vitest (unit tests in `tests/unit/`)
**Target Platform**: Mobile-first web (Safari/Chrome)
**Project Type**: Web (Next.js App Router)
**Performance Goals**: Search results within 2 seconds
**Constraints**: Kakao API rate limits (per-key), 300-result cap preserved
**Scale/Scope**: Single function modification + test updates

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Single responsibility: `smartSearch` gains fallback logic within its existing scope |
| II. Testing Standards | PASS | Tests written first (Red-Green-Refactor). Unit tests cover local-sufficient and global-fallback paths |
| III. User Experience | PASS | Loading feedback exists (<200ms spinner). No new UI components needed |
| IV. Performance | PASS | Worst case: 2x API calls (local → global). Still under 2s target. Best case: identical to current |
| V. Simplicity | PASS | Minimal change: modify one function, extract helper. No new abstractions or dependencies |

No violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/015-global-search/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: Kakao API research
├── data-model.md        # Phase 1: N/A (no schema changes)
├── quickstart.md        # Phase 1: Quick start guide
└── tasks.md             # Phase 2: Task breakdown (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── lib/
│   └── kakao.ts               # MODIFY: smartSearch fallback logic
└── app/
    └── search/
        └── page.tsx            # MODIFY: update "no results" message text

tests/
└── unit/
    ├── search-sort.test.ts     # MODIFY: add global fallback tests
    └── viewport-search.test.ts # NO CHANGE: viewport search unchanged
```

**Structure Decision**: This feature modifies existing files only. No new files, components, hooks, or modules are needed. The change is confined to `src/lib/kakao.ts` (core logic) and `src/app/search/page.tsx` (minor message update).

## Design

### Search Strategy: Local-First with Fallback

```
User enters query
  │
  ├─ Has user location?
  │   ├─ YES → Local search (radius=5000m, sort=accuracy)
  │   │   ├─ Results ≥ 5 → Return local results ✓
  │   │   └─ Results < 5 → Global search (no radius, sort=accuracy) → Return global results ✓
  │   │
  │   └─ NO → Global search (no radius, no sort) → Return results ✓
  │
  └─ Map auto-fits to result coordinates (existing fitBounds logic)
```

### Key Constants

- `LOCAL_MIN_RESULTS = 5` — threshold to decide if local results are sufficient
- `DEFAULT_RADIUS = 5000` — existing 5km local search radius (unchanged)
- `MAX_RESULTS = 300` — existing result cap (unchanged)

### Code Changes

#### 1. `src/lib/kakao.ts` — Extract helper + add fallback

Extract the existing `Promise.allSettled` search pattern into a reusable `searchAllTerms` helper:

```typescript
async function searchAllTerms(
  terms: string[],
  baseParams: Omit<Parameters<typeof paginatedSearch>[0], "query">,
): Promise<KakaoPlace[]> {
  const results = await Promise.allSettled(
    terms.map((term) => paginatedSearch({ query: term, ...baseParams })),
  );
  const all: KakaoPlace[] = [];
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    all.push(...result.value);
  }
  return all;
}
```

Then modify `smartSearch` to use the local-first-with-fallback pattern:

```typescript
const LOCAL_MIN_RESULTS = 5;

export async function smartSearch(params: {
  query: string;
  x?: string;
  y?: string;
}): Promise<KakaoPlace[]> {
  const terms = getExpandedTerms(params.query);
  const hasLocation = !!(params.x && params.y);

  if (hasLocation) {
    // Step 1: Try local search (with radius)
    const localResults = await searchAllTerms(terms, {
      x: params.x,
      y: params.y,
      radius: DEFAULT_RADIUS,
      sort: "accuracy" as const,
    });

    if (localResults.length >= LOCAL_MIN_RESULTS) {
      return deduplicateAndSort(localResults);
    }

    // Step 2: Not enough local results → global search (no radius)
    const globalResults = await searchAllTerms(terms, {
      x: params.x,
      y: params.y,
      sort: "accuracy" as const,
    });
    return deduplicateAndSort(globalResults);
  }

  // No location → global search (existing behavior)
  const results = await searchAllTerms(terms, {});
  return deduplicateAndSort(results);
}
```

**Breaking changes**: The `radius` parameter is removed from `smartSearch`'s public signature. The caller in `search/page.tsx` does not use it, so no caller changes needed.

#### 2. `src/app/search/page.tsx` — Update empty result message

Change from:
```
이 지역에서 음식점을 찾을 수 없습니다
```
To:
```
검색 결과가 없습니다
```

This reflects that global search was performed, not just local.

#### 3. `viewportSearch` — NO CHANGES

Viewport search uses `rect` (bounding box), not `radius`. It is unaffected by this change.

### Preserved Behaviors

- **Semantic expansion**: `getExpandedTerms` called identically in both local and global paths
- **Deduplication**: `deduplicateAndSort` applied to final results regardless of path
- **300-result cap**: Applied by `deduplicateAndSort` in all paths
- **Distance display**: `x,y` passed to global search, so Kakao API still computes distance
- **fitBounds**: Existing logic in `search/page.tsx` auto-pans map to fit all results
- **"Search This Area"**: Uses `viewportSearch` (unmodified), continues working after map repositioning
