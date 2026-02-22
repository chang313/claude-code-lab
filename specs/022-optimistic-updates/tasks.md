# Tasks: Optimistic Updates & Star Rating Bug Fix

**Input**: Design documents from `/specs/022-optimistic-updates/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/cache-api.md

**Tests**: Included per constitution (TDD: Red-Green-Refactor). Tests MUST be written and fail before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Database migration prerequisite — must be applied before any code changes

- [ ] T001 Apply star_rating CHECK constraint migration in Supabase Dashboard SQL Editor (see `specs/022-optimistic-updates/data-model.md` for SQL: `ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_star_rating_check; ALTER TABLE restaurants ADD CONSTRAINT restaurants_star_rating_check CHECK (star_rating IS NULL OR (star_rating >= 1 AND star_rating <= 5));`)
- [ ] T002 Verify constraint fix by manually inserting a test row with star_rating=5 in Supabase SQL Editor, then deleting it

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend the cache system to support optimistic updates. MUST be complete before ANY user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational Phase

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T003 [P] Write tests for `getCache()`, `setCache()`, `subscribeToCache()` in `tests/unit/db-hooks.test.ts` — test: setCache stores value retrievable by getCache; subscribeToCache listener fires on setCache; setCache does NOT trigger invalidation listeners; unsubscribe stops notifications
- [ ] T004 [P] Write tests for `useSupabaseQuery` optimistic update behavior in `tests/unit/db-hooks.test.ts` — test: calling setCache(key, value) updates the hook's data state without refetch; invalidate(key) still triggers refetch (existing behavior preserved)

### Implementation for Foundational Phase

- [ ] T005 Add `getCache<T>(key)`, `setCache<T>(key, value)`, `subscribeToCache(key, setter)` to `src/lib/supabase/invalidate.ts` — add internal `Map<string, unknown>` for cache store and `Map<string, Set<(value: unknown) => void>>` for cache setters; `setCache` stores value and notifies cache setter subscribers; `getCache` reads from cache store; update `invalidate()` and `invalidateAll()` to NOT clear cache store (refetch will overwrite naturally)
- [ ] T006 Modify `useSupabaseQuery` in `src/lib/supabase/use-query.ts` — on successful `execute()`, also call `setCache(key, result)` to populate the cache store; subscribe to cache set events via `subscribeToCache(key, setter)` so `setData` updates immediately when `setCache` is called externally; preserve existing invalidation subscription
- [ ] T007 Run `pnpm test` and verify T003+T004 tests pass with T005+T006 implementation

**Checkpoint**: Cache system now supports optimistic updates — `setCache()` instantly updates all subscribers, `invalidate()` triggers refetch from server.

---

## Phase 3: User Story 1 — Star Rating Bug Fix for 4 and 5 Stars (Priority: P1) 🎯 MVP

**Goal**: Users can save star ratings of 4 and 5. The database constraint is widened (Phase 1) and mutation error handling prevents silent failures.

**Independent Test**: Tap the 4th or 5th star on a visited restaurant card → rating persists after page refresh.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T008 [US1] Write test in `tests/unit/hooks.test.ts` verifying `useUpdateStarRating` sends `star_rating: 4` and `star_rating: 5` to the database (assert the update payload shape includes values 4 and 5)
- [ ] T009 [US1] Write test in `tests/unit/hooks.test.ts` verifying `useMarkAsVisited` sends `star_rating: 4` and `star_rating: 5` to the database when promoting from wishlist

### Implementation for User Story 1

- [ ] T010 [US1] Add error handling to `useUpdateStarRating` in `src/db/hooks.ts` — wrap the await in try/catch and return `{ success: boolean; error?: string }` instead of void; catch block should not swallow errors silently
- [ ] T011 [US1] Add error handling to `useMarkAsVisited` in `src/db/hooks.ts` — same pattern as T010
- [ ] T012 [US1] Update `src/app/page.tsx` to handle mutation errors from `updateStarRating` and `markAsVisited` — add toast error state and render `Toast` component with type="error" when mutation fails
- [ ] T013 [US1] Update `src/app/restaurant/[id]/page.tsx` to handle mutation errors from `updateStarRating` — add toast error state for the detail page star update
- [ ] T014 [US1] Run `pnpm test` and verify T008+T009 tests pass

**Checkpoint**: Star ratings 4 and 5 now work. Errors are surfaced via toast instead of silent failures.

---

## Phase 4: User Story 2 — Instant Star Rating Update Without Reload (Priority: P2)

**Goal**: Star rating changes on visited cards update the UI instantly (optimistic), with rollback on server error.

**Independent Test**: Tap a star on a visited card → stars update instantly without loading flash; simulate network error → stars revert to previous value.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T015 [US2] Write test in `tests/unit/optimistic-updates.test.ts` — test: `useUpdateStarRating` calls `setCache` with optimistically updated visited groups before awaiting server; on server success, `invalidateRestaurants()` is called; on server error, `setCache` is called with the snapshot (rollback) and error toast callback is invoked

### Implementation for User Story 2

- [ ] T016 [US2] Refactor `useUpdateStarRating` in `src/db/hooks.ts` to support optimistic updates — before server call: snapshot `getCache(VISITED_KEY)`, compute optimistic groups with updated star_rating, call `setCache(VISITED_KEY, optimisticGroups)`; on error: `setCache(VISITED_KEY, snapshot)` + invoke onError callback; in finally: `invalidateRestaurants()` to reconcile
- [ ] T017 [US2] Accept an optional `onError?: (msg: string) => void` callback parameter in `useUpdateStarRating` to decouple error display from the hook
- [ ] T018 [US2] Update `src/app/page.tsx` — pass `onError` callback to `useUpdateStarRating` that sets toast error state
- [ ] T019 [US2] Update `src/app/restaurant/[id]/page.tsx` — pass `onError` callback and add toast error rendering
- [ ] T020 [US2] Run `pnpm test` and verify T015 tests pass

**Checkpoint**: Star rating changes are instant on visited cards. Failed updates revert with error toast.

---

## Phase 5: User Story 3 — Instant Wishlist-to-Visited Promotion Without Reload (Priority: P2)

**Goal**: Tapping a star on a wishlist card moves it to the visited section instantly, with rollback on error.

**Independent Test**: Tap a star on a wishlist card → card moves from wishlist to visited section without loading; simulate error → card returns to wishlist.

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T021 [US3] Write test in `tests/unit/optimistic-updates.test.ts` — test: `useMarkAsVisited` snapshots both VISITED_KEY and WISHLIST_KEY caches; optimistically removes item from wishlist groups and adds to visited groups with the new rating; on error, restores both snapshots

### Implementation for User Story 3

- [ ] T022 [US3] Refactor `useMarkAsVisited` in `src/db/hooks.ts` for optimistic updates — snapshot both `getCache(WISHLIST_KEY)` and `getCache(VISITED_KEY)`; compute optimistic groups: remove item from wishlist groups, add to visited groups with rating; call `setCache` for both keys; on error: restore both snapshots + invoke onError; in finally: `invalidateRestaurants()`
- [ ] T023 [US3] Accept optional `onError?: (msg: string) => void` callback in `useMarkAsVisited`
- [ ] T024 [US3] Update `src/app/page.tsx` — pass `onError` callback to `markAsVisited` calls in the wishlist section
- [ ] T025 [US3] Run `pnpm test` and verify T021 tests pass

**Checkpoint**: Wishlist-to-visited promotion is instant. Failed promotions revert both sections.

---

## Phase 6: User Story 4 — Instant Delete and Move-to-Wishlist Without Reload (Priority: P3)

**Goal**: Delete and move-to-wishlist operations update the UI instantly, with rollback on error.

**Independent Test**: Delete a visited card → disappears instantly; move to wishlist → card moves sections instantly.

### Tests for User Story 4

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T026 [P] [US4] Write test in `tests/unit/optimistic-updates.test.ts` — test: `useRemoveRestaurant` snapshots the relevant groups cache; optimistically removes the item; on error, restores snapshot
- [ ] T027 [P] [US4] Write test in `tests/unit/optimistic-updates.test.ts` — test: `useMoveToWishlist` snapshots both VISITED_KEY and WISHLIST_KEY; optimistically moves item from visited to wishlist with null rating; on error, restores both snapshots

### Implementation for User Story 4

- [ ] T028 [US4] Refactor `useRemoveRestaurant` in `src/db/hooks.ts` for optimistic updates — snapshot relevant groups, remove item optimistically, rollback on error
- [ ] T029 [US4] Accept optional `onError?: (msg: string) => void` callback in `useRemoveRestaurant`
- [ ] T030 [US4] Refactor `useMoveToWishlist` in `src/db/hooks.ts` for optimistic updates — snapshot both visited and wishlist groups, move item optimistically (set rating to null), rollback on error
- [ ] T031 [US4] Accept optional `onError?: (msg: string) => void` callback in `useMoveToWishlist`
- [ ] T032 [US4] Update `src/app/page.tsx` — pass `onError` callbacks to `removeRestaurant` and `moveToWishlist` calls
- [ ] T033 [US4] Run `pnpm test` and verify T026+T027 tests pass

**Checkpoint**: All mutation operations are now optimistic. The app feels native.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T034 Extract shared optimistic update helper function in `src/db/hooks.ts` to reduce duplication across the 4 mutation hooks (e.g., `withOptimistic(snapshotKeys, transformFn, serverFn, onError)`) — only if 3+ hooks share the same snapshot-setCache-try-catch-finally pattern
- [ ] T035 Run full verification: `pnpm build && pnpm test` to ensure all gates pass
- [ ] T036 Run quickstart.md validation steps manually to confirm all user stories work end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No code dependencies — manual DB migration in Supabase Dashboard
- **Foundational (Phase 2)**: No dependency on Phase 1 for code, but Phase 1 DB migration should be applied first for integration testing
- **US1 (Phase 3)**: Depends on Phase 1 (DB migration) + Phase 2 (cache system)
- **US2 (Phase 4)**: Depends on Phase 2 (cache system) + Phase 3 (error handling pattern established)
- **US3 (Phase 5)**: Depends on Phase 2 (cache system). Can run in parallel with US2 if error pattern from US1 is available.
- **US4 (Phase 6)**: Depends on Phase 2 (cache system). Can run in parallel with US2/US3.
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: MVP — establishes error handling pattern reused by US2-US4
- **US2 (P2)**: Uses error handling pattern from US1; introduces optimistic update pattern
- **US3 (P2)**: Independent from US2 but benefits from optimistic pattern established in US2
- **US4 (P3)**: Independent from US2/US3 but follows same optimistic pattern

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Hook changes before page-level changes
- Run `pnpm test` at each phase checkpoint

### Parallel Opportunities

- T003 + T004 (foundational tests) can run in parallel
- T008 + T009 (US1 tests) can run in parallel
- T026 + T027 (US4 tests) can run in parallel
- US2 + US3 + US4 implementation can run in parallel after Phase 2 completes (if staffed)

---

## Parallel Example: Foundational Phase

```bash
# Launch both foundational test tasks together:
Task: "Write getCache/setCache/subscribeToCache tests in tests/unit/db-hooks.test.ts"
Task: "Write useSupabaseQuery optimistic behavior tests in tests/unit/db-hooks.test.ts"
```

## Parallel Example: User Story 4

```bash
# Launch both US4 test tasks together:
Task: "Write useRemoveRestaurant optimistic tests in tests/unit/optimistic-updates.test.ts"
Task: "Write useMoveToWishlist optimistic tests in tests/unit/optimistic-updates.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: DB migration (manual, Supabase Dashboard)
2. Complete Phase 2: Cache system extension (T003–T007)
3. Complete Phase 3: Star rating bug fix (T008–T014)
4. **STOP and VALIDATE**: Tap stars 4 and 5, verify persistence
5. Deploy if ready — critical bug is fixed

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready
2. Add US1 → Star rating bug fixed → Deploy (MVP!)
3. Add US2 → Star updates are instant → Deploy
4. Add US3 → Wishlist promotion is instant → Deploy
5. Add US4 → Delete/move is instant → Deploy (fully native feel)
6. Polish → Extract shared helper, final validation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each phase checkpoint
- The `onError` callback pattern decouples error display (Toast) from mutation logic — hooks stay pure, pages own UI feedback
- `useAddRestaurant` is NOT optimistically updated (no existing cache entry to transform — it's an INSERT, not an UPDATE)
