# Data Model: Naver Map Import

**Feature**: 017-naver-map-import
**Date**: 2026-02-22

## New Table: `import_batches`

Tracks each import action for history display and batch undo.

| Column          | Type          | Constraints                    | Description                        |
|-----------------|---------------|--------------------------------|------------------------------------|
| id              | uuid          | PK, default gen_random_uuid()  | Batch identifier                   |
| user_id         | uuid          | FK → auth.users, NOT NULL      | Owner of the import                |
| source_name     | text          | NOT NULL                       | Naver folder name or shareId       |
| share_id        | text          | NOT NULL                       | Naver shareId used for the import  |
| imported_count  | integer       | NOT NULL, default 0            | Number of restaurants imported     |
| skipped_count   | integer       | NOT NULL, default 0            | Number of duplicates skipped       |
| invalid_count   | integer       | NOT NULL, default 0            | Entries skipped due to invalid data |
| enrichment_status | text        | NOT NULL, default 'pending'    | One of: pending, running, completed, failed |
| enriched_count  | integer       | NOT NULL, default 0            | Restaurants successfully enriched  |
| created_at      | timestamptz   | NOT NULL, default now()        | When the import was performed      |

**RLS Policy**: Users can only read/delete their own import batches.

## Modified Table: `restaurants`

Add nullable FK to link imported restaurants to their batch.

| New Column       | Type   | Constraints                          | Description                        |
|------------------|--------|--------------------------------------|------------------------------------|
| import_batch_id  | uuid   | FK → import_batches(id), NULLABLE    | NULL for search-added restaurants   |

**Index**: `idx_restaurants_import_batch_id ON restaurants(import_batch_id) WHERE import_batch_id IS NOT NULL` — partial index for batch lookups and undo operations.

## Entity Relationships

```
auth.users ─┬── 1:N ── restaurants (existing)
             └── 1:N ── import_batches (new)

import_batches ── 1:N ── restaurants (via import_batch_id FK)
```

## Key Constraints

- `restaurants.kakao_place_id` is used as the unique key per user for search-added restaurants. For Naver imports without a Kakao match, a synthetic ID is generated in the format `naver_{py}_{px}` (latitude_longitude, truncated to 6 decimal places, e.g., `naver_37.497900_127.027600`). The `naver_` prefix guarantees no collision with real Kakao place IDs (which are numeric strings like `1234567890`).
- When enrichment finds a Kakao match, the synthetic `kakao_place_id` is replaced with the real Kakao place ID via `UPDATE restaurants SET kakao_place_id = ?, category = ?, place_url = ? WHERE kakao_place_id = ?`.
- Duplicate detection is application-level (name + Haversine proximity < 50m), not a DB unique constraint, because coordinates are approximate.
- Batch undo (`DELETE FROM restaurants WHERE import_batch_id = ? AND star_rating IS NULL`) preserves rated restaurants — users who rated an imported restaurant have "claimed" it.
- Name matching for enrichment uses case-insensitive substring match after stripping whitespace: either the Naver name contains the Kakao name or vice versa. If multiple Kakao results pass within 100m, the closest by distance wins.

## Migration SQL

```sql
-- 1. Create import_batches table
CREATE TABLE import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_name text NOT NULL,
  share_id text NOT NULL,
  imported_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  invalid_count integer NOT NULL DEFAULT 0,
  enrichment_status text NOT NULL DEFAULT 'pending',
  enriched_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. RLS for import_batches
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own import batches"
  ON import_batches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own import batches"
  ON import_batches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own import batches"
  ON import_batches FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Add import_batch_id to restaurants
ALTER TABLE restaurants
  ADD COLUMN import_batch_id uuid REFERENCES import_batches(id) ON DELETE SET NULL;

-- 4. Partial index for batch lookups
CREATE INDEX idx_restaurants_import_batch_id
  ON restaurants(import_batch_id)
  WHERE import_batch_id IS NOT NULL;

-- 5. Index for batch list queries
CREATE INDEX idx_import_batches_user_id
  ON import_batches(user_id, created_at DESC);
```

## Naver Bookmark Response Type (for parsing)

```typescript
interface NaverBookmark {
  displayname: string;
  name?: string;
  px: number;  // longitude
  py: number;  // latitude
  address: string;
}

interface NaverBookmarkResponse {
  bookmarkList: NaverBookmark[];
}
```

## Data Mapping: Naver → Restaurant

| Naver Field    | Restaurant Column  | Transform                                |
|----------------|--------------------|------------------------------------------|
| displayname    | name               | Direct copy                              |
| px             | lng                | Direct copy (WGS84 longitude)            |
| py             | lat                | Direct copy (WGS84 latitude)             |
| address        | address            | Direct copy                              |
| (none)         | category           | Empty string initially; filled by enrichment |
| (none)         | kakao_place_id     | Synthetic `naver_{py}_{px}` initially; replaced with real Kakao ID upon enrichment |
| (none)         | place_url          | NULL initially; filled by enrichment      |
| (none)         | star_rating        | NULL (wishlist/unvisited state)           |
| (none)         | import_batch_id    | Set to current batch ID                  |
