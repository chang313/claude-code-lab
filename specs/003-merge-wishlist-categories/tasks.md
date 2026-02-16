# Tasks: Merge Wishlist & Category View

**Input**: Design documents from `/specs/003-merge-wishlist-categories/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/hooks-api.md, quickstart.md

**Tests**: Included per constitution (Principle II: Testing Standards — TDD required).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Type definitions needed by all user stories

- [x] T001 Add `SubcategoryGroup` interface to `src/types/index.ts` with fields: `subcategory: string`, `restaurants: Restaurant[]`, `count: number`. Do NOT remove `MenuItem`/`MenuGroup` yet (US3 handles that).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Pure utility functions with TDD — required before any user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests (write FIRST, must FAIL before implementation)

- [x] T002 [P] Write unit tests for `extractSubcategory()` in `tests/unit/subcategory.test.ts`. Test cases from spec/data-model: (1) `"음식점 > 한식 > 냉면"` → `"냉면"`, (2) `"음식점 > 일식 > 초밥,롤"` → `"초밥,롤"`, (3) `"음식점 > 한식"` → `"한식"` (two levels), (4) `"음식점"` → `"음식점"` (no separator), (5) `""` → `"기타"` (empty), (6) `undefined`/`null` → `"기타"` (missing).
- [x] T003 [P] Write unit tests for `groupBySubcategory()` in `tests/unit/subcategory.test.ts`. Test cases: (1) Groups restaurants by extracted subcategory, (2) Groups sorted alphabetically by subcategory name, (3) Restaurants within group sorted by starRating desc then createdAt desc, (4) `"기타"` group always appears last, (5) Empty array returns empty array, (6) Restaurants with same subcategory from different parent categories grouped together.

### Implementation

- [x] T004 [P] Implement `extractSubcategory(category: string): string` in `src/lib/subcategory.ts`. Split by `" > "`, take last segment trimmed. Return `"기타"` for empty/null/undefined. Verify T002 tests pass.
- [x] T005 [P] Implement `groupBySubcategory(restaurants: Restaurant[]): SubcategoryGroup[]` in `src/lib/subcategory.ts`. Group by extracted subcategory, sort groups alphabetically with `"기타"` last, sort restaurants within each group by starRating desc then createdAt desc. Verify T003 tests pass.

**Checkpoint**: All 6 unit tests pass. `extractSubcategory` and `groupBySubcategory` are verified.

---

## Phase 3: User Story 1 + 2 — View Wishlist Grouped by Subcategory + Auto-Extraction (Priority: P1) 🎯 MVP

**Goal**: Replace the flat wishlist with a grouped view where restaurants are automatically organized by their Kakao subcategory. US1 (grouped view) and US2 (auto-extraction) share the same implementation — extraction happens at query time inside the grouped hook.

**Independent Test**: Add several restaurants with different Kakao `category_name` values. Open Wishlist tab. Verify they appear in collapsible accordion groups sorted alphabetically, with restaurants within each group sorted by star rating.

### Implementation

- [x] T006 [US1] Implement `useWishlistGrouped()` hook in `src/db/hooks.ts`. Fetch all restaurants via `useSupabaseQuery` (same query as `useWishlist`), then pipe through `groupBySubcategory()`. Subscribe to `RESTAURANTS_KEY` for invalidation. Return `{ groups: SubcategoryGroup[], isLoading: boolean }`.
- [x] T007 [US1] Create `CategoryAccordion` component in `src/components/CategoryAccordion.tsx`. Props: `subcategory: string`, `count: number`, `children: ReactNode`, `defaultExpanded?: boolean` (default `true`). Render clickable header with subcategory name + count badge + chevron indicator. Toggle body visibility on header click using `useState`. Use Tailwind for styling consistent with existing card styles (`bg-white rounded-xl shadow-sm border border-gray-100`). Include `aria-expanded` attribute for accessibility.
- [x] T008 [US1] Rewrite `src/app/page.tsx` to use `useWishlistGrouped()` instead of `useWishlist()`. Render each group inside a `CategoryAccordion`. Inside each accordion, render `RestaurantCard` components with existing `onStarChange`, `onRemove`, and `onClick` handlers (FR-012, FR-013). Preserve empty state message (FR: "No restaurants saved yet" with search/map suggestion). Preserve loading state.

**Checkpoint**: Wishlist tab shows restaurants grouped by subcategory in collapsible accordions. Star ratings, remove, and navigation to detail page all work. Empty and loading states work. US1 acceptance scenarios 1-4 verified. US2 acceptance scenarios 1-3 verified (extraction visible in grouping).

---

## Phase 4: User Story 3 — Remove Manual Menu Item Management (Priority: P2)

**Goal**: Remove the "By Menu" tab, manual menu item management UI, and all related code. Simplify navigation from 5 tabs to 4.

**Independent Test**: Verify bottom nav shows exactly 4 tabs (Wishlist, Search, Map, My). Verify restaurant detail page has no menu item section. Verify `/by-menu` route no longer exists.

### Implementation

- [x] T009 [P] [US3] Remove "By Menu" tab entry from `tabs` array in `src/components/BottomNav.tsx`. Result: 4 tabs — Wishlist (`/`), Search (`/search`), Map (`/map`), My (`/my`).
- [x] T010 [P] [US3] Delete entire `src/app/by-menu/` directory (both `page.tsx` and `[menu]/page.tsx`).
- [x] T011 [P] [US3] Remove menu items section from `src/app/restaurant/[id]/page.tsx`: remove the `<h2>Menu Items</h2>` section, `MenuItemList` component usage, and imports of `useMenuItems`, `useAddMenuItem`, `useRemoveMenuItem` from `@/db/hooks`. Remove `MenuItemList` import.
- [x] T012 [US3] Remove menu item hooks from `src/db/hooks.ts`: delete `useMenuItems()`, `useAddMenuItem()`, `useRemoveMenuItem()`, `useMenuGroups()`, `useRestaurantsByMenu()`, the `DbMenuItem` interface, the `mapDbMenuItem()` function, and the `MENU_ITEMS_KEY` constant. Also remove the `invalidate(MENU_ITEMS_KEY)` call from `useRemoveRestaurant()`.
- [x] T013 [P] [US3] Delete `src/components/MenuItemList.tsx`.
- [x] T014 [P] [US3] Delete `src/lib/normalize.ts`.
- [x] T015 [US3] Remove `MenuItem` and `MenuGroup` interfaces from `src/types/index.ts`. Keep `SubcategoryGroup` (added in T001). Remove `normalizeMenuName` import from `src/db/hooks.ts` if still present.
- [x] T016 [US3] Update `tests/unit/db-hooks.test.ts`: remove the `normalizeMenuName` describe block and its import from `@/lib/normalize`. Keep the invalidation event bus tests unchanged.

**Checkpoint**: Bottom nav shows 4 tabs. Restaurant detail has no menu items section. No references to menu items remain in source code. All tests pass.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verification and cleanup

- [x] T017 Run all unit tests via `pnpm exec vitest run` and verify all pass
- [x] T018 Run TypeScript type check via `pnpm exec tsc --noEmit` and verify no errors
- [x] T019 Run production build via `pnpm exec next build` and verify success
- [x] T020 Verify no dead imports or unused code remains (check for any remaining references to `MenuItem`, `MenuGroup`, `MenuItemList`, `normalizeMenuName`, `by-menu`, `MENU_ITEMS_KEY`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T001 provides `SubcategoryGroup` type)
- **US1+US2 (Phase 3)**: Depends on Phase 2 (needs `extractSubcategory` + `groupBySubcategory`)
- **US3 (Phase 4)**: Depends on Phase 1 only — can run in parallel with Phase 2 & 3
- **Polish (Phase 5)**: Depends on all phases complete

### User Story Dependencies

- **US1+US2 (P1)**: Depends on Foundational (Phase 2). This is the MVP.
- **US3 (P2)**: Independent of US1/US2. Can start as early as after Phase 1. Only dependency: don't remove `MenuItem`/`MenuGroup` types until US3 phase.

### Within Each Phase

```
Phase 2: T002 + T003 (parallel, tests first) → T004 + T005 (parallel, implementation)
Phase 3: T006 → T007 → T008 (sequential: hook → component → page)
Phase 4: T009 + T010 + T011 + T013 + T014 (parallel) → T012 → T015 → T016
Phase 5: T017 → T018 → T019 → T020 (sequential verification)
```

### Parallel Opportunities

- T002 + T003: Both test files can be written simultaneously
- T004 + T005: Both utility functions in same file but independent logic
- T009 + T010 + T011 + T013 + T014: All touch different files, fully parallelizable
- **US3 (Phase 4) can run entirely in parallel with US1+US2 (Phase 3)** if two developers are available

---

## Parallel Example: Phase 4 (US3)

```
# These 5 tasks touch different files and can run in parallel:
T009: BottomNav.tsx — remove By Menu tab
T010: Delete by-menu/ directory
T011: restaurant/[id]/page.tsx — remove menu section
T013: Delete MenuItemList.tsx
T014: Delete normalize.ts

# Then sequentially:
T012: hooks.ts — remove menu hooks (must be after T011 removes imports)
T015: types/index.ts — remove MenuItem/MenuGroup types
T016: db-hooks.test.ts — remove normalizeMenuName tests
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002-T005) — TDD
3. Complete Phase 3: US1+US2 (T006-T008)
4. **STOP and VALIDATE**: Grouped wishlist works. Star ratings, remove, navigation all work.
5. Deploy/demo if ready — users can already see categorized wishlist

### Full Delivery

1. MVP (Phases 1-3) → Grouped wishlist working
2. Add Phase 4: US3 → Menu items removed, 4-tab nav
3. Phase 5: Polish → All tests pass, build succeeds, no dead code

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- TDD per constitution: T002+T003 tests MUST fail before T004+T005 implementation
- No database migration needed — subcategory computed at query time
- `menu_items` table retained in Supabase — only application code removed
- Commit after each phase or logical group of tasks
