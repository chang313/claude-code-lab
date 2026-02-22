# Tasks: Eliminate Loading Flash on Wishlist Tab Mutations

**Input**: Design documents from `/specs/025-optimistic-tab-updates/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, quickstart.md

**Tests**: Included per constitution Principle II (Testing Standards).

**Organization**: All 4 user stories share a single root cause (`useSupabaseQuery` sets `isLoading = true` on every revalidation). They are resolved by the same fix, so tasks are organized around the single shared implementation rather than per-story phases.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Tests (Red Phase)

**Purpose**: Write failing tests that verify the desired loading behavior before implementing the fix.

- [x] T001 [US1] Write unit test: `useSupabaseQuery` should set `isLoading = true` only on initial fetch (no data yet) in `tests/unit/use-query.test.ts`
- [x] T002 [US1] Write unit test: `useSupabaseQuery` should keep `isLoading = false` during revalidation when data already exists in `tests/unit/use-query.test.ts`
- [x] T003 [US1] Write unit test: `useSupabaseQuery` should still update data after background revalidation completes in `tests/unit/use-query.test.ts`

**Checkpoint**: All 3 tests should FAIL (red) since the fix is not yet implemented.

---

## Phase 2: Implementation (Green Phase) — Covers US1, US2, US3, US4

**Purpose**: Implement stale-while-revalidate in `useSupabaseQuery` to resolve all 4 user stories.

**Goal**: Modify `useSupabaseQuery` so that `isLoading` is only `true` during the initial fetch. During revalidation (when data already exists), `isLoading` stays `false` and existing data remains visible.

**Independent Test**: After this phase, all acceptance scenarios from US1–US4 are satisfied — star rating updates, move-to-wishlist, mark-as-visited, and delete operations no longer trigger a loading flash.

- [x] T004 [US1] Add `hasDataRef` to track whether data has been loaded at least once, and make `setIsLoading(true)` conditional on `!hasDataRef.current` in `src/lib/supabase/use-query.ts`
- [x] T005 [US1] Set `hasDataRef.current = true` after successful data fetch in `src/lib/supabase/use-query.ts`

**Checkpoint**: All 3 tests from Phase 1 should now PASS (green). Run `pnpm test` to verify.

---

## Phase 3: Polish & Verification

**Purpose**: Verify the fix works across the full application and doesn't break existing behavior.

- [x] T006 Run `pnpm build` to verify no type errors or build failures
- [x] T007 Run `pnpm test` to verify all existing tests still pass
- [ ] T008 Manual verification per quickstart.md: test star rating, move-to-wishlist, mark-as-visited, delete, and initial page load

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Tests)**: No dependencies — start immediately
- **Phase 2 (Implementation)**: Depends on Phase 1 (tests must exist and fail first)
- **Phase 3 (Polish)**: Depends on Phase 2 completion

### User Story Resolution

All 4 user stories share a single root cause and are resolved by the same fix:

- **US1 (Star Rating Update)**: Resolved by T004–T005
- **US2 (Move to Wishlist)**: Resolved by T004–T005 (same `useSupabaseQuery` fix)
- **US3 (Mark as Visited)**: Resolved by T004–T005 (same `useSupabaseQuery` fix)
- **US4 (Delete)**: Resolved by T004–T005 (same `useSupabaseQuery` fix)

### Parallel Opportunities

- T001, T002, T003 are in the same file but sequentially dependent (each test builds context)
- T004, T005 are in the same file and must be sequential
- T006, T007 can run in parallel after Phase 2

---

## Implementation Strategy

### MVP (Single Change)

1. Write 3 tests in `tests/unit/use-query.test.ts` (T001–T003)
2. Verify tests FAIL
3. Add `hasDataRef` and conditional loading in `src/lib/supabase/use-query.ts` (T004–T005)
4. Verify tests PASS
5. Run full build + test suite (T006–T007)
6. Manual verification (T008)

This is a single-file fix that resolves all user stories simultaneously. No incremental delivery needed — the fix is atomic.

---

## Notes

- Total tasks: 8
- Files modified: 1 (`src/lib/supabase/use-query.ts`)
- Files created: 1 (`tests/unit/use-query.test.ts`)
- No new dependencies
- No database changes
- All user stories resolved by same fix
