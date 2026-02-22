# Tasks: Fix My Restaurant List User Filter

**Input**: Design documents from `/specs/018-fix-mylist-user-filter/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included — constitution mandates test-first (Red-Green-Refactor).

**Organization**: Tasks organized by user story for independent verification.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: No project setup needed — this is a bug fix in an existing codebase. Skip to Phase 2.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No foundational infrastructure changes needed. The `restaurants` table already has `user_id` and the Supabase auth client is already available. Skip to Phase 3.

---

## Phase 3: User Story 1 - Logged-in user sees only their own restaurants (Priority: P1) MVP

**Goal**: Add `.eq("user_id", userId)` filter to all read hooks in `src/db/hooks.ts` so each user sees only their own restaurants on the main page.

**Independent Test**: Log in as two different users with different saved restaurants. Each user should see only their own list on the main page.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T001 [P] [US1] Write unit test verifying `useVisitedGrouped` includes `.eq("user_id", ...)` filter in `tests/unit/hooks-user-filter.test.ts`
- [x] T002 [P] [US1] Write unit test verifying `useWishlistGrouped` includes `.eq("user_id", ...)` filter in `tests/unit/hooks-user-filter.test.ts`
- [x] T003 [P] [US1] Write unit test verifying `useWishlist` includes `.eq("user_id", ...)` filter in `tests/unit/hooks-user-filter.test.ts`
- [x] T004 [P] [US1] Write unit test verifying `useRestaurant` includes `.eq("user_id", ...)` filter in `tests/unit/hooks-user-filter.test.ts`
- [x] T005 [P] [US1] Write unit test verifying `useIsWishlisted` includes `.eq("user_id", ...)` filter in `tests/unit/hooks-user-filter.test.ts`

### Implementation for User Story 1

- [x] T006 [US1] Add user_id filter to `useVisitedGrouped()` by calling `supabase.auth.getUser()` and adding `.eq("user_id", user.id)` in `src/db/hooks.ts`
- [x] T007 [US1] Add user_id filter to `useWishlistGrouped()` using the same auth pattern in `src/db/hooks.ts`
- [x] T008 [US1] Add user_id filter to `useWishlist()` using the same auth pattern in `src/db/hooks.ts`
- [x] T009 [US1] Add user_id filter to `useRestaurant(kakaoPlaceId)` using the same auth pattern in `src/db/hooks.ts`
- [x] T010 [US1] Add user_id filter to `useIsWishlisted(kakaoPlaceId)` using the same auth pattern in `src/db/hooks.ts`

**Checkpoint**: All 5 hooks now filter by current user. Tests pass. Main page shows only current user's restaurants.

---

## Phase 4: User Story 2 - Other users' profiles still show their restaurants (Priority: P1)

**Goal**: Verify that the profile page hooks in `src/db/profile-hooks.ts` remain unaffected and continue to show any user's restaurants.

**Independent Test**: Navigate to another user's profile page and confirm their restaurant list displays correctly.

### Tests for User Story 2

- [x] T011 [US2] Write regression test verifying `useUserVisitedGrouped(userId)` passes a specific userId (not auth user) to `.eq("user_id", userId)` in `tests/unit/hooks-user-filter.test.ts`
- [x] T012 [US2] Write regression test verifying `useUserWishlistGrouped(userId)` passes a specific userId to `.eq("user_id", userId)` in `tests/unit/hooks-user-filter.test.ts`

### Implementation for User Story 2

No implementation changes needed — `src/db/profile-hooks.ts` already correctly filters by the passed `userId` parameter. Tests confirm no regression.

**Checkpoint**: Profile hooks confirmed working. Both user stories independently verified.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and cleanup

- [x] T013 Run `pnpm build` to verify type correctness
- [x] T014 Run `pnpm test` to verify all unit tests pass
- [x] T015 Run full verification gate: `pnpm build` → `pnpm test`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 3 (US1)**: No prerequisites — can start immediately
- **Phase 4 (US2)**: Can run in parallel with Phase 3 (tests only, no implementation)
- **Phase 5 (Polish)**: Depends on Phase 3 + Phase 4 completion

### User Story Dependencies

- **User Story 1 (P1)**: Independent — core bug fix
- **User Story 2 (P1)**: Independent — regression verification only (no code changes to profile-hooks)

### Within User Story 1

- Tests T001-T005 MUST be written and FAIL before implementation T006-T010
- Implementation tasks T006-T010 modify the same file (`src/db/hooks.ts`) so they are sequential, not parallel

### Parallel Opportunities

- T001-T005 (all test tasks) can be written in parallel (same file but different test blocks)
- Phase 3 and Phase 4 tests can run in parallel (different hook files)
- T011-T012 (US2 regression tests) can run in parallel with T001-T005 (US1 tests)

---

## Parallel Example: User Story 1

```bash
# Write all tests together (same file, different describe blocks):
Task: T001-T005 "Write unit tests for all 5 hooks in tests/unit/hooks-user-filter.test.ts"

# Then implement sequentially (same file):
Task: T006 "Add user_id filter to useVisitedGrouped"
Task: T007 "Add user_id filter to useWishlistGrouped"
Task: T008 "Add user_id filter to useWishlist"
Task: T009 "Add user_id filter to useRestaurant"
Task: T010 "Add user_id filter to useIsWishlisted"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Write tests T001-T005 → confirm they FAIL
2. Implement T006-T010 in `src/db/hooks.ts` → confirm tests PASS
3. **STOP and VALIDATE**: Run `/verify-build`
4. Ready for PR

### Incremental Delivery

1. US1: Fix 5 hooks → test → verify build (MVP!)
2. US2: Regression tests → confirm no profile page breakage
3. Polish: Full verification gate → commit → PR

---

## Notes

- All 5 hook modifications are in the same file (`src/db/hooks.ts`) — commit as one atomic change
- Reference pattern: `src/db/profile-hooks.ts` lines 171-208 (correct implementation)
- Auth pattern reference: `src/db/hooks.ts` lines 126-129 (`useAddRestaurant`)
- Mock pattern reference: `tests/unit/recommendation-hooks.test.ts` (chainable Supabase mock)
- Cache keys remain unchanged — `invalidateRestaurants()` compatibility preserved
