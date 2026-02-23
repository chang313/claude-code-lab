# Data Model: Naver Import Category Auto-Enrichment

**Feature**: 026-naver-category-enrichment
**Date**: 2026-02-23

## Schema Changes

### Modified Table: `import_batches`

Add a column to track how many restaurants received categories (distinct from `enriched_count` which tracks full Kakao place matches).

| New Column          | Type    | Constraints             | Description                                         |
|---------------------|---------|-------------------------|-----------------------------------------------------|
| categorized_count   | integer | NOT NULL, default 0     | Restaurants with non-empty category after enrichment |

**Relationship to existing columns**:
- `enriched_count`: Restaurants matched by name+coordinates (full match — kakao_place_id, category, place_url all updated)
- `categorized_count`: Restaurants with any non-empty category (includes full matches + coordinate-only fallback matches)
- Invariant: `categorized_count >= enriched_count` (every full match also has a category)

### Existing Table: `restaurants` (no schema changes)

The `category` field (text, NOT NULL, default `''`) already supports the transition from empty to Kakao category string. No schema change needed.

**Category field states**:
| State | Value | How it got there |
|-------|-------|-----------------|
| Uncategorized | `""` | Initial import, or failed enrichment |
| Name-matched | `"음식점 > 한식"` | Full Kakao match (name + coordinates) |
| Coordinate-fallback | `"음식점 > 카페"` | Coordinate-only match (category set, kakao_place_id remains synthetic) |

## Migration SQL

```sql
-- Add categorized_count to import_batches
ALTER TABLE import_batches
  ADD COLUMN categorized_count integer NOT NULL DEFAULT 0;

-- Backfill: set categorized_count = enriched_count for existing batches
-- (before this feature, every enriched restaurant also got a category)
UPDATE import_batches
  SET categorized_count = enriched_count;

-- Index for retroactive re-enrichment: find uncategorized restaurants efficiently
CREATE INDEX idx_restaurants_empty_category
  ON restaurants(user_id)
  WHERE category = '';
```

## Entity Relationships (unchanged)

```
auth.users ─┬── 1:N ── restaurants
             └── 1:N ── import_batches

import_batches ── 1:N ── restaurants (via import_batch_id FK)
```

## Key Constraints

- `categorized_count` is updated at the END of `enrichBatch()`, counting all restaurants in the batch with non-empty `category` after the enrichment pass.
- The retroactive re-enrichment route operates on restaurants across all batches (and even those without a batch), so it does NOT update any batch's `categorized_count`. It works at the individual restaurant level only.
- The partial index `idx_restaurants_empty_category` enables efficient lookup of uncategorized restaurants per user without scanning the full table.
