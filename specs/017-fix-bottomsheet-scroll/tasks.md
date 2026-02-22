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

- [x] T001 Create test file `tests/unit/bottomsheet.test.tsx` with test setup (jsdom, React Testing Library imports, BottomSheet mock render helper)

**Checkpoint**: Test infrastructure ready

---

## Phase 2: User Story 1 - Scroll Through All Results in Expanded Sheet (Priority: P1) MVP

**Goal**: Users can scroll through every search result in the expanded bottom sheet without content being hidden behind the bottom navigation bar.

**Independent Test**: Search for 10+ results, expand the sheet, scroll to verify every result is visible and the last card sits fully above the nav bar.

### Tests for User Story 1

- [x] T002 [US1] Write test: BottomSheet outer div uses flexbox column layout (`flex flex-col`) in `tests/unit/bottomsheet.test.tsx`
- [x] T003 [US1] Write test: BottomSheet scroll container uses `flex-1` and `overflow-y-auto` classes in `tests/unit/bottomsheet.test.tsx`
- [x] T004 [US1] Write test: BottomSheet scroll container has bottom padding for nav bar (`pb-20`) in `tests/unit/bottomsheet.test.tsx`

### Implementation for User Story 1

- [x] T005 [US1] Change BottomSheet outer div from `height: "100%"` to `height: "100dvh"` and add `flex flex-col` classes in `src/components/BottomSheet.tsx`
- [x] T006 [US1] Replace scroll container `style={{ height: "calc(100% - 2.5rem)" }}` with `flex-1 min-h-0` classes and change `pb-24` to `pb-20` in `src/components/BottomSheet.tsx`
- [x] T007 [US1] Verify tests T002-T004 pass (green)

**Checkpoint**: Users can now scroll through all results in expanded sheet. MVP complete.

---

## Phase 3: User Story 2 - Drag Bottom Sheet Smoothly Between States (Priority: P2)

**Goal**: Dragging the bottom sheet handle from any state produces smooth, continuous movement without visual jumps.

**Independent Test**: Drag the sheet handle from expanded state downward — it should follow the finger from 20% position, not jump to 70%.

### Tests for User Story 2

- [x] T008 [US2] Write test: `handleTouchMove` uses `currentTranslateY.current` (not hardcoded "peek") as drag base in `tests/unit/bottomsheet.test.tsx`

### Implementation for User Story 2

- [x] T009 [US2] Fix `handleTouchMove` in `src/components/BottomSheet.tsx`: replace `getTranslateY("peek")` with `currentTranslateY.current` for drag base calculation
- [x] T010 [US2] Verify test T008 passes (green)

**Checkpoint**: Dragging the sheet from any state now follows the finger smoothly.

---

## Phase 4: User Story 3 - Bottom Sheet Layering (Priority: P3)

**Goal**: Bottom navigation bar and bottom sheet layer correctly — neither obscures the other's interactive elements.

**Independent Test**: Expand the bottom sheet with many results. The nav bar should be tappable in peek/hidden states; in expanded state, the sheet overlays the nav but content has sufficient bottom padding.

### Tests for User Story 3

- [x] T011 [US3] Write test: BottomNav uses `z-20` class (not `z-40`) in `tests/unit/bottomsheet.test.tsx`

### Implementation for User Story 3

- [x] T012 [US3] Change BottomNav z-index from `z-40` to `z-20` in `src/components/BottomNav.tsx`
- [x] T013 [US3] Verify test T011 passes (green)

**Checkpoint**: Layering is correct across all sheet states.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all fixes

- [x] T014 Run full test suite (`pnpm test`) to ensure no regressions
- [x] T015 Run build verification (`tsc --noEmit && pnpm build`) to ensure type safety
- [ ] T016 Manual verification on mobile viewport: test all three sheet states with 20+ search results

---

## Notes

- All tests target `tests/unit/bottomsheet.test.tsx` (single test file for this small fix)
- US1 and US2 modify the same file (`BottomSheet.tsx`) but different sections — minimal conflict risk
- US3 modifies a separate file (`BottomNav.tsx`) — fully parallelizable
- Total: 16 tasks, 3 user stories, 2 files modified, 1 test file created
