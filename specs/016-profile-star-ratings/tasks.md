# Tasks: Profile Star Ratings

**Input**: Design documents from `/specs/016-profile-star-ratings/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: No setup needed — existing project structure is used as-is.

(No tasks — project already initialized with all required dependencies.)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No foundational work needed — `StarRating` component already supports `readonly` mode, and profile queries already return `star_rating` data.

(No tasks — all prerequisites already exist in the codebase.)

---

## Phase 3: User Story 1 - View Star Ratings on Other Users' Profiles (Priority: P1) MVP

**Goal**: Display read-only star ratings on visited restaurant cards when viewing another user's profile page.

**Independent Test**: Navigate to `/users/[id]` → visited restaurant cards show filled yellow stars (1-3) matching saved rating; stars are not interactive.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T001 [US1] Write unit tests for readonly star rating display on visited cards in `tests/unit/restaurant-card-star-rating.test.tsx` — test that: (a) visited variant without `onStarChange` renders `StarRating` with `readonly` and correct value, (b) wishlist variant does not render `StarRating`, (c) visited variant with `onStarChange` still renders editable stars (regression)

### Implementation for User Story 1

- [x] T002 [US1] Modify `RestaurantCard` in `src/components/RestaurantCard.tsx` — add a new conditional render: when `variant === "visited"` and `onStarChange` is NOT provided, render `<StarRating value={restaurant.starRating} readonly size="sm" />`. Keep existing editable star logic for when `onStarChange` IS provided.

- [x] T003 [US1] Run tests and verify T001 tests now pass: `pnpm test`

**Checkpoint**: At this point, star ratings are visible on other users' profile pages (read-only).

---

## Phase 4: User Story 2 - View Star Ratings on Own Profile (Priority: P2)

**Goal**: Verify star ratings also display on own profile page, consistent with other user view.

**Independent Test**: Navigate to `/my` or `/users/[own-id]` → visited restaurants show same readonly star ratings.

### Implementation for User Story 2

- [x] T004 [US2] Verify own profile displays star ratings — no additional code changes needed since `UserProfileView` renders `RestaurantCard` with `variant="visited"` identically for own and other profiles. Add a test case in `tests/unit/restaurant-card-star-rating.test.tsx` confirming the same component behavior applies to own-profile context.

**Checkpoint**: Both user stories are complete — star ratings visible on any profile page.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Build verification and cleanup

- [x] T005 Run full verification gates: `tsc --noEmit` → `pnpm build` → `pnpm test`
- [x] T006 Run quickstart.md validation — manually verify star ratings appear on profile pages

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Skipped — no setup needed
- **Phase 2 (Foundational)**: Skipped — no foundational work needed
- **Phase 3 (US1)**: Can start immediately. T001 → T002 → T003 (sequential: test-first)
- **Phase 4 (US2)**: Depends on Phase 3 (same component change covers both stories)
- **Phase 5 (Polish)**: Depends on Phase 4

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies — can start immediately
- **User Story 2 (P2)**: Depends on US1 (same code change serves both stories)

### Within Each User Story

- Tests MUST be written and FAIL before implementation (T001 before T002)
- Implementation is a single file change (T002)
- Verification confirms tests pass (T003)

### Parallel Opportunities

- T001 and T004 test writing could theoretically be parallel, but since T002 (the implementation) covers both stories, sequential execution is optimal
- This feature is too small for meaningful parallelization

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Write failing test (T001)
2. Modify `RestaurantCard.tsx` (T002)
3. Verify tests pass (T003)
4. **STOP and VALIDATE**: Star ratings visible on other profiles

### Incremental Delivery

1. T001-T003 → US1 complete → verify on other profiles
2. T004 → US2 confirmed → verify on own profile
3. T005-T006 → Full verification → ready for PR

---

## Notes

- This is a minimal feature: 1 file modified, 1 test file created, 6 total tasks
- Both user stories are served by the same code change since `UserProfileView` treats own and other profiles identically
- No database, API, or schema changes required
- Constitution compliance: test-first (Red-Green-Refactor) approach followed
