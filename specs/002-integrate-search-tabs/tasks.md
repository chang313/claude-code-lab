# Tasks: Integrate Search & Map Tabs

**Input**: Design documents from `/specs/002-integrate-search-tabs/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Not explicitly requested in spec. Test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Merge app code into worktree and verify baseline

- [ ] T001 Merge `001-restaurant-wishlist` branch into `002-integrate-search-tabs` worktree and run `pnpm install`
- [ ] T002 Verify `pnpm build` passes and existing functionality works

**Checkpoint**: Worktree has full app code and builds successfully

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Modify shared components that all user stories depend on

**Warning**: No user story work can begin until this phase is complete

- [ ] T003 [P] Modify SearchBar to use form submit instead of debounce — replace debounce useEffect with `<form onSubmit>`, add search icon button, remove `debounceMs` prop in `src/components/SearchBar.tsx`
- [ ] T004 [P] Add LatLngBounds auto-fit support to MapView — add `LatLngBounds` to Window type declaration, add optional `fitBounds?: { lat: number; lng: number }[]` prop, call `map.setBounds()` when fitBounds changes, make `onBoundsChange` optional in `src/components/MapView.tsx`
- [ ] T005 [P] Create BottomSheet component with 3 snap states (hidden/peek/expanded) — implement touch drag with `touchstart`/`touchmove`/`touchend`, CSS `transform: translateY()` transitions, 50px drag threshold in `src/components/BottomSheet.tsx`
- [ ] T006 Remove Map tab from BottomNav — remove `{ href: "/map", ... }` entry from tabs array (5 → 4 tabs) in `src/components/BottomNav.tsx`

**Checkpoint**: All building blocks ready — SearchBar submits on Enter/button, MapView auto-fits, BottomSheet exists, BottomNav has 4 tabs

---

## Phase 3: User Story 1 — Search and View Results on Map (Priority: P1) MVP

**Goal**: User types a keyword, presses Enter or search button, sees markers on the map and a result list in a bottom sheet

**Independent Test**: Type "pizza" → press Enter → markers appear on map + bottom sheet slides up with result cards

### Implementation for User Story 1

- [ ] T007 [US1] Rewrite search page as unified search+map page — compose SearchBar (positioned over map), MapView (full-screen), and BottomSheet with search state management (query, results, isLoading, hasSearched) in `src/app/search/page.tsx`
- [ ] T008 [US1] Wire search flow — on SearchBar submit, call `searchByKeyword()`, set results to state, pass markers to MapView, pass fitBounds coordinates to MapView for auto-fit in `src/app/search/page.tsx`
- [ ] T009 [US1] Wire bottom sheet — show BottomSheet in peek state when results arrive, render RestaurantCard list inside BottomSheet with wishlist status from `useIsWishlistedSet` in `src/app/search/page.tsx`
- [ ] T010 [US1] Handle empty/loading states — show loading indicator during search, show "No restaurants found" in bottom sheet when results are empty, show empty map with no bottom sheet before first search in `src/app/search/page.tsx`
- [ ] T011 [US1] Add geolocation for initial map center — use `navigator.geolocation.getCurrentPosition()` to center map on user location on first load, fall back to Seoul default in `src/app/search/page.tsx`

**Checkpoint**: User Story 1 fully functional — search by keyword shows results on map and in bottom sheet

---

## Phase 4: User Story 2 — Interact with Map Markers (Priority: P2)

**Goal**: User taps a map marker and sees a detail card with wishlist action

**Independent Test**: Search → tap marker → detail card appears → tap "Add to Wishlist" → restaurant saved

### Implementation for User Story 2

- [ ] T012 [US2] Add marker click handler — on marker tap, set selectedPlace state, show detail RestaurantCard as floating card above bottom sheet in `src/app/search/page.tsx`
- [ ] T013 [US2] Wire wishlist action from detail card — call `useAddRestaurant()` on "Add to Wishlist" tap, update marker visual state (wishlisted indicator), dismiss detail card after adding in `src/app/search/page.tsx`

**Checkpoint**: User Stories 1 AND 2 both work — search + markers + marker interaction with wishlist

---

## Phase 5: User Story 3 — Add to Wishlist from Result List (Priority: P3)

**Goal**: User adds restaurants to wishlist directly from the bottom sheet result list

**Independent Test**: Search → scroll bottom sheet list → tap "Add to Wishlist" on a card → button updates to "Saved"

### Implementation for User Story 3

- [ ] T014 [US3] Wire wishlist action from result list cards — add `onAddToWishlist` handler to each RestaurantCard in bottom sheet list, call `useAddRestaurant()`, update `isWishlisted` state reactively in `src/app/search/page.tsx`

**Checkpoint**: All 3 user stories functional — full search + map + marker interaction + list wishlist

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, route removal, and final validation

- [ ] T015 Delete the old map page at `src/app/map/page.tsx`
- [ ] T016 Run `pnpm build` and verify no errors, all routes correct (no `/map` route in output)
- [ ] T017 Run quickstart.md manual verification checklist (6-step verification flow)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Phase 2 completion
  - US1 (Phase 3): No dependencies on other stories
  - US2 (Phase 4): Depends on US1 (needs search results + markers to exist)
  - US3 (Phase 5): Depends on US1 (needs search results in bottom sheet to exist)
- **Polish (Phase 6)**: Depends on all user stories being complete

### Within Phase 2 (Parallel Opportunities)

- T003, T004, T005 can all run in parallel (different files)
- T006 can also run in parallel (different file)

### Within Each User Story

- Tasks within a story are sequential (all modify `src/app/search/page.tsx`)

---

## Parallel Example: Phase 2 (Foundational)

```bash
# All 4 foundational tasks can run in parallel:
Task: "Modify SearchBar to form submit in src/components/SearchBar.tsx"
Task: "Add LatLngBounds auto-fit to MapView in src/components/MapView.tsx"
Task: "Create BottomSheet component in src/components/BottomSheet.tsx"
Task: "Remove Map tab from BottomNav in src/components/BottomNav.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (merge + install)
2. Complete Phase 2: Foundational (SearchBar, MapView, BottomSheet, BottomNav)
3. Complete Phase 3: User Story 1 (unified search + map page)
4. **STOP and VALIDATE**: Search works, map shows markers, bottom sheet shows results
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Building blocks ready
2. Add User Story 1 → Search + map working (MVP!)
3. Add User Story 2 → Marker interaction with wishlist
4. Add User Story 3 → List-based wishlist addition
5. Polish → Delete old route, final build validation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US2 and US3 both depend on US1 (need search results to exist) but are independent of each other
- All user story tasks touch `src/app/search/page.tsx` — cannot be parallelized within a story
- Commit after each completed phase
