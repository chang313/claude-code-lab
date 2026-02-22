# Data Model: Optimistic Updates & Star Rating Bug Fix

**Feature**: 022-optimistic-updates
**Date**: 2026-02-22

## Schema Changes

### Migration: Widen star_rating CHECK constraint

The `restaurants` table has a CHECK constraint limiting `star_rating` to 1-3 (from the original 3-star scale). This must be widened to 1-5.

**Migration SQL**:

```sql
-- Drop the old CHECK constraint (name may vary — check with \d restaurants)
ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_star_rating_check;

-- Add new constraint allowing 1-5
ALTER TABLE restaurants ADD CONSTRAINT restaurants_star_rating_check
  CHECK (star_rating IS NULL OR (star_rating >= 1 AND star_rating <= 5));
```

**Rollback SQL**:

```sql
-- Revert to 1-3 range (WARNING: will fail if any rows have star_rating > 3)
ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_star_rating_check;
ALTER TABLE restaurants ADD CONSTRAINT restaurants_star_rating_check
  CHECK (star_rating IS NULL OR (star_rating >= 1 AND star_rating <= 3));
```

**Notes**:
- Constraint name `restaurants_star_rating_check` is Postgres's auto-generated name. Run `\d restaurants` in Supabase SQL Editor to confirm the exact name before applying.
- No data migration needed — no rows have star_rating > 3 (those writes were rejected).
- Apply via Supabase Dashboard > SQL Editor BEFORE deploying the code changes.

## Client-Side Cache Model

No new entities. The existing `Restaurant` type and cache keys are reused. The change is behavioral — how cache values are updated.

### Cache Key Map (existing, unchanged)

| Key Pattern | Data Type | Used By |
|------------|-----------|---------|
| `restaurants` | `Restaurant[]` | Home page (all restaurants) |
| `restaurants:visited` | `SubcategoryGroup[]` | Home page visited section |
| `restaurants:wishlist` | `SubcategoryGroup[]` | Home page wishlist section |
| `restaurants:{kakaoPlaceId}` | `Restaurant \| null` | Detail page |
| `restaurant-status:{stableKey}` | `Map<string, "wishlist" \| "visited">` | Search page status |
| `wishlisted-set:{stableKey}` | `Set<string>` | Search page wishlist check |
| `wishlisted:{kakaoPlaceId}` | `boolean` | Per-item wishlist check |

### New Cache Operations (added to invalidate.ts)

| Operation | Signature | Purpose |
|-----------|-----------|---------|
| `getCache<T>(key)` | `(key: string) => T \| undefined` | Read current cached value for snapshot |
| `setCache<T>(key, value)` | `(key: string, value: T) => void` | Write optimistic value, notify subscribers |
| `subscribeToCache(key, setter)` | `(key: string, setter: (value: unknown) => void) => () => void` | Subscribe to direct cache writes |

### Optimistic Update Flow (per mutation)

```
[User Action]
     │
     ▼
┌─ Snapshot current cache ──┐
│  snapshot = getCache(key)  │
└───────────┬────────────────┘
            │
            ▼
┌─ Optimistic write ────────┐
│  setCache(key, newValue)   │ ← UI updates instantly
└───────────┬────────────────┘
            │
            ▼
┌─ Server mutation ──────────────────────────┐
│  try { await supabase.from().update() }    │
│  catch { setCache(key, snapshot); toast() }│ ← Rollback + error
│  finally { invalidateRestaurants() }       │ ← Reconcile all views
└────────────────────────────────────────────┘
```
