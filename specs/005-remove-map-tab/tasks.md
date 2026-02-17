# Tasks: Remove Map Tab

**Input**: Design documents from `/specs/005-remove-map-tab/`
**Prerequisites**: plan.md (required), spec.md (required)

## Phase 1: User Story 1 — Simplified Navigation (P1)

**Goal**: Remove Map tab from navigation and redirect `/map` → `/search`

- [x] T001 [US1] Remove Map tab entry from `src/components/BottomNav.tsx`
- [x] T002 [US1] Add `/map` → `/search` permanent redirect in `next.config.ts`

**Checkpoint**: App shows 3 tabs; visiting `/map` redirects to `/search`

---

## Phase 2: User Story 2 — Clean Removal (P2)

**Goal**: Delete dead code left behind by removing the Map page

- [x] T003 [US2] Delete `src/app/map/page.tsx`
- [x] T004 [US2] Remove `searchByBounds` from `src/lib/kakao.ts` (only used by Map page)

**Checkpoint**: Build succeeds with no dead code

---

## Phase 3: Polish

- [x] T005 Build verification (`pnpm build`) — passed

---

## Dependencies

- T001 and T002 can run in parallel (different files)
- T003 and T004 can run in parallel (different files)
- T005 depends on all previous tasks
