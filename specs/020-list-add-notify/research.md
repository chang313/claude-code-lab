# Research: Wishlist Add Feedback & Search Status Sync

**Branch**: `020-list-add-notify` | **Phase**: 0 | **Status**: Complete

## Decision Log

### Decision 1: Toast Component Strategy

**Decision**: Extend the existing `ErrorToast.tsx` into a general `Toast.tsx` with `type: "success" | "error"` prop rather than creating a new component.

**Rationale**: `ErrorToast` already implements auto-dismiss, click-to-dismiss, z-index positioning, and animation. A `type` prop that switches between red and green background covers both cases. Zero new files means zero new surface area.

**Alternatives Considered**:
- Create a new `SuccessToast.tsx` — rejected: duplicates dismiss logic, inconsistent API
- Use a third-party toast library (react-hot-toast, sonner) — rejected: Constitution Principle V (no new dependencies without justification; one simple component is sufficient)
- Keep `ErrorToast.tsx` and create a parallel `SuccessToast.tsx` — rejected: same dismissal duplication concern

### Decision 2: Search Card Status Update — Root Cause & Fix

**Decision**: Add the `useRestaurantStatusMap` cache key(s) to the `invalidateRestaurants()` helper in `src/db/hooks.ts`.

**Rationale**: The search page uses `useRestaurantStatusMap(ids)` which has its own cache key. When `addRestaurant()` is called, `invalidateRestaurants()` currently only invalidates `RESTAURANTS_KEY`, `VISITED_KEY`, and `WISHLIST_KEY` — not the status map key. Adding the status map key ensures `useRestaurantStatusMap` re-fetches after any wishlist mutation, making the card indicator update within 2 seconds (one network round-trip).

**Alternatives Considered**:
- Optimistic UI update (update local state immediately, reconcile on fetch) — valid but complex; the pub/sub invalidation system already re-fetches quickly (~200–400ms on local network), making optimistic updates premature complexity (Principle V)
- Derive saved status from the full restaurants list in the search page — would require joining two datasets client-side; `useRestaurantStatusMap` already does this efficiently

### Decision 3: Duplicate-tap Prevention

**Decision**: Disable the add button for the duration of the async `addRestaurant()` call using a loading state in `search/page.tsx`.

**Rationale**: `addRestaurant()` already returns `false` on unique constraint violation (error code `23505`), but the button should be visually disabled during the in-flight request to prevent race conditions. A simple `isAdding` boolean state per card ID is sufficient. No debouncing library needed.

**Alternatives Considered**:
- Server-side idempotency only — insufficient; two rapid taps before the first completes will both reach the DB
- Global loading state — too coarse; blocks all cards, not just the one being tapped

### Decision 4: Notification Trigger Location

**Decision**: Show the toast notification from `search/page.tsx` `handleAddToWishlist` and `handleAddAsVisited` callbacks, using component-level state (`toastMessage`, `toastType`).

**Rationale**: The search page already owns the `addRestaurant` mutation call and the `setSelectedPlace(null)` side effect. Adding toast state here keeps all mutation feedback in one place. No context or global state required.

**Alternatives Considered**:
- Toast from inside `useAddRestaurant()` hook — hooks should not have side effects on UI; would require injecting a notification mechanism into the hook (prop drilling or context), adding complexity
- Centralized notification context — over-engineered for one feature; could be introduced later if multiple pages need toast feedback

## Codebase Findings

| Item | Finding |
|------|---------|
| Existing toast | `ErrorToast.tsx` — error-only, red background, auto-dismiss |
| Wishlist mutation | `useAddRestaurant()` in `src/db/hooks.ts` — returns `boolean` (false on duplicate) |
| Status map query | `useRestaurantStatusMap(ids)` in `src/db/search-hooks.ts` — own cache key, NOT currently in `invalidateRestaurants()` |
| Card saved indicator | `RestaurantCard.tsx` — already shows "저장됨" when `savedStatus !== null` |
| No new DB schema | `restaurants` table (single table, `star_rating` discriminates wishlist vs visited) |
| No new dependencies | All needed: existing hooks, toast extension, React state |

## Files to Touch

| File | Change |
|------|--------|
| `src/components/ErrorToast.tsx` | Rename to `Toast.tsx`, add `type: "success" \| "error"` prop, switch color |
| `src/db/hooks.ts` | Add status map key to `invalidateRestaurants()` |
| `src/app/search/page.tsx` | Add toast state, show on add success/error, add per-card loading state |
| `src/components/RestaurantCard.tsx` | Accept `isAdding?: boolean` prop to disable add button during in-flight request |
| All `ErrorToast` imports | Update import path from `ErrorToast` to `Toast` with `type="error"` |
