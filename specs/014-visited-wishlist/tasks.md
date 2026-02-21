# Tasks: Visited & Wishlist Split

**Input**: Design documents from `/specs/014-visited-wishlist/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/supabase-queries.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Type system foundation — make the codebase ready for nullable star_rating

- [x] T001 Update Restaurant interface to `starRating: number | null` and add `isVisited()` helper in src/types/index.ts
- [x] T002 Update DbRestaurant mapping in src/db/hooks.ts to handle null star_rating (mapDbRestaurant should coalesce star_rating null correctly)

**Checkpoint**: TypeScript types reflect nullable star_rating. Build may have type errors — that's expected (fixed in Phase 2).

---

## Phase 2: Foundational (Data Layer)

**Purpose**: All DB hooks updated to support two-list model. BLOCKS all UI work.

**⚠️ CRITICAL**: No UI tasks can begin until this phase is complete.

- [x] T003 Update useAddRestaurant() to default star_rating to null (was 1) and accept optional starRating param in src/db/hooks.ts
- [x] T004 [P] Replace useWishlistGrouped() with IS NULL filter and add useVisitedGrouped() with NOT NULL filter in src/db/hooks.ts
- [x] T005 [P] Add useMarkAsVisited(kakaoPlaceId, rating) hook in src/db/hooks.ts — updates star_rating from null to 1/2/3, invalidates cache
- [x] T006 [P] Add useMoveToWishlist(kakaoPlaceId) hook in src/db/hooks.ts — updates star_rating to null, invalidates cache
- [x] T007 [P] Update useAcceptRecommendation() to insert with star_rating: null (was 1) in src/db/recommendation-hooks.ts
- [x] T008 [P] Add useUserVisitedGrouped(userId) and update useUserWishlistGrouped(userId) with status filters in src/db/profile-hooks.ts

**Checkpoint**: Data layer complete. All hooks return correct data for visited vs wishlist. Build should pass with no type errors.

---

## Phase 3: User Stories 1+2+3 — Core Two-List Experience (Priority: P1) 🎯 MVP

**Goal**: Users can add restaurants to wishlist, promote them to visited by tapping stars, and see two separate sections on the main tab.

**Independent Test**: Add a restaurant from search (→ appears in 위시 리스트), tap stars on it (→ moves to 맛집 리스트 with rating), verify two sections with correct labels and counts.

### Tests for US1+US2+US3

- [x] T009 [P] [US1] Unit test: useAddRestaurant inserts with star_rating null by default in tests/unit/hooks.test.ts
- [x] T010 [P] [US2] Unit test: useMarkAsVisited updates star_rating from null to given rating in tests/unit/hooks.test.ts
- [x] T011 [P] [US1] Unit test: useWishlistGrouped returns only restaurants with star_rating IS NULL in tests/unit/hooks.test.ts
- [x] T012 [P] [US3] Unit test: useVisitedGrouped returns only restaurants with star_rating IS NOT NULL in tests/unit/hooks.test.ts

### Implementation for US1+US2+US3

- [x] T013 [P] [US2] Update StarRating component to handle value={null} — render gray/empty stars as tappable affordance in src/components/StarRating.tsx
- [x] T014 [US1/US2/US3] Update RestaurantCard to conditionally render stars based on starRating: show editable filled stars for visited, gray tappable stars for wishlist, hide stars for search-result variant in src/components/RestaurantCard.tsx
- [x] T015 [US3] Rebuild main page with two-section layout: "맛집 리스트 (N)" header + visited accordions at top, "위시 리스트 (N)" header + wishlist accordions below, empty state per section in src/app/page.tsx

**Checkpoint**: MVP complete. Two-list experience works end-to-end: add to wishlist → tap stars to promote → see both sections.

---

## Phase 4: User Story 4 — Change Star Rating (Priority: P2)

**Goal**: Users can update the star rating on visited restaurants directly from the 맛집 리스트 section.

**Independent Test**: Tap a different star count on a visited restaurant card, verify rating updates and persists after refresh.

### Implementation for US4

- [x] T016 [US4] Verify existing useUpdateStarRating hook works correctly with the updated type (number | null → should only accept 1/2/3 for visited) in src/db/hooks.ts — update type signature if needed

**Checkpoint**: Star rating editing works on visited cards. No functional change from current behavior (just scoped to visited list).

---

## Phase 5: User Story 5 — Move Back to Wishlist (Priority: P3)

**Goal**: Users can demote a visited restaurant back to wishlist, removing its star rating.

**Independent Test**: Tap "위시리스트로" on a visited card, verify it moves to 위시 리스트 section with no stars.

### Tests for US5

- [x] T017 [P] [US5] Unit test: useMoveToWishlist sets star_rating to null in tests/unit/hooks.test.ts

### Implementation for US5

- [x] T018 [US5] Add "위시리스트로" action button on visited RestaurantCards — calls useMoveToWishlist hook in src/components/RestaurantCard.tsx and src/app/page.tsx

**Checkpoint**: Bidirectional movement works: wishlist ↔ visited.

---

## Phase 6: User Story 6 — Add Directly as Visited from Search (Priority: P3)

**Goal**: Users can add a restaurant directly as visited (with star rating) from search results, plus see ♡/★ indicators for already-saved restaurants.

**Independent Test**: Tap ★ icon on a search result, pick a rating, verify restaurant appears in 맛집 리스트. Verify saved restaurants show ♡ (wishlist) or ★ (visited) indicator.

### Tests for US6

- [x] T019 [P] [US6] Unit test: useAddRestaurant with explicit starRating inserts with that rating in tests/unit/hooks.test.ts

### Implementation for US6

- [x] T020 [US6] Add useRestaurantStatusMap() hook — batch lookup returning Map<kakaoPlaceId, "wishlist" | "visited" | null> for search results in src/db/hooks.ts
- [x] T021 [US6] Update search page: replace single "+" button with dual buttons ("+" for wishlist, "★" for visited with rating picker), replace "✓ 저장됨" with ♡/★ indicators based on status in src/app/search/page.tsx
- [x] T022 [US6] Update RestaurantCard search-result variant: render ♡ or ★ indicator instead of generic saved text in src/components/RestaurantCard.tsx

**Checkpoint**: Search page shows dual add options and distinct saved indicators.

---

## Phase 7: Profile Integration

**Purpose**: Public profile pages show two-section layout matching the main tab.

- [x] T023 Update UserProfileView with two-section layout (맛집 리스트 + 위시 리스트) using useUserVisitedGrouped and useUserWishlistGrouped in src/components/UserProfileView.tsx

**Checkpoint**: Other users' profiles display visited and wishlist sections separately.

---

## Phase 8: Tests — Recommendation Hooks Update

**Purpose**: Update existing tests to reflect star_rating: null change.

- [x] T024 Update recommendation-hooks tests: assert star_rating: null on accept (was 1) in tests/unit/recommendation-hooks.test.ts

**Checkpoint**: All existing tests pass with the new nullable star_rating model.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and cleanup.

- [x] T025 Run /verify-build — ensure tsc --noEmit, pnpm build, and pnpm test all pass
- [x] T026 Review empty state messages: both-empty combined message, single-section empty messages in src/app/page.tsx
- [x] T027 Verify recommendation acceptance flow adds to 위시 리스트 (not 맛집 리스트) end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all UI phases
- **Phase 3 (US1+2+3 MVP)**: Depends on Phase 2 — core experience
- **Phase 4 (US4)**: Depends on Phase 3 — builds on visited cards
- **Phase 5 (US5)**: Depends on Phase 3 — adds reverse action
- **Phase 6 (US6)**: Depends on Phase 2 — independent of Phase 3-5 (search page only)
- **Phase 7 (Profiles)**: Depends on Phase 2 — independent of Phase 3-6
- **Phase 8 (Tests update)**: Depends on Phase 2 — can run alongside any UI phase
- **Phase 9 (Polish)**: Depends on all previous phases

### User Story Dependencies

- **US1+US2+US3 (P1)**: Tightly coupled — all three form the MVP, implemented together
- **US4 (P2)**: Depends on US3 (needs visited cards rendered)
- **US5 (P3)**: Depends on US3 (needs visited cards rendered)
- **US6 (P3)**: Independent of US1-5 (only touches search page + data layer)

### Parallel Opportunities

After Phase 2 completes, the following can run in parallel:
- Phase 3 (main tab MVP) ← primary focus
- Phase 6 (search page) ← independent, different files
- Phase 7 (profile page) ← independent, different files
- Phase 8 (test updates) ← independent

---

## Parallel Example: After Phase 2

```text
# These can run simultaneously (different files, no conflicts):
Agent A: T013-T015 (main tab MVP — StarRating, RestaurantCard, page.tsx)
Agent B: T020-T022 (search page — hooks, search/page.tsx, RestaurantCard search variant)
Agent C: T023 (profile page — UserProfileView.tsx)
Agent D: T024 (test updates — recommendation-hooks.test.ts)
```

---

## Implementation Strategy

### MVP First (Phase 1 → 2 → 3)

1. Complete Phase 1: Type changes (T001-T002)
2. Complete Phase 2: Data layer (T003-T008)
3. Complete Phase 3: Core two-list UI (T009-T015)
4. **STOP and VALIDATE**: Add restaurant → appears in wishlist → tap stars → moves to visited
5. Run `/verify-build` to confirm

### Incremental Delivery

1. Phase 1+2+3 → MVP: Two-list experience works ✓
2. Phase 4 → Star editing on visited cards ✓
3. Phase 5 → Move back to wishlist ✓
4. Phase 6 → Search page dual buttons + indicators ✓
5. Phase 7 → Profile pages updated ✓
6. Phase 8+9 → Tests + polish ✓

---

## Pre-Implementation Reminder

**Database migration MUST be applied before any code runs:**
Run the SQL from `data-model.md` in Supabase Dashboard > SQL Editor:
```sql
ALTER TABLE restaurants
  ALTER COLUMN star_rating DROP NOT NULL,
  ALTER COLUMN star_rating SET DEFAULT NULL;

ALTER TABLE restaurants
  ADD CONSTRAINT star_rating_valid
  CHECK (star_rating IS NULL OR (star_rating >= 1 AND star_rating <= 3));
```

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US1+US2+US3 are combined into one phase because they're all P1 and form an indivisible MVP
- Total: 27 tasks across 9 phases
- Commit after each phase checkpoint
