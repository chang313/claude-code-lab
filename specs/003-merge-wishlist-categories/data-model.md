# Data Model: Merge Wishlist & Category View

**Branch**: `003-merge-wishlist-categories` | **Date**: 2026-02-16

## Entity Changes

### Restaurant (MODIFIED — no schema change)

No database schema changes. The existing `category` column already stores the full Kakao category string (e.g., `"음식점 > 한식 > 냉면"`). The subcategory is derived at query time.

**Existing DB columns** (unchanged):
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (Supabase auto) |
| user_id | uuid | FK to auth.users |
| kakao_place_id | text | Kakao Place ID (unique per user) |
| name | text | Restaurant name |
| address | text | Address |
| category | text | Full Kakao category string (e.g., "음식점 > 한식 > 냉면") |
| lat | float | Latitude |
| lng | float | Longitude |
| place_url | text | Kakao Place URL |
| star_rating | int | 1-3 star rating |
| created_at | timestamptz | Auto-generated |

**New derived field** (client-side only, not stored):
| Field | Type | Derivation |
|-------|------|------------|
| subcategory | string | `extractSubcategory(category)` — last segment after final `" > "` |

### SubcategoryGroup (NEW — client-side only, not stored)

A logical grouping computed at render time from the restaurants array.

| Field | Type | Description |
|-------|------|-------------|
| subcategory | string | Extracted subcategory name (e.g., "냉면") |
| restaurants | Restaurant[] | Restaurants in this group, sorted by starRating desc, createdAt desc |
| count | number | Number of restaurants in group |
| isExpanded | boolean | Accordion state (default: true) |

### MenuItem / MenuGroup (REMOVED from application)

These types are deleted from `src/types/index.ts`. The `menu_items` database table is retained but no longer referenced.

**Types removed**:
- `MenuItem` interface
- `MenuGroup` interface

## Extraction Logic

```
extractSubcategory(category: string): string
  Input: "음식점 > 한식 > 냉면"
  Output: "냉면"

  Rules:
  1. Split by " > " separator
  2. Take the last segment, trimmed
  3. If no separator found, use the entire string
  4. If empty or null, return "기타"
```

## Grouping Logic

```
groupBySubcategory(restaurants: Restaurant[]): SubcategoryGroup[]
  1. For each restaurant, extract subcategory
  2. Group restaurants by subcategory
  3. Within each group, sort by starRating (desc), then createdAt (desc)
  4. Sort groups alphabetically by subcategory name
  5. Exception: "기타" group always appears last
```

## Relationships

```
User (1) ───── (0..*) Restaurant
                         │
                         ├─ category (stored, from Kakao API)
                         └─ subcategory (derived at query time)

SubcategoryGroup ← computed from Restaurant[]
  └─ restaurants[] (grouped by subcategory)
```
