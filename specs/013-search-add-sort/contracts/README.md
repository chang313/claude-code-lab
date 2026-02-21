# API Contracts: Search Add & Sort

**Feature**: `013-search-add-sort`

## No New API Contracts

This feature does not introduce new API endpoints. All changes are client-side:

1. **Kakao Local API** (external, unchanged): Modified parameter usage only
   - `sort` parameter changed from `"distance"` to `"accuracy"` in search requests
   - All other parameters (`query`, `x`, `y`, `rect`, `radius`, `page`, `size`) unchanged

2. **Supabase `restaurants` table** (existing): No new queries
   - Insert operation unchanged (used by `useAddRestaurant` hook)
   - Select for wishlisted set unchanged (used by `useIsWishlistedSet` hook)

## Kakao API Parameter Changes

### Before

```
GET /v2/local/search/keyword.json
  ?query=치킨
  &x=127.0
  &y=37.5
  &radius=5000
  &sort=distance    ← distance sort
  &page=1&size=15
```

### After

```
GET /v2/local/search/keyword.json
  ?query=치킨
  &x=127.0
  &y=37.5
  &radius=5000
  &sort=accuracy    ← relevance sort
  &page=1&size=15
```

Response schema unchanged. `distance` field still populated when `x`, `y` provided.
