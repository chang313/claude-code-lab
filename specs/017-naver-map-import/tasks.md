# Tasks: Naver Map Import

**Input**: Design documents from `/specs/017-naver-map-import/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/api.md, research.md, quickstart.md

**Tests**: Included per constitution (Principle II: TDD — tests before implementation).

**Organization**: Tasks grouped by user story. US1 and US2 are both P1 and tightly coupled (import screen + guide), so they share a phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Types, shared utilities, and DB migration preparation

- [ ] T001 Add NaverBookmark, NaverBookmarkResponse, and ImportBatch types to src/types/index.ts — include synthetic ID generation helper `makeNaverPlaceId(py: number, px: number): string` that returns `naver_{py}_{px}` truncated to 6 decimal places
- [ ] T002 [P] Create Haversine distance utility in src/lib/haversine.ts — export `haversineDistance(lat1, lng1, lat2, lng2): number` returning meters, and `isWithinRadius(lat1, lng1, lat2, lng2, radiusMeters): boolean`
- [ ] T003 [P] Create Naver parser and validator in src/lib/naver.ts — export `validateShareId(input: string): string | null` (extracts alphanumeric shareId, returns null if invalid), `parseNaverBookmarks(response: unknown): NaverBookmark[]` (validates each entry, skips those missing displayname/px/py or with non-numeric coords), and `buildNaverApiUrl(shareId: string): string`
- [ ] T004 Document DB migration SQL in specs/017-naver-map-import/data-model.md — migration must be applied manually in Supabase SQL Editor before deployment (create `import_batches` table, add `import_batch_id` column to `restaurants`, create indexes and RLS policies)

---

## Phase 2: Foundational Tests

**Purpose**: TDD — write and verify tests fail before implementation

**⚠️ CRITICAL**: Tests MUST fail (red) at this point. Do not implement production code until Phase 3.

- [ ] T005 [P] Write unit tests for Haversine utility in tests/unit/haversine.test.ts — test known distances (Seoul Station ↔ Gangnam Station ≈ 8.9km), edge cases (same point = 0m, antipodal points), and `isWithinRadius` threshold behavior at 49m/50m/51m boundary
- [ ] T006 [P] Write unit tests for Naver parser in tests/unit/naver-import.test.ts — test `validateShareId` (valid alphanumeric, empty string, special chars, URL extraction), `parseNaverBookmarks` (valid entries, missing fields, non-numeric px/py, empty bookmarkList, malformed JSON), and `buildNaverApiUrl` (correct domain construction)
- [ ] T007 [P] Write unit tests for synthetic ID generation in tests/unit/naver-import.test.ts — test `makeNaverPlaceId` format correctness, 6 decimal truncation, `naver_` prefix present

**Checkpoint**: All tests should fail (red). Proceed to implementation.

---

## Phase 3: User Story 1 + 2 — Core Import & Guide (Priority: P1) 🎯 MVP

**Goal**: User pastes Naver share link → system imports bookmarks to wishlist with progress feedback. Includes step-by-step guide.

**Independent Test**: Paste a valid Naver share link, verify restaurants appear in wishlist with correct names, addresses, coordinates. Guide is visible and collapsible.

### Implementation

- [ ] T008 [US1] Implement Haversine utility in src/lib/haversine.ts — make T005 tests pass. Use standard Haversine formula with Earth radius 6371km. Include bounding-box pre-filter helper `getBoundingBox(lat, lng, radiusMeters)` returning {minLat, maxLat, minLng, maxLng} for DB query optimization
- [ ] T009 [US1] Implement Naver parser in src/lib/naver.ts — make T006/T007 tests pass. `validateShareId` accepts raw shareId or full URL, extracts alphanumeric ID (1-100 chars). `parseNaverBookmarks` iterates `bookmarkList`, skips invalid entries, returns count of skipped. `buildNaverApiUrl` constructs `https://pages.map.naver.com/save-pages/api/maps-bookmark/v3/shares/{shareId}/bookmarks?start=0&limit=5000&sort=lastUseTime`
- [ ] T010 [US1] Create API route POST /api/import/naver in src/app/api/import/naver/route.ts — accept `{ shareId }`, validate with `validateShareId`, construct Naver URL, fetch server-side (30s timeout), validate response has `bookmarkList` array, parse with `parseNaverBookmarks`, return `{ bookmarks, totalCount, folderName }`. Return 400/403/502 per contracts/api.md error codes
- [ ] T011 [US1] Create API route POST /api/import/save in src/app/api/import/save/route.ts — authenticate user via Supabase server client, accept `{ shareId, sourceName, bookmarks }`, validate max 1000 bookmarks with valid lat/lng. Create `import_batches` row, perform duplicate detection (query existing restaurants, Haversine check against each bookmark), generate synthetic `kakao_place_id` via `makeNaverPlaceId`, bulk insert non-duplicates with `import_batch_id`, update batch counts, return `{ batchId, importedCount, skippedCount, invalidCount, totalCount }`. Invalidate restaurant cache
- [ ] T012 [P] [US1] Create import hooks in src/db/import-hooks.ts — export `useNaverImport()` returning `{ importFromNaver(shareId: string): Promise<ImportResult>, isImporting: boolean, progress: { current: number, total: number } | null, error: string | null }`. Orchestrates: call /api/import/naver → parse response → call /api/import/save → return result. Track progress state
- [ ] T013 [P] [US2] Create ImportGuide component in src/components/ImportGuide.tsx — collapsible accordion with 3-4 numbered steps: (1) 네이버 지도 앱 열기 → 즐겨찾기 탭, (2) 공유할 폴더 선택 → 공개 설정, (3) 공유 링크 복사, (4) 이 화면에 붙여넣기. Use text instructions (no images for MVP). Collapsed by default, expand on tap
- [ ] T014 [US1] Create ImportProgress component in src/components/ImportProgress.tsx — displays "N/M 장소 가져오는 중..." during import, and result summary after completion showing imported/skipped/invalid counts. Include error state with retry button
- [ ] T015 [US1] [US2] Create import page in src/app/my/import/page.tsx — authenticated page (redirect to /login if not logged in). Layout: ImportGuide (collapsed) at top, text input for share link paste, "가져오기" button, ImportProgress below. Wire up `useNaverImport` hook. Show result summary on completion with link back to wishlist. Follow existing layout pattern (max-w-lg mx-auto px-4 pt-4 pb-24)
- [ ] T016 [US1] Add navigation entry point — add "네이버에서 가져오기" link/button to src/components/UserProfileView.tsx in the wishlist section (visible only on own profile). Links to /my/import

