# Tasks: Naver Import Category Auto-Enrichment

**Input**: Design documents from `/specs/026-naver-category-enrichment/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/enrich-api.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Database schema change required before any implementation

- [ ] T001 Apply migration SQL from `specs/026-naver-category-enrichment/data-model.md` in Supabase Dashboard > SQL Editor: (1) `ALTER TABLE import_batches ADD COLUMN categorized_count integer NOT NULL DEFAULT 0`, (2) backfill `SET categorized_count = enriched_count`, (3) `CREATE INDEX idx_restaurants_empty_category ON restaurants(user_id) WHERE category = ''`

---

## Phase 2: User Story 1 — Improved Name Matching + Retroactive Re-Enrichment (Priority: P1) MVP

**Goal**: Boost category enrichment success rate from ~50-60% to 80%+ by expanding search radius to 300m and using suffix-aware Korean name normalization. Also provide retroactive re-enrichment for existing uncategorized restaurants.

**Independent Test**: Import a Naver bookmark folder with 10+ restaurants → verify at least 80% get a non-empty category (not "기타"). Trigger retroactive re-enrichment → verify previously "기타" restaurants now have categories.

### Tests for User Story 1

> **Write these tests FIRST, ensure they FAIL before implementation**

- [x] T002 [P] [US1] Add tests for suffix-aware `normalizeName()` in `tests/unit/enrichment.test.ts`: test that `normalizeName("스타벅스 강남역점")` strips the "역점" suffix, test "직영점"/"지점"/"본점" variants, test that base names without suffixes are unchanged, test mixed Korean+English names like "KFC 강남점"
- [x] T003 [P] [US1] Add tests for expanded 300m radius matching in `tests/unit/enrichment.test.ts`: test that a restaurant at 200m distance now matches (was rejected at 100m), test that 350m+ still rejected, test that closest-by-distance tiebreaker still works within 300m

### Implementation for User Story 1

- [x] T004 [US1] Update `normalizeName()` in `src/lib/enrichment.ts` to strip Korean business suffixes using regex `/(?:역점|지점|본점|직영점|.{1,4}점)$/` AFTER the existing whitespace-strip and lowercase. Export a `stripSuffix()` helper for testability. Update `isNameMatch()` to use the new normalization (FR-002)
- [x] T005 [US1] Change `MATCH_RADIUS_M` from `100` to `300` in `src/lib/enrichment.ts` (line 5). Update `searchByKeyword` call in `findKakaoMatch()` to pass `radius: MATCH_RADIUS_M` (already does). Verify Haversine distance filter uses the same constant (FR-001)
- [x] T006 [US1] Add idempotent empty-category guard in `enrichBatch()` in `src/lib/enrichment.ts`: before calling `findKakaoMatch()`, query the restaurant's current `category` field — if non-empty, skip it. This ensures re-enrichment never overwrites existing categories (FR-006, FR-007). Add `.eq("user_id", userId)` to the restaurant UPDATE for defense-in-depth
- [x] T007 [P] [US1] Create `POST /api/import/re-enrich` route in `src/app/api/import/re-enrich/route.ts` per contracts/enrich-api.md: authenticate user, query `restaurants` where `category = ''` AND `user_id = user.id`, if none return `200 { status: "no_action", restaurantCount: 0 }`, otherwise fire-and-forget the enrichment pipeline on all results and return `202 { status: "started", restaurantCount: N }`
- [x] T008 [US1] Add `useRetroactiveEnrich` hook in `src/db/import-hooks.ts`: POST to `/api/import/re-enrich`, manage `isEnriching` state, invalidate restaurant caches on completion. Follow existing `useRetriggerEnrichment` hook pattern
- [x] T009 [US1] Add a "전체 카테고리 다시 매칭" button in `src/components/ImportHistory.tsx` (or the import page `src/app/my/import/page.tsx`) that calls `useRetroactiveEnrich`. Show button only when there are uncategorized restaurants. Disable during enrichment with loading indicator

**Checkpoint**: US1 complete — improved name matching and expanded radius should dramatically increase enrichment success rate. Retroactive re-enrichment available for existing data.

---

## Phase 3: User Story 2 — Coordinate-Based Category Fallback (Priority: P2)

**Goal**: When name-based matching fails entirely, use Kakao's category search API to find the nearest food establishment by coordinates and assign its category. Only updates `category` — does NOT replace `kakao_place_id` or `place_url`.

**Independent Test**: Import a restaurant whose name doesn't exist in Kakao, but at coordinates where Kakao knows about a restaurant. Verify it receives a category from coordinate-based lookup instead of remaining "기타".

### Tests for User Story 2

> **Write these tests FIRST, ensure they FAIL before implementation**

- [x] T010 [P] [US2] Create `tests/unit/category-fallback.test.ts`: mock `searchByCategory()` and test `findCategoryByCoordinates()` — (1) returns category_name of closest FD6 result within 50m, (2) prefers FD6 (음식점) over CE7 (카페) when both present, (3) returns null when no results within 50m, (4) returns null on API error
- [x] T011 [P] [US2] Add enrichBatch fallback integration test in `tests/unit/enrichment.test.ts`: mock `findKakaoMatch()` to return null, mock `findCategoryByCoordinates()` to return a category string → verify enrichBatch updates ONLY `category` (not kakao_place_id/place_url) on the restaurant record

### Implementation for User Story 2

- [x] T012 [US2] Add `searchByCategory()` function in `src/lib/kakao.ts`: call `GET https://dapi.kakao.com/v2/local/search/category` with `category_group_code`, `x`, `y`, `radius`, `sort`, `size` params. Same auth header pattern as `searchByKeyword()`. Return `KakaoSearchResponse`
- [x] T013 [US2] Add `findCategoryByCoordinates()` function in `src/lib/enrichment.ts`: (1) call `searchByCategory({ categoryGroupCode: "FD6", x, y, radius: 50, sort: "distance", size: 5 })`, (2) if results found, return `category_name` of the closest result, (3) if no FD6 results, retry with `CE7` (카페), (4) return null if no results at all (FR-003, FR-004). This is a pure function returning `string | null` (not a DB operation)
- [x] T014 [US2] Integrate coordinate fallback into `enrichBatch()` in `src/lib/enrichment.ts`: after `findKakaoMatch()` returns null, call `findCategoryByCoordinates(lat, lng)`. If it returns a category string, perform a targeted `.update({ category: result })` on the restaurant (preserving kakao_place_id and place_url). Increment a local `categoryOnlyCount` counter. Respect the existing throttle between API calls

