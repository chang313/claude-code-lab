# Tasks: Restaurant Wishlist

**Input**: Design documents from `/specs/001-restaurant-wishlist/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Constitution requires TDD (Principle II). Test tasks are included for each user story.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and tooling

- [ ] T001 Initialize Next.js 15 project with TypeScript strict mode and App Router in project root
- [ ] T002 Install dependencies: react, dexie, tailwindcss, and dev dependencies: vitest, @testing-library/react, playwright, eslint, prettier
- [ ] T003 [P] Configure Tailwind CSS 4 with custom mobile-first theme in tailwind.config.ts
- [ ] T004 [P] Configure ESLint and Prettier with TypeScript rules in eslint.config.mjs and .prettierrc
- [ ] T005 [P] Configure Vitest in vitest.config.ts and Playwright in playwright.config.ts
- [ ] T006 [P] Create .env.example with NEXT_PUBLIC_KAKAO_JS_KEY and NEXT_PUBLIC_KAKAO_REST_KEY placeholders
- [ ] T007 Define shared TypeScript types (Restaurant, MenuItem, KakaoPlace, KakaoSearchResponse) in src/types/index.ts per contracts/kakao-api.ts and data-model.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database layer and API client that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T008 Implement Dexie.js database schema with restaurants and menuItems tables, indexes per data-model.md in src/db/index.ts
- [ ] T009 Implement text normalization utility (trim + lowercase) in src/lib/normalize.ts
- [ ] T010 [P] Implement Kakao Local API client with searchByKeyword and searchByBounds functions in src/lib/kakao.ts per contracts/kakao-api.ts
- [ ] T011 [P] Implement OfflineBanner component with navigator.onLine detection in src/components/OfflineBanner.tsx per contracts/components.ts
- [ ] T012 Implement root layout with bottom navigation bar (Wishlist, Search, Map, By Menu tabs) in src/app/layout.tsx
- [ ] T013 [P] Implement StarRating component (1–3 stars, interactive + readonly modes) in src/components/StarRating.tsx per contracts/components.ts
- [ ] T014 Implement DB hooks: useWishlist, useAddRestaurant, useRemoveRestaurant, useUpdateStarRating, useIsWishlisted in src/db/hooks.ts per contracts/db-hooks.ts (wishlist operations only)

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 — Search and Add Restaurant (Priority: P1) MVP

**Goal**: Users can search restaurants by name and add them to a sorted wishlist with star ratings

**Independent Test**: Search for a restaurant by name, view results, add to wishlist, see it on the home wishlist view sorted by star rating

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T015 [P] [US1] Unit test for searchByKeyword in tests/unit/kakao.test.ts — mock fetch, verify query params include category_group_code=FD6, verify response parsing
- [ ] T016 [P] [US1] Unit test for useAddRestaurant hook in tests/unit/db-hooks.test.ts — verify duplicate detection (FR-004), verify default starRating=1 (FR-011), verify KakaoPlace→Restaurant mapping
- [ ] T017 [P] [US1] Unit test for useWishlist hook in tests/unit/db-hooks.test.ts — verify sort order: starRating desc then createdAt desc (FR-012)
- [ ] T018 [P] [US1] Integration test for search→add→wishlist flow in tests/integration/wishlist-flow.test.ts — search, add restaurant, verify it appears in wishlist

### Implementation for User Story 1

- [ ] T019 [P] [US1] Implement SearchBar component with debounced input (300ms) in src/components/SearchBar.tsx per contracts/components.ts
- [ ] T020 [P] [US1] Implement RestaurantCard component (search-result and wishlist variants) in src/components/RestaurantCard.tsx per contracts/components.ts
- [ ] T021 [US1] Implement search page: SearchBar + results list + "Add to Wishlist" button + no-results state + already-wishlisted indicator in src/app/search/page.tsx (FR-001, FR-003, FR-004)
- [ ] T022 [US1] Implement home/wishlist page: sorted restaurant list with star ratings + empty state in src/app/page.tsx (FR-012, FR-013)
- [ ] T023 [US1] E2E test for full search→add→wishlist→star-rating flow in tests/e2e/search-and-add.spec.ts

**Checkpoint**: User Story 1 fully functional — users can search, add, rate, and view wishlisted restaurants

---

## Phase 4: User Story 2 — Find Restaurant on Map (Priority: P2)

**Goal**: Users can browse restaurants on an interactive map and add them to the wishlist from map markers

**Independent Test**: Open map view, see markers around current location (or fallback), tap a marker, add to wishlist from popup

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T024 [P] [US2] Unit test for searchByBounds in tests/unit/kakao.test.ts — verify rect parameter format, verify response parsing
- [ ] T025 [P] [US2] Unit test for MapView component in tests/unit/map-view.test.ts — verify markers render, verify onBoundsChange callback fires, verify wishlisted marker styling

### Implementation for User Story 2

- [ ] T026 [US2] Implement MapView component wrapping Kakao Maps SDK: map init, markers, info window popup, GPS/fallback center, bounds change event in src/components/MapView.tsx per contracts/components.ts
- [ ] T027 [US2] Implement map page: MapView + category search on bounds change + marker popup with "Add to Wishlist" + wishlisted marker differentiation in src/app/map/page.tsx (FR-002, FR-003)
- [ ] T028 [US2] Load Kakao Maps SDK script tag in src/app/layout.tsx via next/script with NEXT_PUBLIC_KAKAO_JS_KEY
- [ ] T029 [US2] E2E test for map→marker-tap→add-to-wishlist flow in tests/e2e/map-discovery.spec.ts

**Checkpoint**: User Stories 1 AND 2 both work independently

---

## Phase 5: User Story 3 — Add Menu Memo to Restaurant (Priority: P3)

**Goal**: Users can add/remove menu item memos to wishlisted restaurants

**Independent Test**: Open a wishlisted restaurant, add menu items, see them listed, delete one

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T030 [P] [US3] Unit test for useAddMenuItem hook in tests/unit/db-hooks.test.ts — verify normalizedName derivation (FR-008), verify duplicate menu item warning
- [ ] T031 [P] [US3] Unit test for useRemoveMenuItem and cascade delete in tests/unit/db-hooks.test.ts — verify useRemoveRestaurant cascade-deletes menu items (FR-009)

### Implementation for User Story 3

- [ ] T032 [US3] Implement DB hooks: useMenuItems, useAddMenuItem, useRemoveMenuItem in src/db/hooks.ts per contracts/db-hooks.ts (menu item operations)
- [ ] T033 [US3] Implement MenuItemList component: input field, add button, list with delete in src/components/MenuItemList.tsx per contracts/components.ts
- [ ] T034 [US3] Implement restaurant detail page: restaurant info, star rating editor, menu item list, delete restaurant button in src/app/restaurant/[id]/page.tsx (FR-005, FR-009, FR-013)
- [ ] T035 [US3] E2E test for add-menu-item→view→delete-menu-item flow in tests/e2e/menu-items.spec.ts

**Checkpoint**: User Stories 1, 2, AND 3 all work independently

---

## Phase 6: User Story 4 — Browse Restaurants Grouped by Menu (Priority: P4)

**Goal**: Users can see wishlisted restaurants grouped by menu item name and drill into each group

**Independent Test**: With menu items saved across restaurants, navigate to "By Menu" view, see unique menu names, tap one to see its restaurants

### Tests for User Story 4

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T036 [P] [US4] Unit test for useMenuGroups hook in tests/unit/db-hooks.test.ts — verify case-insensitive grouping (FR-008), verify count accuracy, verify group disappears when last item removed
- [ ] T037 [P] [US4] Unit test for useRestaurantsByMenu hook in tests/unit/db-hooks.test.ts — verify correct restaurants returned for a given normalizedName

### Implementation for User Story 4

- [ ] T038 [US4] Implement DB hooks: useMenuGroups, useRestaurantsByMenu in src/db/hooks.ts per contracts/db-hooks.ts (menu grouping operations)
- [ ] T039 [US4] Implement by-menu list page: display unique menu item names with restaurant count in src/app/by-menu/page.tsx (FR-006)
- [ ] T040 [US4] Implement by-menu detail page: display restaurants for a specific menu item in src/app/by-menu/[menu]/page.tsx (FR-006, FR-008)
- [ ] T041 [US4] E2E test for by-menu-list→tap-menu→view-restaurants flow in tests/e2e/by-menu.spec.ts

**Checkpoint**: All user stories fully functional and independently testable

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T042 [P] Add offline handling: disable search/map nav when offline, show OfflineBanner, keep wishlist/by-menu functional in src/app/layout.tsx (FR-010)
- [ ] T043 [P] Add loading states (skeleton/spinner) to all async pages: search, map, wishlist, by-menu in src/components/
- [ ] T044 [P] Verify WCAG 2.1 AA compliance: focus states, aria labels, color contrast, keyboard navigation across all components
- [ ] T045 Configure next.config.ts with output: 'export' for static site generation
- [ ] T046 Run full E2E test suite and fix any failures in tests/e2e/
- [ ] T047 Validate quickstart.md verification steps manually

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational — no other story dependencies
- **User Story 2 (Phase 4)**: Depends on Foundational — independent of US1
- **User Story 3 (Phase 5)**: Depends on Foundational — uses RestaurantCard from US1 but independently testable
- **User Story 4 (Phase 6)**: Depends on Foundational + US3 menu item hooks — needs menu items to exist
- **Polish (Phase 7)**: Depends on all user stories being complete

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- DB hooks before page components
- Shared components before pages that use them
- Core implementation before E2E tests

### Parallel Opportunities

- Setup: T003, T004, T005, T006 can all run in parallel
- Foundational: T010, T011, T013 can run in parallel (after T008)
- US1 tests: T015, T016, T017, T018 can all run in parallel
- US1 impl: T019, T020 can run in parallel (before T021, T022)
- US2 tests: T024, T025 can run in parallel
- US3 tests: T030, T031 can run in parallel
- US4 tests: T036, T037 can run in parallel
- Polish: T042, T043, T044 can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Search → Add → Wishlist flow works end-to-end
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. User Story 1 → Search + Wishlist (MVP!)
3. User Story 2 → Map discovery
4. User Story 3 → Menu item memos
5. User Story 4 → Browse by menu grouping
6. Polish → Offline, loading states, accessibility

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Tests MUST fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
