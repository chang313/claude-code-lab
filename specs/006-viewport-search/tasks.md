# Tasks: Viewport-Based Search Results

**Input**: Design documents from `/specs/006-viewport-search/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included per Constitution Principle II (TDD required).

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Type definitions and shared infrastructure

- [x] T001 Export `Bounds` type (`{ sw: LatLng; ne: LatLng }`) in `src/types/index.ts`
- [x] T002 Add `boundsEqual` utility function comparing two `Bounds` objects in `src/lib/kakao.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core search infrastructure changes that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Add `rect?: string` parameter to `searchByKeyword` function and pass it as query param (mutually exclusive with `x/y/radius`) in `src/lib/kakao.ts`
- [x] T004 Create `paginatedSearch` helper that fetches all pages (up to 3) for a single keyword query, returning combined `KakaoPlace[]`, in `src/lib/kakao.ts`
- [x] T005 Create `viewportSearch` function that runs `getExpandedTerms` → `paginatedSearch` per term with `rect` param → dedup → sort by distance → cap at 300 results, in `src/lib/kakao.ts`
- [x] T006 Update existing `smartSearch` to use `paginatedSearch` internally (removing `MAX_RESULTS = 45` cap, replacing with 300 cap) in `src/lib/kakao.ts`

**Checkpoint**: Core search functions ready — both initial search and viewport search now support full pagination

---

## Phase 3: User Story 1 — See All Results in Map Viewport (Priority: P1) 🎯 MVP

**Goal**: Remove the 45-result cap. Show all matching restaurants within the visible map area. Add "Search this area" button for viewport re-search.

**Independent Test**: Search for a food keyword, verify >45 results appear if available. Pan the map, tap "Search this area", verify results update to the new viewport.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T007 [P] [US1] Unit test for `viewportSearch` pagination (fetches all 3 pages per term) in `tests/unit/viewport-search.test.ts`
- [x] T008 [P] [US1] Unit test for `viewportSearch` dedup across expanded terms in `tests/unit/viewport-search.test.ts`
- [x] T009 [P] [US1] Unit test for `viewportSearch` 300-result cap in `tests/unit/viewport-search.test.ts`
- [x] T010 [P] [US1] Unit test for `boundsEqual` utility in `tests/unit/viewport-search.test.ts`
- [x] T011 [P] [US1] Unit test for `searchByKeyword` with `rect` parameter in `tests/unit/viewport-search.test.ts`
- [x] T012 [P] [US1] Unit test for button visibility logic (visible when bounds differ, hidden when equal or no query) in `tests/unit/search-button.test.ts`

### Implementation for User Story 1

