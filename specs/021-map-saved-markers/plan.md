# Implementation Plan: Map Saved Markers

**Branch**: `021-map-saved-markers` | **Date**: 2026-02-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/021-map-saved-markers/spec.md`

## Summary

Display the current user's saved restaurants as markers on the Kakao Map with visual distinction between wishlist (blue, no rating) and visited (orange/gold, with star rating). Saved markers are visible by default, with a toggle to hide them. When a saved restaurant also appears in search results, the saved marker replaces the search result marker. No database changes required — feature reads existing `restaurants` table data.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16 (App Router), React 19, Kakao Maps SDK, Supabase client (`@supabase/ssr`)
**Storage**: Supabase Postgres (existing `restaurants` table, no migration needed)
**Testing**: Vitest + React Testing Library
**Target Platform**: Mobile-first web (Chrome, Safari mobile)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Markers render within 2s of map open; smooth panning with 200 markers
**Constraints**: Client-side only (no server components needed); Kakao Maps SDK domain validation
**Scale/Scope**: Typical user has <200 saved restaurants; viewport filtering on client

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Single-responsibility: new hook, new component, extended existing ones |
| II. Testing Standards | PASS | Tests planned for hook, merge logic, toggle behavior |
| III. UX Consistency | PASS | Floating toggle follows map control conventions; marker colors chosen for colorblind accessibility |
| IV. Performance | PASS | <200 rows client-filtered; no N+1; single Supabase query |
| V. Simplicity | PASS | No new DB tables, no new dependencies, minimal new components (1 toggle) |

## Project Structure

### Documentation (this feature)

```text
specs/021-map-saved-markers/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: technical decisions
├── data-model.md        # Phase 1: entity/type definitions
├── quickstart.md        # Phase 1: build guide
├── contracts/
│   └── hooks-api.md     # Phase 1: hook and component API contracts
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── MapView.tsx              # MODIFY: extend MapMarker, custom icons, info window
│   └── SavedMarkersToggle.tsx   # NEW: toggle button component
├── db/
│   └── hooks.ts                 # MODIFY: add useSavedRestaurantsForMap()
├── types/
│   └── index.ts                 # MODIFY: add SavedMarkerData, MarkerType
└── app/
    └── search/
        └── page.tsx             # MODIFY: merge markers, add toggle state

tests/
└── unit/
    └── saved-markers-hooks.test.ts  # NEW: hook + merge logic tests
```

**Structure Decision**: Follows existing single-app structure. One new component file (`SavedMarkersToggle.tsx`), one new test file. All other changes modify existing files.

## Phase 1 Design Summary

### Data Flow

```
Supabase (restaurants table)
  │
  ├─ useSavedRestaurantsForMap() → SavedMarkerData[]
  │                                    │
  │                                    ▼
  │                            search/page.tsx
  │                            ┌─────────────────┐
  │                            │ Merge Logic:     │
  Kakao API (search results)──►│ search results + │──► MapMarker[]
                               │ saved markers    │     (with markerType)
                               │ (saved wins)     │
                               └─────────────────┘
                                        │
                                        ▼
                                   MapView.tsx
                                 ┌──────────────┐
                                 │ Render with   │
                                 │ custom icons: │
                                 │ 🔴 search     │
                                 │ 🔵 wishlist   │
                                 │ 🟠 visited    │
                                 └──────────────┘
```

### Key Implementation Details

1. **Custom Marker Icons**: SVG data URIs encoded as base64, passed to `kakao.maps.MarkerImage`. Three variants: red (search), blue (wishlist), orange (visited). Size: 28x40px.

2. **Marker Merge**: `useMemo` in search page combines two sources. Search results checked against `savedSet` Map (keyed by `kakao_place_id`). Matched items get saved marker type. Unmatched saved items added if within viewport bounds and toggle is on.

3. **Info Window Enhancement**: Visited markers show star rating as "★★★★☆" text. Wishlist markers show "♡ 가고 싶은 곳". Search results show existing "저장됨" logic.

4. **Toggle State**: `useState<boolean>(true)` in search page (default visible per clarification). Passed to `SavedMarkersToggle` component. When false, saved-only markers excluded from merge; already-in-search saved markers still show saved style (they're in search results regardless).

### Constitution Re-check (Post Phase 1)

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | No dead code; types exported from index.ts |
| II. Testing | PASS | Tests cover hook, merge logic, toggle |
| III. UX Consistency | PASS | Marker colors accessible; toggle discoverable |
| IV. Performance | PASS | Single query + client filter; SVG markers cached |
| V. Simplicity | PASS | No abstractions beyond what's needed; 1 new component |

## Complexity Tracking

No constitution violations to justify.
