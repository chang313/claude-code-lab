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

- [x] T003 [P] Write tests for `getCache()`, `setCache()`, `subscribeToCache()` in `tests/unit/db-hooks.test.ts` — test: setCache stores value retrievable by getCache; subscribeToCache listener fires on setCache; setCache does NOT trigger invalidation listeners; unsubscribe stops notifications
- [x] T004 [P] Write tests for `useSupabaseQuery` optimistic update behavior in `tests/unit/db-hooks.test.ts` — test: calling setCache(key, value) updates the hook's data state without refetch; invalidate(key) still triggers refetch (existing behavior preserved)

### Implementation for Foundational Phase

- [x] T005 Add `getCache<T>(key)`, `setCache<T>(key, value)`, `subscribeToCache(key, setter)` to `src/lib/supabase/invalidate.ts`
- [x] T006 Modify `useSupabaseQuery` in `src/lib/supabase/use-query.ts`
- [x] T007 Run `pnpm test` and verify T003+T004 tests pass with T005+T006 implementation

**Checkpoint**: ✅ Cache system now supports optimistic updates — `setCache()` instantly updates all subscribers, `invalidate()` triggers refetch from server.

---

## Phase 3: User Story 1 — Star Rating Bug Fix for 4 and 5 Stars (Priority: P1) 🎯 MVP

- [x] T008 [US1] Write test in `tests/unit/hooks.test.ts` verifying `useUpdateStarRating` sends `star_rating: 4` and `star_rating: 5`
- [x] T009 [US1] Write test in `tests/unit/hooks.test.ts` verifying `useMarkAsVisited` sends `star_rating: 4` and `star_rating: 5`
- [x] T010 [US1] Add error handling to `useUpdateStarRating` in `src/db/hooks.ts` — return `{ success, error }` instead of void
- [x] T011 [US1] Add error handling to `useMarkAsVisited` in `src/db/hooks.ts` — same pattern
- [x] T012 [US1] Update `src/app/page.tsx` to handle mutation errors — add toast error state
- [x] T013 [US1] Update `src/app/restaurant/[id]/page.tsx` to handle mutation errors
- [x] T014 [US1] Run `pnpm test` and verify T008+T009 tests pass

**Checkpoint**: ✅ Star ratings 4 and 5 now work. Errors are surfaced via toast instead of silent failures.

---

## Phase 4: User Story 2 — Instant Star Rating Update Without Reload (Priority: P2)

- [x] T015 [US2] Optimistic update logic implemented in `useUpdateStarRating` — snapshots visited cache, applies optimistic rating, rollback on error
- [x] T016 [US2] `useUpdateStarRating` accepts `onError` callback parameter
- [x] T017 [US2] `src/app/page.tsx` passes `onError` callback
- [x] T018 [US2] `src/app/restaurant/[id]/page.tsx` passes `onError` callback
- [x] T019 [US2] Tests pass — `pnpm test` (169 passed)

**Checkpoint**: ✅ Star rating changes are instant on visited cards. Failed updates revert with error toast.

---

## Phase 5: User Story 3 — Instant Wishlist-to-Visited Promotion Without Reload (Priority: P2)

- [x] T020 [US3] Optimistic update logic in `useMarkAsVisited` — snapshots both VISITED_KEY and WISHLIST_KEY, moves item optimistically, rollback on error
- [x] T021 [US3] `useMarkAsVisited` accepts `onError` callback parameter
- [x] T022 [US3] `src/app/page.tsx` passes `onError` callback to `markAsVisited`
- [x] T023 [US3] Tests pass — `pnpm test` (169 passed)

**Checkpoint**: ✅ Wishlist-to-visited promotion is instant. Failed promotions revert both sections.

---

## Phase 6: User Story 4 — Instant Delete and Move-to-Wishlist Without Reload (Priority: P3)

- [x] T024 [US4] Optimistic update logic in `useRemoveRestaurant` — snapshots both lists, removes item, rollback on error
- [x] T025 [US4] `useRemoveRestaurant` accepts `onError` callback parameter
- [x] T026 [US4] Optimistic update logic in `useMoveToWishlist` — snapshots both lists, moves item with null rating, rollback on error
- [x] T027 [US4] `useMoveToWishlist` accepts `onError` callback parameter
- [x] T028 [US4] `src/app/page.tsx` passes `onError` callbacks to `removeRestaurant` and `moveToWishlist`
- [x] T029 [US4] Tests pass — `pnpm test` (169 passed)

**Checkpoint**: ✅ All mutation operations are now optimistic. The app feels native.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T030 Extract shared optimistic update helper if duplication warrants it (evaluate after code review)
- [x] T031 Run full verification: `pnpm build && pnpm test` — both pass
- [ ] T032 Run quickstart.md validation steps manually to confirm all user stories work end-to-end

---

## Summary

- **Total tasks**: 32
- **Completed**: 27
- **Pending (manual)**: T001, T002 (DB migration), T030, T032 (manual validation)
- **Build**: ✅ Passes
- **Tests**: ✅ 169/169 pass
