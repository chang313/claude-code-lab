# Tasks: Change Star Rating Scale to 5

**Input**: Design documents from `/specs/019-star-rating-scale/`
**Prerequisites**: plan.md (required), spec.md (required), data-model.md, research.md, quickstart.md

**Tests**: Existing tests will be updated as part of implementation (test-first per constitution).

**Organization**: Tasks grouped by user story. US3 (preserve existing ratings) requires no separate implementation — it is verified through test assertions in US1 and US2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Foundational (Core Type Update)

**Purpose**: Update the core StarRating component that all other code depends on

- [x] T001 Update star-selector tests to expect 5 stars and test all rating values 1-5 (tests should fail against current 3-star implementation) in `tests/unit/star-selector.test.tsx`
- [x] T002 Update StarRating component props interface from `1 | 2 | 3` to `1 | 2 | 3 | 4 | 5` and render array from `[1, 2, 3]` to `[1, 2, 3, 4, 5]` in `src/components/StarRating.tsx` (T001 tests should now pass)

**Checkpoint**: StarRating component renders 5 stars, tests pass for the component in isolation

---

## Phase 2: User Story 1 - Rate a Visited Restaurant on 5-Star Scale (Priority: P1) MVP

**Goal**: Users can select ratings 1-5 on visited restaurant cards and have them persisted

**Independent Test**: Tap each of the 5 stars on a visited restaurant card; verify correct fill state and persistence

### Implementation for User Story 1

- [x] T003 [P] [US1] Update rating callback types (`onAddAsVisited`, `onStarChange`) from `1 | 2 | 3` to `1 | 2 | 3 | 4 | 5` in `src/components/RestaurantCard.tsx`
- [x] T004 [P] [US1] Update `useUpdateStarRating` and `useMarkAsVisited` parameter types from `1 | 2 | 3` to `1 | 2 | 3 | 4 | 5` in `src/db/hooks.ts`
- [x] T005 [P] [US1] Update `handleAddAsVisited` handler rating type from `1 | 2 | 3` to `1 | 2 | 3 | 4 | 5` in `src/app/search/page.tsx`
- [x] T006 [P] [US1] Update rating handler types in `src/app/restaurant/[id]/page.tsx`
- [x] T007 [P] [US1] Update rating handler types in `src/app/page.tsx` — No change needed (types are inferred from callbacks)
- [x] T008 [US1] Update restaurant-card-star-rating tests to assert 5 stars and test rating values 1-5 in `tests/unit/restaurant-card-star-rating.test.tsx`
- [x] T009 [US1] Update hooks tests to verify rating payloads accept values 4 and 5 in `tests/unit/hooks.test.ts`

**Checkpoint**: Users can rate restaurants 1-5, ratings persist, all US1 tests pass

---

## Phase 3: User Story 2 - View 5-Star Ratings on Profile Pages (Priority: P2)

**Goal**: Profile pages display read-only 5-star ratings for visited restaurants

**Independent Test**: Navigate to a profile page; verify 5 stars render in read-only mode with correct fill state

### Implementation for User Story 2

- [x] T010 [P] [US2] Update rating types in `src/db/profile-hooks.ts` — No change needed (uses `number | null`)
- [x] T011 [P] [US2] Update rating types in `src/db/recommendation-hooks.ts` — No change needed (uses `number | null`)
- [x] T012 [US2] Update recommendation-hooks tests if rating types are referenced in `tests/unit/recommendation-hooks.test.ts` — No change needed (uses `number | null`)

**Checkpoint**: Profile pages show 5-star read-only ratings correctly

---

## Phase 4: Polish & Verification

**Purpose**: Verify backward compatibility (US3), full build, and cross-cutting consistency

- [x] T013 Verify existing ratings (1, 2, 3) display correctly without rescaling — the `star-selector.test.tsx` test for value=1 already validates old ratings render correctly on the 5-star scale
- [x] T014 Run full verification: `pnpm build && pnpm test` to confirm all gates pass — 85 tests pass, build succeeds
- [x] T015 Grep codebase for any remaining `1 | 2 | 3` rating type references that were missed — 0 remaining

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately. Updates the core component.
- **US1 (Phase 2)**: Depends on Phase 1 (StarRating component must be updated first)
- **US2 (Phase 3)**: Depends on Phase 1. Can run in parallel with US1 (different files).
- **Polish (Phase 4)**: Depends on Phase 2 and Phase 3 completion.

### Within Each Phase

- Phase 2: T003-T007 are all parallelizable (different files). T008-T009 depend on T003-T007.
- Phase 3: T010-T011 are parallelizable. T012 depends on T010-T011.

### Parallel Opportunities

```text
After Phase 1 completes:
  ├── Phase 2 (US1): T003, T004, T005, T006, T007 — all in parallel
  └── Phase 3 (US2): T010, T011 — in parallel with each other AND with Phase 2
```

---

## Implementation Strategy

### MVP First (Phase 1 + Phase 2)

1. Complete Phase 1: Update StarRating component + tests
2. Complete Phase 2: Update all consuming code for US1
3. **STOP and VALIDATE**: `pnpm build && pnpm test`
4. At this point, the core 5-star rating feature is functional

### Full Delivery

1. Phase 1 → Phase 2 (MVP) → Phase 3 → Phase 4 (verification)
2. Total: 15 tasks across 4 phases
3. Estimated parallelizable: T003-T007 + T010-T011 (7 tasks simultaneously)

---

## Notes

- No new files created — all tasks modify existing files
- No database migration needed
- US3 (preserve existing ratings) has no implementation tasks — it's inherently satisfied by not rescaling data. Verification is in Phase 4 (T013).
- All `[P]` tasks touch different files with no cross-dependencies
