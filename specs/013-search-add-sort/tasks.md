# Tasks: Search Add & Sort

**Input**: Design documents from `/specs/013-search-add-sort/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Unit tests included per constitution (Principle II: Testing Standards).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: No new project setup needed — this feature modifies existing files only. Phase is a no-op.

_(No tasks — existing project structure is sufficient)_

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No foundational/blocking tasks. All changes are isolated to specific user stories with no shared prerequisites.

_(No tasks — no schema changes, no new dependencies, no shared infrastructure)_

**Checkpoint**: Ready for user story implementation.

---

## Phase 3: User Story 1 - Add Restaurant from Map Marker (Priority: P1) — Already Implemented

**Goal**: Users can add a restaurant to their wishlist directly from the map marker detail card in 2 taps.

**Independent Test**: Search for a restaurant, tap a marker, verify the detail card shows "+ 맛집 추가" button, tap it, verify restaurant is saved and button changes to "✓ 저장됨".

**Status**: P1 is already implemented in the existing codebase. The marker detail card at `src/app/search/page.tsx` lines 185-201 already renders RestaurantCard with `variant="search-result"`, which includes the add-to-wishlist button and saved state indicator. The `handleAdd()` function and `useIsWishlistedSet()` hook handle the data flow.

- [x] T001 [US1] Verify existing add-from-map flow works correctly by manual testing: search → tap marker → detail card appears → tap "+ 맛집 추가" → saved state shows → check wishlist

**Checkpoint**: User Story 1 is already functional. Proceed to US2.

---

## Phase 4: User Story 2 - Sort Search Results by Relevance (Priority: P2)

**Goal**: All search results (keyword and viewport) are sorted by relevance (best match) instead of distance. Distance labels remain visible as supplementary info.

**Independent Test**: Search for "치킨", verify results are ordered by relevance (best match first, not nearest first). Verify distance labels still appear. Tap "이 지역 검색" and verify viewport results are also relevance-sorted.

### Tests for User Story 2

- [x] T002 [P] [US2] Write unit test for `smartSearch` relevance sort in `tests/unit/search-sort.test.ts` — verify that `smartSearch()` calls Kakao API with `sort: "accuracy"` instead of `sort: "distance"` when location is provided
- [x] T003 [P] [US2] Write unit test for `viewportSearch` relevance sort in `tests/unit/search-sort.test.ts` — verify that `viewportSearch()` calls Kakao API with `sort: "accuracy"` instead of `sort: "distance"` when userLocation is provided
- [x] T004 [P] [US2] Write unit test for `deduplicateAndSort` in `tests/unit/search-sort.test.ts` — verify results preserve insertion order (relevance ranking) instead of sorting by distance

### Implementation for User Story 2

- [x] T005 [US2] Change `smartSearch()` sort parameter from `"distance"` to `"accuracy"` in `src/lib/kakao.ts` (line ~123)
- [x] T006 [US2] Change `viewportSearch()` sort parameter from `"distance"` to `"accuracy"` in `src/lib/kakao.ts` (line ~155)
- [x] T007 [US2] Update `deduplicateAndSort()` in `src/lib/kakao.ts` to preserve insertion order instead of sorting by distance — deduplicate by `kakao_place_id` keeping first occurrence, do not re-sort

**Checkpoint**: Search results now sorted by relevance. Distance labels still visible. All T002-T004 tests pass.

---

## Phase 5: User Story 3 - Star Rating on Add (Priority: P3)

**Goal**: Users can set a 1-3 star rating when adding a restaurant from the marker detail card, rather than always defaulting to 1 star.

**Independent Test**: Tap a marker, set 3 stars on the detail card, tap "+ 맛집 추가", navigate to wishlist, verify restaurant has 3-star rating.

### Tests for User Story 3

- [x] T008 [P] [US3] Write unit test for StarSelector component in `tests/unit/star-selector.test.tsx` — renders 3 stars, default value is 1, clicking star 3 calls onChange(3), visual state reflects selected rating
- [x] T009 [P] [US3] Write unit test for rating passed to `handleAdd` in `tests/unit/star-selector.test.tsx` — verify that when `selectedRating` is 3, `addRestaurant(place, 3)` is called instead of `addRestaurant(place, 1)`

### Implementation for User Story 3

- [x] T010 [US3] ~~Create `StarSelector` component~~ SKIPPED — reused existing `StarRating` component from `src/components/StarRating.tsx`
- [x] T011 [US3] Add `selectedRating` state to search page in `src/app/search/page.tsx` — default 1, reset to 1 when `selectedPlace` changes (useEffect)
- [x] T012 [US3] Render `StarRating` in the marker detail card area in `src/app/search/page.tsx` — position below restaurant card, only visible when `!isWishlisted`
- [x] T013 [US3] Pass `selectedRating` to `handleAdd()` in `src/app/search/page.tsx` — change `addRestaurant(place)` to `addRestaurant(place, selectedRating)`

**Checkpoint**: Star rating selector works on detail card. Rating is saved correctly. All T008-T009 tests pass.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases and verification across all stories

- [x] T014 Auto-collapse bottom sheet to "peek" on marker click when expanded in `src/app/search/page.tsx` — in `handleMarkerClick`, set `sheetState` to `"peek"` if currently `"expanded"`
- [x] T015 Run full test suite (`pnpm test`) and verify no regressions — 73 tests, 8 files, all passing
- [x] T016 Run build verification (`pnpm build`) and verify no type errors — build succeeds (pre-existing tsc issues in recommendation-hooks.test.ts only)
- [ ] T017 Manual quickstart.md validation — follow all 10 test steps in `specs/013-search-add-sort/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No-op — skip
- **Foundational (Phase 2)**: No-op — skip
- **US1 (Phase 3)**: Already implemented — verify only (T001)
- **US2 (Phase 4)**: No dependencies on other stories — can start immediately
- **US3 (Phase 5)**: No dependencies on US2 — can run in parallel
- **Polish (Phase 6)**: Depends on US2 + US3 completion

