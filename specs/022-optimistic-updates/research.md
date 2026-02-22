# Research: Optimistic Updates & Star Rating Bug Fix

**Feature**: 022-optimistic-updates
**Date**: 2026-02-22

## R1: Star Rating Bug — Root Cause

**Decision**: The star rating bug for 4 and 5 is caused by a database CHECK constraint not being updated when feature #022 expanded the scale from 1-3 to 1-5. The fix is a database migration to widen the constraint.

**Rationale**:
- The TypeScript code correctly handles ratings 1-5 (union type `1 | 2 | 3 | 4 | 5` throughout)
- The StarRating component renders all 5 stars correctly (`[1, 2, 3, 4, 5] as const`)
- The Supabase mutation `.update({ star_rating: rating })` sends the value to Postgres
- If Postgres has `CHECK (star_rating BETWEEN 1 AND 3)`, values 4 and 5 are rejected
- The error is thrown but unhandled — `onStarChange` callbacks don't catch the promise rejection
- Result: silent failure, stars snap back to old value after refetch

**Alternatives considered**:
- Client-side type coercion bug: Ruled out — TypeScript union type and `as const` array are correct
- Supabase RLS blocking: Ruled out — RLS policies filter by user_id, not star_rating values
- Frontend rendering issue: Ruled out — `value !== null && star <= value` works for all values 1-5

**Fix**: Migration SQL to drop and recreate the CHECK constraint with range 1-5. Additionally, mutation callbacks must be awaited and errors caught (even without optimistic updates, this is a bug).

## R2: Optimistic Update Pattern for Custom Cache

**Decision**: Extend the existing `useSupabaseQuery` hook and `invalidate.ts` module to support direct cache writes (optimistic updates) alongside the existing refetch-based invalidation.

**Rationale**:
- The existing system uses a pub/sub pattern: `subscribe(key, refetchFn)` + `invalidate(key)` triggers refetch
- For optimistic updates, we need: `setCache(key, transformFn)` that directly updates the cached data without a network call
- On mutation: (1) snapshot current data, (2) apply optimistic transform, (3) fire server call, (4) on error: restore snapshot + invalidate to refetch
- This is the simplest extension of the existing system — no new libraries needed

**Alternatives considered**:
- **TanStack Query**: Full-featured with built-in optimistic updates. Rejected because it would require replacing the entire custom cache system, adding a dependency, and changing every query hook. Too much scope for this feature.
- **SWR**: Similar to TanStack Query but lighter. Same rejection reason — replacing the existing system.
- **Immer-based patches**: Undo support via patches. Overkill — snapshot/restore is simpler for this use case.

**Design**:

1. Add to `invalidate.ts`:
   - `getCache<T>(key): T | undefined` — read current cached value
   - `setCache<T>(key, value: T)` — write directly to cache (skips refetch)
   - Internal cache store: `Map<string, unknown>` alongside listeners

2. Add to `use-query.ts`:
   - `useSupabaseQuery` subscribes to both invalidation events AND cache set events
   - When `setCache(key, value)` is called, all subscribers update their local state immediately
   - When `invalidate(key)` is called, subscribers refetch from server (existing behavior)

3. Mutation hook pattern (e.g., `useUpdateStarRating`):
   ```
   1. snapshot = getCache(key)
   2. setCache(key, optimisticValue)   // instant UI update
   3. try { await supabase.update() }
   4. catch { setCache(key, snapshot); showError() }
   5. finally { invalidate(key) }      // reconcile with server truth
   ```

## R3: Error Feedback for Failed Mutations

**Decision**: Reuse the existing `Toast` component (type: "error") from feature #020 for error feedback on failed mutations.

**Rationale**:
- `Toast` component already supports `type: "success" | "error"` with appropriate styling
- It's positioned at the bottom of the screen, auto-dismisses after 3 seconds, and is tappable to dismiss
- No new component needed

**Alternatives considered**:
- Inline error state on the card: More complex (per-card error state), less consistent with existing patterns
- Browser `alert()`: Blocks UI, poor UX
- Console error only: Silent failure (current broken behavior)

## R4: Cross-View Consistency After Optimistic Update

**Decision**: The `invalidate()` call in the `finally` block ensures cross-view consistency. The optimistic `setCache()` only updates the specific cache key being mutated (e.g., `restaurants:visited`), while `invalidateRestaurants()` triggers refetch for ALL restaurant-related keys.

**Rationale**:
- Home page uses `RESTAURANTS_KEY`, `VISITED_KEY`, `WISHLIST_KEY`
- Detail page uses `restaurants:{kakaoPlaceId}`
- Search page uses `restaurant-status:{stableKey}`, `wishlisted-set:{stableKey}`
- Optimistic update touches the home page cache keys immediately
- The `finally { invalidateRestaurants() }` ensures all other views reconcile with server data
- Detail page gets its own `invalidate(restaurants:${kakaoPlaceId})` call (already in existing code)

**Risk**: Brief inconsistency between views during the network round-trip (e.g., home page shows new rating, detail page shows old rating). Acceptable trade-off — the detail page refetches on the `finally` invalidation within ~200ms.

## R5: Rapid Successive Mutations (Debouncing)

**Decision**: No debouncing needed. Each mutation overwrites the previous optimistic state immediately. The `finally { invalidate() }` on the last completed mutation reconciles with server truth.

**Rationale**:
- If user taps star 3, then star 5 quickly:
  - Mutation 1: setCache(3), server call starts
  - Mutation 2: setCache(5), server call starts (overwrites cache to 5)
  - Mutation 1 completes: invalidate() triggers refetch (shows server value, likely 3)
  - Mutation 2 completes: invalidate() triggers refetch (shows server value, now 5)
- Brief flicker possible between mutation 1 and 2 completion, but the final state is correct
- Debouncing would add complexity and delay the UI response (violating SC-002)

**Accepted risk**: Momentary flicker during rapid multi-mutation sequences. Mitigated by the fast network round-trip typical of Supabase (< 200ms). If this becomes a UX issue in practice, a future enhancement could skip the `finally { invalidate() }` for superseded mutations.