**Checkpoint**: US2 complete — restaurants that fail name matching now get categories via coordinate fallback. Combined with US1, the "기타" count should be dramatically reduced.

---

## Phase 4: User Story 3 — Enrichment Status Visibility (Priority: P3)

**Goal**: Show users how many of their imported restaurants were successfully categorized vs. total, so they know the enrichment quality.

**Independent Test**: Complete an import → view import history → verify it shows "카테고리 18/20" style statistics.

### Implementation for User Story 3

- [x] T015 [US3] Update `enrichBatch()` in `src/lib/enrichment.ts` to compute `categorized_count` at the end of the batch: query restaurants in the batch where `category != ''`, store the count in `import_batches.categorized_count` alongside the existing `enriched_count` update (FR-005)
- [x] T016 [US3] Update `ImportHistory.tsx` in `src/components/ImportHistory.tsx`: replace the existing `카테고리 ${batch.enrichedCount}개` display with `카테고리 ${batch.categorizedCount}/${batch.importedCount}` format. Update the `useImportHistory` hook query in `src/db/import-hooks.ts` to select the new `categorized_count` field and map it to `categorizedCount` in the batch type
- [x] T017 [US3] Add unit test for categorization stats display in `tests/unit/import-history.test.tsx`: render ImportHistory with mock batch data containing `categorizedCount: 18, importedCount: 20`, verify the text "카테고리 18/20" appears in the rendered output

**Checkpoint**: US3 complete — import history now shows meaningful categorization statistics instead of just enriched count.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verification and cleanup

- [x] T018 Update `specs/026-naver-category-enrichment/spec.md` status from "Draft" to "Implemented"
- [x] T019 Run `/verify-build`: `tsc --noEmit` (or `pnpm build`) → `pnpm build` → `pnpm test` — all three gates must pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — apply migration first
- **US1 (Phase 2)**: Depends on Setup (Phase 1) — needs `categorized_count` column for enrichBatch stats later, needs `idx_restaurants_empty_category` index for re-enrich route
- **US2 (Phase 3)**: Depends on US1 completion — modifies the same `enrichBatch()` function, and the fallback conceptually runs AFTER name-based matching
- **US3 (Phase 4)**: Depends on US1 (enrichBatch changes) and Setup (categorized_count column). Can be parallelized with US2 if careful about `enrichBatch()` merge
- **Polish (Phase 5)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Can start after Setup → **Independently testable**
- **US2 (P2)**: Must start after US1 (modifies same enrichBatch function) → Independently testable once name-matching is in place
- **US3 (P3)**: Depends on Setup for DB column, but implementation is mostly independent → Independently testable with mock data

### Within Each User Story

- Tests written FIRST (must fail before implementation)
- Core lib changes before API routes
- API routes before hooks
- Hooks before UI

### Parallel Opportunities

**Within US1**:
```
T002 ─┐
      ├─ (parallel tests) ─→ T004 → T005 → T006 → T007 ─┐
T003 ─┘                                                     ├─ T008 → T009
                                                    T007 ───┘ (parallel: route + hooks)
```

**Within US2**:
```
T010 ─┐
      ├─ (parallel tests) ─→ T012 → T013 → T014
T011 ─┘
```

**US3 tasks are sequential** (small phase, not worth parallelizing)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Apply migration (Phase 1)
2. Complete US1 tests → implementation (Phase 2)
3. **STOP and VALIDATE**: Run `/verify-build`, then manually import a Naver bookmark folder
4. Measure: did match rate improve from ~50-60% to 80%+?
5. If yes: deploy MVP. US2 and US3 can follow incrementally.

### Incremental Delivery

1. Setup + US1 → **Deploy** (immediate value: most "기타" resolved)
2. Add US2 → **Deploy** (safety net: even name-unmatched restaurants get categories)
3. Add US3 → **Deploy** (visibility: users see categorization quality)
4. Each story adds value without breaking previous stories

### Suggested Commit Points

- After T001: `chore: add categorized_count column migration SQL`
- After T005: `feat: improve name matching with suffix stripping and 300m radius`
- After T009: `feat: add retroactive re-enrichment API and UI`
- After T014: `feat: add coordinate-based category fallback`
- After T017: `feat: show categorization stats in import history`
- After T019: `chore: verify build passes all gates`

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Verify tests fail before implementing (Red-Green-Refactor per constitution)
- Commit after each logical group
- The `enrichBatch()` function in `src/lib/enrichment.ts` is the hot path — US1, US2, and US3 all modify it. Execute these phases sequentially to avoid merge conflicts.
