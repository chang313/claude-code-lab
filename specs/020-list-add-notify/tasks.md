# Tasks: Wishlist Add Feedback & Search Status Sync

**Input**: Design documents from `specs/020-list-add-notify/`
**Branch**: `020-list-add-notify`
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

**Organization**: Tasks grouped by user story. US1 (toast notification) and US2 (card status fix) are independently implementable after the shared Toast component is in place.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[US1]**: Add-to-List Confirmation Notification (P1)
- **[US2]**: Search Result Card Reflects Saved Status (P2)

---

## Phase 1: Foundational — Toast Component (blocks US1)

**Purpose**: Extend the existing `ErrorToast.tsx` into a reusable typed `Toast.tsx`. Both US1 wiring and all existing error toasts depend on this. Must complete before Phase 2.

**⚠️ CRITICAL**: US1 implementation cannot begin until T002 is complete.

- [x] T001 Read `src/components/ErrorToast.tsx` and `src/db/search-hooks.ts` to understand existing implementation and locate `useRestaurantStatusMap` cache key before any changes
- [x] T002 Create `src/components/Toast.tsx` by copying `ErrorToast.tsx` and adding `type: "success" | "error"` prop — `type="success"` uses `bg-green-600`, `type="error"` uses `bg-red-600`; keep all other behavior (auto-dismiss, click-dismiss, position, animation) unchanged
- [x] T003 Update every `ErrorToast` import in the codebase to import `Toast` with `type="error"` (run `grep -r "ErrorToast" src/` to find all usages), then delete `src/components/ErrorToast.tsx`

**Checkpoint**: `Toast.tsx` exists, no `ErrorToast` references remain, existing error toasts still render correctly.

---

## Phase 2: User Story 1 — Add-to-List Confirmation Notification (Priority: P1) 🎯 MVP

**Goal**: When a user taps "+ 추가" or "★" in search results, a success toast appears immediately. If saving fails, an error toast appears instead. The button is disabled for the duration of the request to prevent duplicate taps.

**Independent Test**: Search for any restaurant → tap "+ 추가" → confirm green toast "목록에 추가했어요" appears within 1 second and auto-dismisses after 3 seconds. Tap the button rapidly → confirm only one toast appears.

- [x] T004 [US1] Add `toast` state (`{ message: string; type: "success" | "error" } | null`) and `addingId` state (`string | null`) to `src/app/search/page.tsx`, initialized to `null`
- [x] T005 [US1] Update `handleAddToWishlist` in `src/app/search/page.tsx`: set `addingId` before the call, show success toast `{ message: "목록에 추가했어요", type: "success" }` when `addRestaurant()` returns `true`, show error toast `{ message: "저장에 실패했어요. 다시 시도해주세요.", type: "error" }` on thrown exception, clear `addingId` in `finally`
- [x] T006 [US1] Apply the same toast/error/addingId pattern to `handleAddAsVisited` in `src/app/search/page.tsx` (success message: `"목록에 추가했어요"`, same error message)
- [x] T007 [P] [US1] Add `isAdding?: boolean` prop to `RestaurantCard` in `src/components/RestaurantCard.tsx`; when `true`, set `disabled` and `className` with `opacity-50 pointer-events-none` on both the "+ 추가" and "★" buttons in the `search-result` variant
- [x] T008 [US1] Render `<Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />` in `src/app/search/page.tsx` (conditionally when `toast !== null`), and pass `isAdding={addingId === place.id}` to each `RestaurantCard` in the search results list

**Checkpoint**: US1 is fully functional. Success and error toasts appear; button is disabled during the request. US2 (card status) is not yet fixed.

---

## Phase 3: User Story 2 — Search Result Card Reflects Saved Status (Priority: P2)

**Goal**: After adding a restaurant from the search results, the card's saved indicator ("♡ 저장됨") updates immediately without a page reload.

**Independent Test**: Add a restaurant → without reloading, confirm the card changes from "+ 추가" to "♡ 저장됨" within 2 seconds.

**Root Cause**: `invalidateRestaurants()` in `src/db/hooks.ts` does not currently invalidate the cache key used by `useRestaurantStatusMap`. Adding it will trigger a re-fetch of the status map after any wishlist mutation.

- [x] T009 [US2] Read `src/db/search-hooks.ts` to identify the exact cache key string(s) used by `useRestaurantStatusMap` (e.g., `"status-map:..."` or per-id keys like `"wishlisted:{id}"`)
- [x] T010 [US2] Add the `useRestaurantStatusMap` cache key(s) found in T009 to `invalidateRestaurants()` in `src/db/hooks.ts` so the status map re-fetches after any add/remove mutation

**Checkpoint**: US2 is fully functional. Restaurant card updates to saved state immediately after adding, without any page reload. Both US1 and US2 work together.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Verification and final cleanup.

- [x] T011 [P] Run `/verify-build` to confirm all three gates pass: `tsc --noEmit` → `pnpm build` → `pnpm test`
- [ ] T012 [P] Manual smoke test per `specs/020-list-add-notify/quickstart.md`: add a restaurant → verify green toast → verify card shows "저장됨" → reload → verify card still shows "저장됨" → simulate error → verify red toast

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 2)**: Depends on T002 (Toast.tsx must exist) — BLOCKS US1 wiring
- **US2 (Phase 3)**: Independent of US1 — can start after Phase 1 (T001 read needed for T009)
- **Polish (Phase 4)**: Depends on both US1 and US2 complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational (Toast.tsx). Independent of US2.
- **US2 (P2)**: Depends only on T001 (read search-hooks.ts). Independent of US1.

### Within Each Story

- US1: T004 → T005, T006 (parallel) → T007 (parallel) → T008 (needs T004-T007)
- US2: T009 → T010

### Parallel Opportunities

- T005 and T006 (both update handlers in the same file, but different functions — coordinate)
- T007 (RestaurantCard) is fully parallel with T004/T005/T006 (different file)
- T009/T010 (US2) is fully parallel with T004–T008 (US1) after Phase 1

---

## Parallel Example: After Phase 1

```bash
# These can run in parallel (different files):
Task: "T007 - Add isAdding prop to RestaurantCard.tsx"
Task: "T009 - Read search-hooks.ts and identify cache key"

# After T009 completes:
Task: "T010 - Fix invalidateRestaurants() in hooks.ts"

# After T004-T007 complete:
Task: "T008 - Wire Toast render and isAdding pass-through in search/page.tsx"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Foundational (T001–T003)
2. Complete Phase 2: US1 (T004–T008)
3. **STOP and VALIDATE**: Toast appears on add, button disables during request
4. Ship US1 as the MVP increment

### Incremental Delivery

1. Foundation (Phase 1) → Toast component ready
2. US1 (Phase 2) → Notification feedback working → Demo/deploy
3. US2 (Phase 3) → Card status sync fixed → Demo/deploy
4. Polish (Phase 4) → Build verified → PR ready

---

## Notes

- T001 is a **read-only step** — do not modify files during T001; it informs T009
- T003 includes file deletion — run `grep -r "ErrorToast" src/` before deleting to confirm zero remaining imports
- T007 must be backward-compatible: `isAdding` is optional; undefined behaves like `false`
- Total tasks: **12** | US1: 5 tasks | US2: 2 tasks | Foundational: 3 tasks | Polish: 2 tasks
