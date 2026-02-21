# Data Model: Search Add & Sort

**Feature**: `013-search-add-sort`
**Date**: 2026-02-21

## Schema Changes

**No database schema changes required.**

This feature modifies client-side behavior only:
- Sort parameter sent to Kakao Local API
- UI state for star rating in the detail card

## Existing Entities Used

### `restaurants` table (unchanged)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, auto-generated |
| user_id | uuid | FK to auth.users |
| kakao_place_id | text | Unique constraint per user |
| name | text | Restaurant name |
| address | text | Road or standard address |
| category | text | Kakao category string |
| lat | float8 | Latitude |
| lng | float8 | Longitude |
| place_url | text | Nullable, Kakao place page |
| star_rating | int2 | 1-3, default 1 |
| created_at | timestamptz | Auto-generated |

**Unique constraint**: `(user_id, kakao_place_id)` — prevents duplicate additions.

### `KakaoPlace` interface (client-side, unchanged)

```typescript
interface KakaoPlace {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name: string;
  category_group_name: string;
  category_name: string;
  x: string;           // longitude
  y: string;           // latitude
  place_url: string;
  distance?: string;   // meters from search coordinates
}
```

**Note**: The `distance` field is populated by the Kakao API when `x`, `y` parameters are included in the search request. This remains populated even when changing `sort` from `"distance"` to `"accuracy"`.

## Migration SQL

No migration required. Existing schema supports all feature requirements.
