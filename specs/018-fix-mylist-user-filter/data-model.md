# Data Model: Fix My Restaurant List User Filter

**Branch**: `018-fix-mylist-user-filter` | **Date**: 2026-02-22

## Existing Schema (No Changes Required)

### restaurants table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| user_id | uuid (FK → auth.users) | Owner of the saved restaurant |
| kakao_place_id | text | Kakao Maps place identifier |
| name | text | Restaurant name |
| address | text | Road or street address |
| category | text | Kakao category string |
| lat | float8 | Latitude |
| lng | float8 | Longitude |
| place_url | text (nullable) | Kakao place URL |
| star_rating | int4 (nullable) | NULL = wishlist, 1-3 = visited |
| created_at | timestamptz | Auto-generated |

### RLS Policy (Unchanged)

- **SELECT**: `true` (all authenticated users can read all rows — required for social profile feature)
- **INSERT/UPDATE/DELETE**: `user_id = auth.uid()` (users can only modify their own rows)

## Migration SQL

No database migration required. The fix is application-layer only — adding `.eq("user_id", userId)` to existing Supabase client queries.
