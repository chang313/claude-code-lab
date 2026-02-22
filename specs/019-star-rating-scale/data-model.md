# Data Model: Change Star Rating Scale to 5

**Branch**: `019-star-rating-scale` | **Date**: 2026-02-22

## Entity Changes

### Restaurant (existing)

No schema change required. The `star_rating` column is an existing nullable integer.

| Field | Type | Change | Notes |
|-------|------|--------|-------|
| `star_rating` | `integer \| null` | Application-layer only | Valid range widens from 1-3 to 1-5. Null = wishlist. |

### TypeScript Type Changes

**Before**:
```typescript
// StarRating value type used across the app
value: 1 | 2 | 3 | null   // null = wishlist
onChange: (rating: 1 | 2 | 3) => void
```

**After**:
```typescript
// StarRating value type used across the app
value: 1 | 2 | 3 | 4 | 5 | null   // null = wishlist
onChange: (rating: 1 | 2 | 3 | 4 | 5) => void
```

## Migration SQL

No migration required. The Supabase `restaurants.star_rating` integer column already accepts values 1-5.

Optional (recommended for data integrity):
```sql
-- Add CHECK constraint to enforce valid rating range at DB level
ALTER TABLE restaurants
ADD CONSTRAINT star_rating_range
CHECK (star_rating IS NULL OR (star_rating >= 1 AND star_rating <= 5));
```

This constraint is optional — the application layer enforces valid values via TypeScript types. Apply only if you want defense-in-depth at the database level.
