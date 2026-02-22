# Tasks: Global Search Beyond Viewport

**Input**: Design documents from `/specs/015-global-search/`
**Prerequisites**: plan.md (required), spec.md (required), research.md

**Tests**: Included per constitution Principle II (Red-Green-Refactor).

**Organization**: Tasks grouped by user story. US1 and US2 share the same implementation (local-first-with-fallback in `smartSearch`) but have distinct test cases.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Foundational (Refactor Prerequisite)

**Purpose**: Extract shared helper from existing code. No behavioral change — pure refactor.

- [x] T001 Extract `searchAllTerms` helper function from duplicated `Promise.allSettled` pattern in `smartSearch` and `viewportSearch` in `src/lib/kakao.ts`. The helper takes `terms: string[]` and `baseParams` (all `paginatedSearch` params except `query`), runs `Promise.allSettled` over all terms, and collects fulfilled results. Refactor both `smartSearch` and `viewportSearch` to use this helper. Run existing tests (`pnpm test`) to confirm no regression.

**Checkpoint**: Existing tests pass. `smartSearch` and `viewportSearch` behavior unchanged.

---

## Phase 2: User Story 1 — Search Finds Distant Places by Name (Priority: P1) MVP

**Goal**: When local search returns <5 results, fall back to global search (no radius) so distant restaurants are found.

**Independent Test**: Search for a rare restaurant name with user location set. Verify global results are returned and the radius parameter is omitted in the fallback API call.

### Tests for User Story 1

> **Write these tests FIRST. They MUST FAIL before implementation.**

- [x] T002 [P] [US1] Add test in `tests/unit/search-sort.test.ts`: "smartSearch should fall back to global search when local results are fewer than 5". Mock fetch to return 2 local results (with radius in URL), then return 10 global results (without radius in URL). Assert: final results come from the global search (10 results). Assert: the second round of fetch calls does NOT include a `radius` parameter.
- [x] T003 [P] [US1] Add test in `tests/unit/search-sort.test.ts`: "smartSearch without location should search globally without radius". Call `smartSearch({ query: "산토리니" })` with no `x`/`y`. Assert: fetch URL has no `radius` parameter and no `x`/`y` parameters.

### Implementation for User Story 1

- [x] T004 [US1] Add `LOCAL_MIN_RESULTS = 5` constant and modify `smartSearch` in `src/lib/kakao.ts`: when `hasLocation` is true, call `searchAllTerms` with `radius: DEFAULT_RADIUS` first. If result count >= `LOCAL_MIN_RESULTS`, return `deduplicateAndSort(localResults)`. Otherwise, call `searchAllTerms` again without `radius` (keeping `x`, `y`, `sort: "accuracy"`) and return `deduplicateAndSort(globalResults)`. Remove `radius` from `smartSearch`'s public parameter type. When `hasLocation` is false, call `searchAllTerms({})` directly (existing behavior).
- [x] T005 [US1] Run tests (`pnpm test`) — T002 and T003 tests should now PASS. Fix any failures.

**Checkpoint**: `smartSearch` falls back to global search for rare queries. All tests pass.

---

## Phase 3: User Story 2 — Local Results Prioritized for Generic Queries (Priority: P2)

**Goal**: Generic queries (e.g., "치킨") with 5+ local results return local results without triggering global fallback.

**Independent Test**: Search for a common food term with user location. Verify local results are returned and no global fallback occurs.

### Tests for User Story 2

> **Write these tests FIRST. They MUST FAIL (or pass if already covered by US1 implementation).**

- [x] T006 [US2] Add test in `tests/unit/search-sort.test.ts`: "smartSearch should return local results when 5 or more exist". Mock fetch to return 8 results with radius in URL. Assert: results are the 8 local results. Assert: fetch is called only for the local search round (no second round without radius).

### Implementation for User Story 2

- [x] T007 [US2] Verify T006 passes with the implementation from T004 (the threshold check `>= LOCAL_MIN_RESULTS` already handles this). If not, fix `smartSearch` in `src/lib/kakao.ts`.

**Checkpoint**: Generic queries return local results. `smartSearch` does not make unnecessary global API calls.

---

## Phase 4: User Story 3 — "Search This Area" Still Works (Priority: P2)

**Goal**: Viewport-bounded search (`viewportSearch`) continues working identically after a global search repositions the map.

**Independent Test**: Verify existing viewport search tests pass unchanged.

- [x] T008 [US3] Run existing viewport search tests in `tests/unit/viewport-search.test.ts` and confirm all pass. `viewportSearch` uses `rect` (not `radius`) and was refactored in T001 to use `searchAllTerms` but with identical behavior. No new tests needed — existing tests cover rect-based search, pagination, dedup, and 300-cap.

**Checkpoint**: `viewportSearch` behavior unchanged. All viewport tests pass.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: UX improvements and final verification.

- [x] T009 Update empty result message in `src/app/search/page.tsx`: change "이 지역에서 음식점을 찾을 수 없습니다" to "검색 결과가 없습니다" (line ~219). Also update the secondary message from "다른 검색어를 입력하거나 지도를 이동해 보세요" to "다른 검색어를 입력해 보세요" since global search was already performed.
- [x] T010 Export `LOCAL_MIN_RESULTS` from `src/lib/kakao.ts` for testability and add a brief inline comment explaining the threshold.
- [x] T011 Run full verification: `tsc --noEmit && pnpm build && pnpm test`. All three gates must pass.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 2)**: Depends on Phase 1 (T001) — needs `searchAllTerms` helper
- **US2 (Phase 3)**: Depends on Phase 2 (T004) — tests the local-sufficient path of the same implementation
- **US3 (Phase 4)**: Depends on Phase 1 (T001) — verifies `viewportSearch` refactor
- **Polish (Phase 5)**: Depends on all phases completing

### Within Each User Story

- Tests (T002, T003) MUST be written and FAIL before implementation (T004)
- T005 verifies tests pass after implementation
- T006 may pass immediately since it tests the same code as T004

### Parallel Opportunities

- T002 and T003 can run in parallel (different test cases, same file but independent)
- After Phase 1: US1 tests (T002, T003) and US3 verification (T008) can run in parallel
- T009 and T010 can run in parallel (different files)

---

## Parallel Example: User Story 1 Tests

```bash
# Write both US1 tests in parallel (different test cases):
Task: T002 "Global fallback test in tests/unit/search-sort.test.ts"
Task: T003 "No-location global test in tests/unit/search-sort.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Extract `searchAllTerms` helper (T001)
2. Complete Phase 2: US1 tests + implementation (T002–T005)
3. **STOP and VALIDATE**: Run `pnpm test` — global fallback works
4. This alone solves the core problem (finding distant restaurants)

### Incremental Delivery

1. T001 → Foundation ready
2. T002–T005 → US1 complete (global search works) → **MVP**
3. T006–T007 → US2 verified (local prioritization preserved)
4. T008 → US3 verified (viewport search unchanged)
5. T009–T011 → Polish complete → Ready for PR

---

## Notes

- Total: 11 tasks
- US1: 4 tasks (T002–T005) — core feature
- US2: 2 tasks (T006–T007) — regression verification
- US3: 1 task (T008) — existing behavior verification
- Foundational: 1 task (T001) — refactor prerequisite
- Polish: 3 tasks (T009–T011) — UX + verification
- Suggested MVP scope: Phase 1 + Phase 2 (T001–T005)
- All tasks modify existing files only; no new files created
