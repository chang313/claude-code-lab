# Implementation Plan: Viewport-Based Search Results

**Branch**: `006-viewport-search` | **Date**: 2026-02-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-viewport-search/spec.md`

## Summary

Remove the 45-result search cap by using the Kakao Local API `rect` parameter for bounding-box viewport queries with full pagination (3 pages × 15 results per expanded term, up to 5 terms = 225 max before dedup, capped at 300). Add a "Search this area" button that appears when the user pans/zooms the map, allowing explicit re-search within the current viewport. Initial search preserves the current auto-fit behavior.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 15 (App Router), React 19, Tailwind CSS 4, Kakao Maps SDK, Kakao Local REST API
**Storage**: N/A (no database changes — client-side feature only)
**Testing**: Vitest (unit), Playwright (E2E — limited by OAuth requirement)
**Target Platform**: Mobile-first web (responsive)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Search results within 2 seconds of button tap; map interactive during loading
**Constraints**: Kakao API max 45 results per query (3 pages × 15). `rect` and `x/y/radius` are mutually exclusive. No new dependencies.
**Scale/Scope**: Up to 300 results displayed simultaneously on map

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | No new abstractions beyond `viewportSearch`. Type annotations for all new params/state. |
| II. Testing Standards | PASS | Tests for `viewportSearch` pagination, dedup, `rect` parameter, button visibility logic. |
| III. UX Consistency | PASS | "Search this area" button follows established map app patterns. Error toast follows existing notification style. Loading indicator reuses existing pattern. |
| IV. Performance | PASS | 300 result cap prevents unbounded rendering. Pagination limited to 3 pages per term. No auto-refresh (button-triggered only). |
| V. Simplicity | PASS | No new dependencies. Reuses existing `onBoundsChange`, `searchByKeyword`, dedup logic. Single new function `viewportSearch`. |

**Gate result**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/006-viewport-search/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0: API research & decisions
├── data-model.md        # Phase 1: State model changes
├── quickstart.md        # Phase 1: Build guide
├── contracts/           # Phase 1: Function contracts
│   └── viewport-search.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── search/
│       └── page.tsx          # MODIFY: viewport state, button, re-search flow
├── components/
│   ├── MapView.tsx           # UNCHANGED (onBoundsChange already exists)
│   ├── BottomSheet.tsx       # UNCHANGED
│   ├── SearchThisAreaButton.tsx  # NEW: floating button component
│   └── ErrorToast.tsx        # NEW: dismissible error notification
├── lib/
│   ├── kakao.ts              # MODIFY: add rect param, viewportSearch function
│   └── search-expansions.ts  # UNCHANGED
└── types/
    └── index.ts              # MODIFY: add Bounds type export if not already there

tests/
└── unit/
    ├── viewport-search.test.ts   # NEW: viewportSearch pagination, dedup, cap
    └── search-button.test.ts     # NEW: button visibility logic
```

**Structure Decision**: Single web application. All changes within existing `src/` structure. Two new components, one new lib function, state changes in search page. No backend changes.

## Complexity Tracking

No violations to justify. All changes follow existing patterns.
