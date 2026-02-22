# Tasks: Fix Bottom Sheet Scroll

**Input**: Design documents from `/specs/017-fix-bottomsheet-scroll/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: Included — constitution requires test-first approach (Red-Green-Refactor).

**Organization**: Tasks grouped by user story. US1 is the MVP (scroll fix). US2 and US3 can be delivered incrementally.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Create test file and verify current behavior is broken

- [ ] T001 Create test file `tests/unit/bottomsheet.test.tsx` with test setup (jsdom, React Testing Library imports, BottomSheet mock render helper)

**Checkpoint**: Test infrastructure ready

---

## Phase 2: User Story 1 - Scroll Through All Results in Expanded Sheet (Priority: P1) MVP

**Goal**: Users can scroll through every search result in the expanded bottom sheet without content being hidden behind the bottom navigation bar.

**Independent Test**: Search for 10+ results, expand the sheet, scroll to verify every result is visible and the last card sits fully above the nav bar.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T002 [US1] Write test: BottomSheet outer div uses flexbox column layout (`flex flex-col`) in `tests/unit/bottomsheet.test.tsx`
- [ ] T003 [US1] Write test: BottomSheet scroll container uses `flex-1` and `overflow-y-auto` classes in `tests/unit/bottomsheet.test.tsx`
- [ ] T004 [US1] Write test: BottomSheet scroll container has bottom padding for nav bar (`pb-20`) in `tests/unit/bottomsheet.test.tsx`

### Implementation for User Story 1

- [ ] T005 [US1] Change BottomSheet outer div from `height: "100%"` to `height: "100dvh"` and add `flex flex-col` classes in `src/components/BottomSheet.tsx`
- [ ] T006 [US1] Replace scroll container `style={{ height: "calc(100% - 2.5rem)" }}` with `flex-1 min-h-0` classes and change `pb-24` to `pb-20` in `src/components/BottomSheet.tsx`
- [ ] T007 [US1] Verify tests T002-T004 pass (green)

**Checkpoint**: Users can now scroll through all results in expanded sheet. MVP complete.

---

## Phase 3: User Story 2 - Drag Bottom Sheet Smoothly Between States (Priority: P2)

**Goal**: Dragging the bottom sheet handle from any state produces smooth, continuous movement without visual jumps.

**Independent Test**: Drag the sheet handle from expanded state downward — it should follow the finger from 20% position, not jump to 70%.

### Tests for User Story 2

- [ ] T008 [US2] Write test: `handleTouchMove` uses `currentTranslateY.current` (not hardcoded "peek") as drag base in `tests/unit/bottomsheet.test.tsx`

### Implementation for User Story 2

- [ ] T009 [US2] Fix `handleTouchMove` in `src/components/BottomSheet.tsx`: replace `getTranslateY("peek")` with `currentTranslateY.current` for drag base calculation
- [ ] T010 [US2] Verify test T008 passes (green)

**Checkpoint**: Dragging the sheet from any state now follows the finger smoothly.

---

## Phase 4: User Story 3 - Bottom Sheet Layering (Priority: P3)

**Goal**: Bottom navigation bar and bottom sheet layer correctly — neither obscures the other's interactive elements.

**Independent Test**: Expand the bottom sheet with many results. The nav bar should be tappable in peek/hidden states; in expanded state, the sheet overlays the nav but content has sufficient bottom padding.

### Tests for User Story 3

- [ ] T011 [US3] Write test: BottomNav uses `z-20` class (not `z-40`) in `tests/unit/bottomsheet.test.tsx`

### Implementation for User Story 3

- [ ] T012 [US3] Change BottomNav z-index from `z-40` to `z-20` in `src/components/BottomNav.tsx`
- [ ] T013 [US3] Verify test T011 passes (green)

**Checkpoint**: Layering is correct across all sheet states.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all fixes

- [ ] T014 Run full test suite (`pnpm test`) to ensure no regressions
- [ ] T015 Run build verification (`tsc --noEmit && pnpm build`) to ensure type safety
- [ ] T016 Manual verification on mobile viewport: test all three sheet states with 20+ search results

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 2)**: Depends on Phase 1 — core scroll fix
- **US2 (Phase 3)**: Independent of US1 (different code path in BottomSheet.tsx) — can run in parallel
- **US3 (Phase 4)**: Independent of US1/US2 (different file: BottomNav.tsx) — can run in parallel
- **Polish (Phase 5)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Setup — no dependencies on other stories
- **User Story 2 (P2)**: Can start after Setup — modifies different function in same file as US1
- **User Story 3 (P3)**: Can start after Setup — modifies different file (BottomNav.tsx)

### Parallel Opportunities

- T002, T003, T004 can be written in one pass (same test file, different test cases)
- US2 (T008-T010) and US3 (T011-T013) can run in parallel with US1 (different code paths/files)
- T005 and T006 are sequential (same file, related changes)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: US1 Tests + Implementation (T002-T007)
3. **STOP and VALIDATE**: All results scrollable in expanded sheet
4. Deploy/demo if ready

### Incremental Delivery

1. T001 → Test setup ready
2. T002-T007 → US1 complete: scroll fix (MVP)
3. T008-T010 → US2 complete: smooth drag
4. T011-T013 → US3 complete: z-index layering
5. T014-T016 → Polish: full regression + build + manual QA

---

## Notes

- All tests target `tests/unit/bottomsheet.test.tsx` (single test file for this small fix)
- US1 and US2 modify the same file (`BottomSheet.tsx`) but different sections — minimal conflict risk
- US3 modifies a separate file (`BottomNav.tsx`) — fully parallelizable
- Total: 16 tasks, 3 user stories, 2 files modified, 1 test file created
