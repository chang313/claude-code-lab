# Tasks: Map Saved Markers

**Input**: Design documents from `/specs/021-map-saved-markers/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/hooks-api.md

**Tests**: Included — constitution requires tests for primary user scenarios.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add shared types and data hook that all user stories depend on

- [x] T001 [P] Add `SavedMarkerData` and `MarkerType` types to `src/types/index.ts`
- [x] T002 [P] Add `MAP_MARKERS_KEY` constant and register it in `invalidateRestaurants()` in `src/db/hooks.ts`
- [x] T003 Implement `useSavedRestaurantsForMap()` hook in `src/db/hooks.ts` — query `restaurants` table for `kakao_place_id, name, lat, lng, star_rating, category` with explicit `.eq("user_id", userId)` filter, return `SavedMarkerData[]`

**Checkpoint**: New types exported, hook returns saved restaurant data for current user

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend MapView to support multiple marker types — required before any user story can render correctly

**⚠️ CRITICAL**: All user stories depend on the extended MapMarker interface and custom marker rendering

- [x] T004 Replace `isWishlisted: boolean` with `markerType: MarkerType`, add optional `starRating` and `category` fields in `MapMarker` interface in `src/components/MapView.tsx`
- [x] T005 Create three SVG data URI marker icon functions (search=red, wishlist=blue+heart, visited=orange+star) as helper constants in `src/components/MapView.tsx` — use `kakao.maps.MarkerImage` with `Size(28, 40)`
- [x] T006 Update marker rendering in `MapView.tsx` `useEffect` to select `MarkerImage` based on `marker.markerType` instead of using default pin
- [x] T007 Update info window content in `MapView.tsx` — wishlist: "♡ 가고 싶은 곳", visited: "★" repeated by `starRating` value + "저장됨", search: existing behavior
- [x] T008 Update all existing `MapMarker` usages in `src/app/search/page.tsx` to use `markerType: "search"` instead of `isWishlisted` (backward compat bridge — search results default to `"search"` type)

**Checkpoint**: MapView renders different icons per markerType; existing search flow still works with `markerType: "search"`

---

## Phase 3: User Story 1 — View Saved Restaurants on Map (Priority: P1) 🎯 MVP

**Goal**: Display all of the current user's saved restaurants as markers on the map when it loads

**Independent Test**: Open the map view with saved restaurants → markers appear at correct lat/lng positions

### Tests for User Story 1

- [x] T009 [P] [US1] Write unit test for `useSavedRestaurantsForMap()` hook in `tests/unit/saved-markers-hooks.test.ts` — mock Supabase to return mix of wishlist (star_rating=null) and visited (star_rating=3) rows, assert returned `SavedMarkerData[]` maps correctly
- [x] T010 [P] [US1] Write unit test for marker merge logic in `tests/unit/saved-markers-hooks.test.ts` — extract merge function, test: (a) saved replaces search result with same kakao_place_id, (b) saved-only markers added when in viewport, (c) empty saved array returns search-only markers

### Implementation for User Story 1

- [x] T011 [US1] Extract `mergeMarkers()` utility function in `src/lib/merge-markers.ts` — accepts search results, saved data, viewport bounds, toggle state; returns unified `MapMarker[]` per contracts/hooks-api.md merge logic
- [x] T012 [US1] Wire `useSavedRestaurantsForMap()` into `src/app/search/page.tsx` — call hook, pass result to `mergeMarkers()`, replace current `markers` useMemo with merged result
- [x] T013 [US1] Add viewport filter helper `isInViewport()` in `src/lib/merge-markers.ts` in `src/app/search/page.tsx` (or alongside merge util) — check if lat/lng falls within sw/ne bounds; return true if bounds is null (show all)

**Checkpoint**: Opening the map shows saved restaurant markers at correct positions. Search results merge with saved data (saved wins).

---

## Phase 4: User Story 2 — Visually Distinguish Wishlist vs Favorite (Priority: P1)

**Goal**: Users can visually tell apart wishlist (blue) and visited (orange) markers at a glance, with enhanced info windows showing status

**Independent Test**: Save one restaurant as wishlist and one as visited → markers show different colors; tapping shows status in info window

### Tests for User Story 2

- [x] T014 [US2] Write unit test in `tests/unit/saved-markers-hooks.test.ts` — verify `mergeMarkers()` sets `markerType: "wishlist"` when `starRating === null` and `markerType: "visited"` when `starRating` is 1-5

### Implementation for User Story 2

- [x] T015 [US2] Verify the three SVG marker icons render correctly across marker types in `src/components/MapView.tsx` — ensure `kakao.maps.MarkerImage` constructor uses correct size/offset for each type (if not already working from T005/T006, fix now)
- [x] T016 [US2] Verify info window displays star rating for visited markers and "♡ 가고 싶은 곳" for wishlist markers in `src/components/MapView.tsx` (if not already working from T007, fix now)

**Checkpoint**: Blue markers for wishlist, orange markers for visited, red for search. Tapping markers shows correct status text with star rating.

---

## Phase 5: User Story 3 — Toggle Saved Markers Visibility (Priority: P2)

**Goal**: Users can toggle saved markers on/off via a floating button, defaulting to visible

**Independent Test**: Toggle button hides/shows saved markers; search result markers remain unaffected

### Tests for User Story 3

- [x] T017 [US3] Write unit test in `tests/unit/saved-markers-hooks.test.ts` — verify `mergeMarkers()` with `showSavedMarkers=false` excludes saved-only markers but still applies saved style to search-result matches

### Implementation for User Story 3

- [x] T018 [US3] Create `SavedMarkersToggle` component in `src/components/SavedMarkersToggle.tsx` — floating button with filled bookmark icon (visible) / outline bookmark icon (hidden), props: `isVisible: boolean`, `onToggle: () => void`
- [x] T019 [US3] Add `showSavedMarkers` state (`useState(true)`) in `src/app/search/page.tsx` and pass to `mergeMarkers()` to control whether saved-only markers are included
- [x] T020 [US3] Position `SavedMarkersToggle` in search page layout at `src/app/search/page.tsx` — place in top-right area below search bar, z-index between search bar (z-20) and bottom sheet (z-30)

**Checkpoint**: Toggle button appears on map. Clicking it hides/shows saved markers. Search results always visible.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, performance, and cleanup

- [x] T021 Handle edge case: marker status change while map is open — verify `invalidateRestaurants()` triggers re-fetch of `useSavedRestaurantsForMap()` data and markers update reactively in `src/app/search/page.tsx`
- [x] T022 Ensure only authenticated user's data shown — verify `useSavedRestaurantsForMap()` includes `.eq("user_id", userId)` guard (RLS defense-in-depth) in `src/db/hooks.ts`
- [x] T023 Run `pnpm build` to verify TypeScript compilation with all changes
- [x] T024 Run `pnpm test` to verify all unit tests pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T001 (types) from Phase 1
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion (extended MapMarker + custom icons)
- **User Story 2 (Phase 4)**: Depends on Phase 2 + Phase 3 (needs markers on map to verify visual distinction)
- **User Story 3 (Phase 5)**: Depends on Phase 3 (needs saved markers to toggle)
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — independently testable
- **User Story 2 (P1)**: Depends on US1 markers being on map — extends visual behavior
- **User Story 3 (P2)**: Depends on US1 markers being on map — adds toggle control

### Within Each User Story

- Tests FIRST, ensure they FAIL before implementation
- Data layer (hooks/utils) before UI components
- Core logic before integration wiring

### Parallel Opportunities

Within Phase 1:
- T001 (types) and T002 (cache key) can run in parallel

Within Phase 2:
- T004 (interface change) must come first
- T005 + T007 can run in parallel after T004 (different concerns: icons vs info windows)
- T006 depends on T005 (uses the icon functions)

Within Phase 3:
- T009 and T010 (tests) can run in parallel
- T011 and T013 can run in parallel (merge function vs viewport filter)
- T012 depends on T011 + T013 (wiring)

---

## Parallel Example: Phase 1

```bash
# These touch different sections of different files:
Task T001: "Add SavedMarkerData and MarkerType types to src/types/index.ts"
Task T002: "Add MAP_MARKERS_KEY constant in src/db/hooks.ts"
```

## Parallel Example: User Story 1

```bash
# Tests can run in parallel:
Task T009: "Unit test for useSavedRestaurantsForMap() in tests/unit/saved-markers-hooks.test.ts"
Task T010: "Unit test for marker merge logic in tests/unit/saved-markers-hooks.test.ts"

# Implementation: merge util and viewport filter are independent:
Task T011: "Extract mergeMarkers() utility function"
Task T013: "Add isInViewport() helper"
# Then wire together:
Task T012: "Wire useSavedRestaurantsForMap() into search page"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (types + hook)
2. Complete Phase 2: Foundational (MapView extends)
3. Complete Phase 3: User Story 1 (saved markers on map)
4. **STOP and VALIDATE**: Saved restaurants appear as markers on map
5. Can deploy as MVP — markers visible, one default style

### Incremental Delivery

1. Setup + Foundational → Extended MapView ready
2. Add User Story 1 → Saved markers on map → Validate → Deploy (MVP!)
3. Add User Story 2 → Visual distinction (blue/orange) → Validate → Deploy
4. Add User Story 3 → Toggle control → Validate → Deploy
5. Polish → Edge cases, verification → Final deploy

---

## Notes

- No database migration needed — all data already exists
- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Tests use existing chainable Supabase mock pattern from `tests/unit/recommendation-hooks.test.ts`
- SVG marker icons use data URIs to avoid external image hosting
- Commit after each phase checkpoint