- [x] T013 [P] [US1] Create `SearchThisAreaButton` component (floating pill button, centered on map, shows/hides based on `visible` prop, loading spinner on `isLoading`) in `src/components/SearchThisAreaButton.tsx`
- [x] T014 [US1] Add viewport state to search page: `currentQuery`, `currentBounds`, `lastSearchedBounds` state variables in `src/app/search/page.tsx`
- [x] T015 [US1] Wire `onBoundsChange` callback from MapView to update `currentBounds` state in `src/app/search/page.tsx`
- [x] T016 [US1] Derive `showSearchButton` from `currentQuery`, `currentBounds`, `lastSearchedBounds` using `boundsEqual` in `src/app/search/page.tsx`
- [x] T017 [US1] Implement `handleViewportSearch` callback: call `viewportSearch` with `currentBounds` + `currentQuery`, update `results` and `lastSearchedBounds` on success in `src/app/search/page.tsx`
- [x] T018 [US1] Update initial `handleSearch` to save `currentQuery` in state and set `lastSearchedBounds` to null (so button doesn't show until map is moved after auto-fit) in `src/app/search/page.tsx`
- [x] T019 [US1] Render `SearchThisAreaButton` in search page layout, positioned as floating overlay above the map in `src/app/search/page.tsx`

**Checkpoint**: User Story 1 fully functional — search returns >45 results, "Search this area" button works

---

## Phase 4: User Story 2 — Bottom Sheet Reflects Viewport Results (Priority: P2)

**Goal**: Bottom sheet list stays in sync with viewport search results. Tapping "Search this area" replaces the bottom sheet content.

**Independent Test**: Pan the map, tap "Search this area", verify the bottom sheet list shows only the new results (no stale items from previous search).

### Implementation for User Story 2

- [x] T020 [US2] Verify that `results` state replacement in `handleViewportSearch` automatically updates the bottom sheet list (existing binding via `results` → bottom sheet children) in `src/app/search/page.tsx`
- [x] T021 [US2] Clear `selectedPlace` state when viewport re-search is triggered (prevent stale detail card) in `src/app/search/page.tsx`
- [x] T022 [US2] Ensure marker click on new viewport results correctly selects the place and shows detail card in `src/app/search/page.tsx`

**Checkpoint**: Bottom sheet always shows current viewport results, no stale data

---

## Phase 5: User Story 3 — Loading Feedback During Viewport Changes (Priority: P3)

**Goal**: Non-blocking loading indicator during viewport search. Error toast on failure with previous results retained.

**Independent Test**: Tap "Search this area", verify loading spinner appears on button. Simulate API failure, verify previous results remain with error toast shown.

### Implementation for User Story 3

- [x] T023 [P] [US3] Create `ErrorToast` component (dismissible, auto-hide after 3 seconds, positioned at bottom above bottom sheet) in `src/components/ErrorToast.tsx`
- [x] T024 [US3] Add `viewportError` state variable to search page in `src/app/search/page.tsx`
- [x] T025 [US3] Update `handleViewportSearch` with try/catch: on error, set `viewportError` message, keep previous `results` unchanged, keep `SearchThisAreaButton` visible for retry in `src/app/search/page.tsx`
- [x] T026 [US3] Render `ErrorToast` when `viewportError` is non-null, with auto-dismiss callback clearing `viewportError` in `src/app/search/page.tsx`
- [x] T027 [US3] Add empty-state message when viewport search returns zero results (show in bottom sheet area) in `src/app/search/page.tsx`

**Checkpoint**: Loading, error, and empty states all handled gracefully

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, validation, and cross-story improvements

- [x] T028 Remove dead `MAX_RESULTS = 45` constant if still present in `src/lib/kakao.ts`
- [x] T029 Run `pnpm build` to verify no TypeScript or build errors
- [x] T030 Run `pnpm test` to verify all unit tests pass
- [ ] T031 Manual smoke test: search "chicken" in dense area, verify >45 results, pan map, tap "Search this area", verify results update

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — MVP milestone
- **US2 (Phase 4)**: Depends on Phase 3 (uses viewport search flow from US1)
- **US3 (Phase 5)**: Depends on Phase 3 (adds error handling to US1's search flow)
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: After Foundational → standalone MVP
- **US2 (P2)**: After US1 → verifies data sync (low effort, mostly existing behavior)
- **US3 (P3)**: After US1 → adds error/loading layer (independent of US2)

### Within Each User Story

- Tests FIRST → ensure they FAIL → implement → tests pass
- Shared utilities before components
- State management before UI rendering
- Core flow before error handling

### Parallel Opportunities

```
Phase 1: T001 ∥ T002 (different concerns)
Phase 2: T003 → T004 → T005 (sequential, each builds on prior)
         T006 can run after T004 (uses paginatedSearch)
Phase 3: T007-T012 all parallel (test files)
         T013 ∥ T014 (different files)
         T015 → T016 → T017 → T018 → T019 (sequential state wiring)
Phase 4: T020-T022 sequential (same file, verifying behavior)
Phase 5: T023 ∥ T024 (different files)
         T025 → T026 → T027 (sequential in same file)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (types)
2. Complete Phase 2: Foundational (search functions)
3. Complete Phase 3: User Story 1 (viewport search + button)
4. **STOP and VALIDATE**: Search returns >45 results, button works
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Search infrastructure ready
2. Add US1 → Test independently → **MVP deployed**
3. Add US2 → Verify bottom sheet sync → Deploy
4. Add US3 → Error/loading states complete → Deploy
5. Polish → Final validation

---

## Notes

- No new dependencies added (Constitution Principle V)
- `rect` and `x/y/radius` are mutually exclusive in Kakao API — never pass both
- `viewportSearch` uses `rect`, `smartSearch` uses `x/y/radius` — different geographic scoping
- 300 result cap applies to both initial and viewport searches
- `onBoundsChange` already exists in MapView — no MapView changes needed