### Tests (verify green)

- [ ] T017 [P] [US1] Write unit tests for import hooks in tests/unit/import-hooks.test.ts — mock fetch calls to /api/import/naver and /api/import/save, test success flow (returns correct counts), error handling (invalid link, network failure), progress tracking. Follow existing chainable Supabase mock pattern from tests/unit/

**Checkpoint**: US1+US2 fully functional. User can navigate to import page, see guide, paste link, import bookmarks, see progress and results. Restaurants appear in wishlist with "미분류" category and synthetic IDs.

---

## Phase 4: User Story 3 — Category Enrichment (Priority: P2)

**Goal**: After import, system enriches restaurants with category data from Kakao Local API in the background. Categories appear on next page load.

**Independent Test**: Import Naver bookmarks → trigger enrichment → verify category/Kakao ID/place URL updated for matched restaurants on next page load.

### Tests (write first — should fail)

- [ ] T018 [P] [US3] Write unit tests for enrichment matching in tests/unit/enrichment.test.ts — test `findKakaoMatch(naverName, lat, lng)`: exact name + within 100m → match, substring name + within 100m → match, different name + within 100m → no match, same name + beyond 100m → no match, multiple results within 100m → pick closest. Test name normalization (whitespace stripping, case-insensitive). Test `enrichBatch` with mocked Kakao API: partial failure (some succeed, some fail), rate throttling behavior, skip already-enriched (non-synthetic kakao_place_id)

### Implementation

