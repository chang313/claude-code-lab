# Data Model: 014-visited-wishlist

**Date**: 2026-02-21

## Schema Changes

### `restaurants` Table

**Change**: Make `star_rating` column nullable with default `NULL`.

#### Current Schema (relevant columns)
```sql
star_rating INTEGER NOT NULL DEFAULT 1  -- Always 1-3
```

#### New Schema (relevant columns)
```sql
star_rating INTEGER DEFAULT NULL  -- NULL = wishlist, 1-3 = visited
-- CHECK constraint: star_rating IS NULL OR star_rating BETWEEN 1 AND 3
```

#### State Mapping

| `star_rating` value | List Type | Label |
|---------------------|-----------|-------|
| `NULL` | Wishlist | 위시 리스트 |
| `1` | Visited | 맛집 리스트 |
| `2` | Visited | 맛집 리스트 |
| `3` | Visited | 맛집 리스트 |

### Entity: Restaurant (updated)

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | UUID | NO | Primary key |
| user_id | UUID | NO | FK → auth.users |
| kakao_place_id | TEXT | NO | Kakao place identifier |
| name | TEXT | NO | Restaurant name |
| address | TEXT | NO | Full address |
| category | TEXT | NO | Kakao category path |
| lat | FLOAT | NO | Latitude |
| lng | FLOAT | NO | Longitude |
| place_url | TEXT | YES | Kakao Place URL |
| star_rating | INTEGER | **YES** (changed) | NULL = wishlist, 1-3 = visited |
| created_at | TIMESTAMPTZ | NO | Auto-generated |

### State Transitions

```
[Not Saved] ---(add from search "+" button)--→ [Wishlist: star_rating = NULL]
[Not Saved] ---(add from search ★ icon)----→ [Visited: star_rating = 1/2/3]
[Wishlist]  ---(tap star to rate)----------→ [Visited: star_rating = 1/2/3]
[Visited]   ---(move back to wishlist)-----→ [Wishlist: star_rating = NULL]
[Wishlist]  ---(delete)--------------------→ [Not Saved]
[Visited]   ---(delete)--------------------→ [Not Saved]
```

### Indexes

No new indexes required. The existing sort order (`star_rating DESC, created_at DESC`) naturally groups visited (1-3) above wishlist (NULL, sorted last in DESC).

**Note**: PostgreSQL sorts NULLs first in DESC order by default. To keep visited restaurants above wishlist, use `ORDER BY star_rating DESC NULLS LAST, created_at DESC`.

## Migration SQL

Run in **Supabase Dashboard > SQL Editor** before deploying.

```sql
-- 014-visited-wishlist: Make star_rating nullable for wishlist support
-- Existing rows (all have star_rating 1-3) remain unchanged = "visited"
-- New rows default to NULL = "wishlist"

-- Step 1: Remove NOT NULL constraint and change default
ALTER TABLE restaurants
  ALTER COLUMN star_rating DROP NOT NULL,
  ALTER COLUMN star_rating SET DEFAULT NULL;

-- Step 2: Add CHECK constraint to enforce valid values
ALTER TABLE restaurants
  ADD CONSTRAINT star_rating_valid
  CHECK (star_rating IS NULL OR (star_rating >= 1 AND star_rating <= 3));
```

### Rollback SQL (if needed)

```sql
-- Rollback: restore NOT NULL with default 1
-- First, backfill any NULL values
UPDATE restaurants SET star_rating = 1 WHERE star_rating IS NULL;

-- Remove check constraint
ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS star_rating_valid;

-- Restore NOT NULL
ALTER TABLE restaurants
  ALTER COLUMN star_rating SET NOT NULL,
  ALTER COLUMN star_rating SET DEFAULT 1;
```

## TypeScript Type Changes

### `Restaurant` interface (src/types/index.ts)

```typescript
export interface Restaurant {
  id: string;
  name: string;
  address: string;
  category: string;
  lat: number;
  lng: number;
  placeUrl?: string;
  starRating: number | null;  // Changed: null = wishlist, 1-3 = visited
  createdAt: string;
}
```

### Derived helpers

```typescript
// Utility to determine list type from restaurant
export function isVisited(restaurant: Restaurant): boolean {
  return restaurant.starRating !== null;
}
```

## Query Patterns

### Fetch visited restaurants (맛집 리스트)
```sql
SELECT * FROM restaurants
WHERE star_rating IS NOT NULL
ORDER BY star_rating DESC, created_at DESC;
```

### Fetch wishlist restaurants (위시 리스트)
```sql
SELECT * FROM restaurants
WHERE star_rating IS NULL
ORDER BY created_at DESC;
```

### Add to wishlist (default)
```sql
INSERT INTO restaurants (user_id, kakao_place_id, name, ..., star_rating)
VALUES ($1, $2, $3, ..., NULL);
```

### Add as visited (with rating)
```sql
INSERT INTO restaurants (user_id, kakao_place_id, name, ..., star_rating)
VALUES ($1, $2, $3, ..., $rating);  -- $rating = 1, 2, or 3
```

### Mark as visited (promote from wishlist)
```sql
UPDATE restaurants SET star_rating = $rating
WHERE kakao_place_id = $id;
```

### Move back to wishlist (demote from visited)
```sql
UPDATE restaurants SET star_rating = NULL
WHERE kakao_place_id = $id;
```

## RLS Impact

No RLS policy changes required. The existing per-user read/write policies remain valid — `star_rating` nullable doesn't affect row-level security.
