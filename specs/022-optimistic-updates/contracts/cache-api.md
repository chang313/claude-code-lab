# Internal API Contract: Cache System Extensions

**Feature**: 022-optimistic-updates
**Date**: 2026-02-22

This feature has no external API changes. All contracts are internal (client-side cache system).

## Module: `src/lib/supabase/invalidate.ts`

### New Exports

#### `getCache<T>(key: string): T | undefined`

Returns the current cached value for the given key, or `undefined` if no value is cached.

**Usage**: Called by mutation hooks to snapshot the current state before applying an optimistic update.

#### `setCache<T>(key: string, value: T): void`

Directly sets the cached value for the given key and notifies all subscribers registered via `subscribeToCache()`.

**Usage**: Called by mutation hooks to apply optimistic updates.

**Behavior**:
- Stores `value` in internal cache store
- Calls all registered cache setters for this key
- Does NOT trigger refetch listeners (that's what `invalidate()` does)

#### `subscribeToCache(key: string, setter: (value: unknown) => void): () => void`

Registers a callback that is invoked whenever `setCache()` is called for this key. Returns an unsubscribe function.

**Usage**: Called by `useSupabaseQuery` to receive optimistic updates.

### Existing Exports (unchanged)

- `subscribe(key, listener)` — refetch on invalidation
- `invalidate(key)` — trigger refetch
- `invalidateByPrefix(prefix)` — trigger refetch by prefix
- `invalidateAll()` — trigger all refetches

## Module: `src/lib/supabase/use-query.ts`

### Modified: `useSupabaseQuery<T>(key, queryFn, deps)`

**Behavioral change**: Now subscribes to both invalidation events AND cache set events.

- On `invalidate(key)`: refetches from server (existing behavior)
- On `setCache(key, value)`: updates `data` state directly without refetch (new behavior)

**Return type unchanged**: `{ data: T | undefined; isLoading: boolean }`

## Module: `src/db/hooks.ts`

### Modified Mutation Hooks

All 5 mutation hooks gain optimistic update + error rollback behavior:

| Hook | Optimistic Behavior | Rollback on Error |
|------|--------------------|--------------------|
| `useUpdateStarRating()` | Sets new rating in visited groups cache | Restores previous rating |
| `useMarkAsVisited()` | Moves item from wishlist to visited groups cache | Restores item to wishlist |
| `useMoveToWishlist()` | Moves item from visited to wishlist groups cache | Restores item to visited |
| `useRemoveRestaurant()` | Removes item from relevant groups cache | Restores item to list |
| `useAddRestaurant()` | N/A (no existing cache entry to optimistically update) | N/A |

**Error handling**: All mutation hooks now return error state or accept an `onError` callback. Failed mutations call `setCache(key, snapshot)` to rollback, then `invalidateRestaurants()` to reconcile.