### User Story Dependencies

- **User Story 1 (P1)**: Already done. Verification only.
- **User Story 2 (P2)**: Independent. Modifies `src/lib/kakao.ts` only.
- **User Story 3 (P3)**: Independent. Modifies `src/app/search/page.tsx` + creates `src/components/StarSelector.tsx`.
- **US2 and US3 touch different files** — they can be implemented in parallel.

### Within Each User Story

- Tests (T002-T004, T008-T009) MUST be written and FAIL before implementation
- Implementation tasks are sequential within each story
- Story complete before moving to polish

### Parallel Opportunities

- T002, T003, T004 can all run in parallel (same test file, different test cases)
- T008, T009 can run in parallel (same test file, different test cases)
- **US2 (Phase 4) and US3 (Phase 5) can run entirely in parallel** — they modify different files (`kakao.ts` vs `page.tsx` + `StarSelector.tsx`)

---

## Parallel Example: US2 + US3

```bash
# These two user stories can run in parallel since they touch different files:

# Agent A: User Story 2 (sort change in kakao.ts)
Task: T002 — Write test for smartSearch relevance sort
Task: T005 — Change smartSearch sort param
Task: T006 — Change viewportSearch sort param
Task: T007 — Update deduplicateAndSort

# Agent B: User Story 3 (star rating in page.tsx + StarSelector.tsx)
Task: T008 — Write test for StarSelector
Task: T010 — Create StarSelector component
Task: T011 — Add selectedRating state
Task: T012 — Render StarSelector in detail card
Task: T013 — Pass rating to handleAdd
```

---

## Implementation Strategy

### MVP First (User Story 2 Only)

1. Verify US1 already works (T001)
2. Implement US2: Change sort to relevance (T002-T007)
3. **STOP and VALIDATE**: Search results now relevance-sorted with distance labels
4. Deploy/demo if ready

### Full Feature

1. Verify US1 (T001)
2. US2: Relevance sort (T002-T007) + US3: Star rating (T008-T013) — in parallel
3. Polish (T014-T017)
4. Deploy

---

## Notes

- Total: 17 tasks (1 verification, 5 tests, 7 implementation, 4 polish)
- US1: 1 task (verification only — already implemented)
- US2: 6 tasks (3 tests + 3 implementation)
- US3: 6 tasks (2 tests + 4 implementation)
- Polish: 4 tasks
- US2 and US3 are fully parallelizable (different files)
- Suggested MVP: US1 (verify) + US2 (relevance sort) = core value delivered