- [ ] T019 [US3] Create enrichment library in src/lib/enrichment.ts — export `findKakaoMatch(naverName: string, lat: number, lng: number): Promise<KakaoPlace | null>` using existing `searchByKeyword` from src/lib/kakao.ts with name query + coordinates + 100m radius. Apply substring match + distance check. Export `enrichBatch(batchId: string, restaurants: Restaurant[]): Promise<{ enrichedCount: number, failedCount: number }>` — iterate restaurants with synthetic IDs, call `findKakaoMatch` for each, update DB (kakao_place_id, category, place_url), throttle at 100ms between requests, update batch enrichment_status/enriched_count. Catch errors per-restaurant (don't fail entire batch)
- [ ] T020 [US3] Create API route POST /api/import/enrich in src/app/api/import/enrich/route.ts — authenticate user, accept `{ batchId }`, validate batch exists and belongs to user, set enrichment_status to 'running', query restaurants with synthetic kakao_place_id for that batch, call `enrichBatch` (fire-and-forget via unresolved promise — do NOT await), return 202 `{ status: "started", batchId }`. On enrichBatch completion, update batch enrichment_status to 'completed' or 'failed'
- [ ] T021 [US3] Wire enrichment trigger into import flow — update `useNaverImport` in src/db/import-hooks.ts to automatically call POST /api/import/enrich after successful save. No await — fire and forget. User sees import complete immediately

**Checkpoint**: After import, enrichment runs in background. On next wishlist page load, categories are populated for matched restaurants.

---

## Phase 5: User Story 4 — Import History & Batch Undo (Priority: P3)

**Goal**: User can view past imports and undo an import batch (remove unrated restaurants).

**Independent Test**: Perform import → view history → see batch entry with counts → undo → verify unrated restaurants removed, rated ones preserved.

### Implementation

- [ ] T022 [US4] Create API route GET /api/import/history in src/app/api/import/history/route.ts — authenticate user, query `import_batches` where user_id matches, order by created_at DESC, return array with id, sourceName, importedCount, skippedCount, invalidCount, enrichmentStatus, enrichedCount, createdAt
- [ ] T023 [P] [US4] Create API route DELETE /api/import/batch/[id] in src/app/api/import/batch/[id]/route.ts — authenticate user, validate batch exists and belongs to user, delete restaurants where import_batch_id = batchId AND star_rating IS NULL, count preserved (rated) restaurants, delete the batch record, return `{ removedCount, preservedCount }`. Invalidate restaurant cache
- [ ] T024 [US4] Add import history hooks to src/db/import-hooks.ts — export `useImportHistory()` returning `{ batches, isLoading }` using `useSupabaseQuery`, and `useUndoImport()` returning `{ undoImport(batchId: string): Promise<{ removedCount, preservedCount }> }`. Also add `useRetriggerEnrichment()` for re-triggering failed/pending enrichment from history
- [ ] T025 [US4] Create ImportHistory component in src/components/ImportHistory.tsx — list of past imports showing source name, imported count, enrichment status badge (pending/running/completed/failed), date. Each row has "되돌리기" button (with confirmation dialog). Failed/pending enrichment rows show "카테고리 다시 가져오기" button. Wire up hooks
- [ ] T026 [US4] Add import history section to import page — update src/app/my/import/page.tsx to show ImportHistory below the import form. Show only if user has past imports (use `useImportHistory`)

**Checkpoint**: Full feature complete. Import, guide, enrichment, history, and undo all functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Error handling improvements, edge cases, and code quality

- [ ] T027 Add error boundary and loading states to src/app/my/import/page.tsx — handle offline detection (show "인터넷 연결을 확인해주세요"), add skeleton loading states consistent with existing app patterns
- [ ] T028 [P] Verify all edge cases from spec — test: empty folder (0 bookmarks), private folder (403), exceed 1000 bookmarks (truncate + warn), same folder imported twice (skips duplicates), malformed entries (skipped + counted)
- [ ] T029 Run /verify-build — execute `tsc --noEmit` → `pnpm build` → `pnpm test` and fix any failures

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational Tests (Phase 2)**: Depends on Phase 1 types being defined
- **US1+US2 (Phase 3)**: Depends on Phase 2 tests existing (TDD). Implementation makes tests pass
- **US3 (Phase 4)**: Depends on Phase 3 (import must work first). Can start tests in parallel with Phase 3 implementation
- **US4 (Phase 5)**: Depends on Phase 3 (needs import batches to exist). Independent of Phase 4
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 + US2 (P1)**: Can start after Phase 2 — no dependencies on other stories. **MVP scope.**
- **US3 (P2)**: Requires US1 complete (needs imported restaurants to enrich). Independent of US4.
- **US4 (P3)**: Requires US1 complete (needs import batches to display). Independent of US3 but benefits from US3 (shows enrichment status).

### Within Each Story

- Tests written FIRST and MUST fail before implementation
- Utilities before API routes
- API routes before hooks
- Hooks before UI components
- Page wiring last

### Parallel Opportunities

**Phase 1**: T002 and T003 can run in parallel (different files)
**Phase 2**: T005, T006, T007 can all run in parallel (different test files)
**Phase 3**: T012 and T013 can run in parallel (different files); T014 can start after T012
**Phase 4**: T018 can start while Phase 3 implementation is ongoing
**Phase 5**: T022 and T023 can run in parallel (different API routes)

---

## Parallel Example: Phase 3 (US1 + US2)

```text
# Sequential: utilities first
T008: Implement haversine.ts (makes T005 green)
T009: Implement naver.ts (makes T006/T007 green)

# Sequential: API routes depend on utilities
T010: API route /api/import/naver (depends on T009)
T011: API route /api/import/save (depends on T008, T009)

# Parallel: hooks and guide are independent files
T012: Import hooks (depends on T010, T011)
T013: ImportGuide component (no dependencies)

# Sequential: UI page wires everything together
T014: ImportProgress component (depends on T012)
T015: Import page (depends on T012, T013, T014)
T016: Navigation entry point (depends on T015)
T017: Verify hook tests pass (depends on T012)
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Setup (types + utilities)
2. Complete Phase 2: Foundational tests (TDD red)
3. Complete Phase 3: US1 + US2 implementation (TDD green)
4. **STOP and VALIDATE**: Paste a real Naver share link, verify import works end-to-end
5. Deploy if ready — users can import without enrichment or history

### Incremental Delivery

1. Setup + Tests → Foundation ready
2. US1 + US2 → Core import + guide → **Deploy (MVP!)**
3. US3 → Category enrichment → Deploy (categories appear on refresh)
4. US4 → History + undo → Deploy (full feature)
5. Polish → Edge cases + error handling → Final deploy

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- DB migration (T004) must be applied manually in Supabase SQL Editor BEFORE deploying
- This is the first feature to use Next.js API routes — T010 establishes the pattern
- Enrichment uses existing `searchByKeyword` from src/lib/kakao.ts — no new Kakao integration needed
- Follow existing patterns: `useSupabaseQuery` for reads, `createClient()` from `@/lib/supabase/client` for client-side, `createClient()` from `@/lib/supabase/server` for API routes
