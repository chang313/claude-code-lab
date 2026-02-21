# Hooks API Contract: Merge Wishlist & Category View

**Branch**: `003-merge-wishlist-categories` | **Date**: 2026-02-16

This feature is entirely client-side (React hooks + Supabase client queries). No new REST API endpoints are needed. The "contracts" are the hook interfaces.

## New Hooks

### `useWishlistGrouped()`

Replaces `useWishlist()` as the primary wishlist data source for the home page.

```typescript
function useWishlistGrouped(): {
  groups: SubcategoryGroup[];
  isLoading: boolean;
}

interface SubcategoryGroup {
  subcategory: string;       // e.g., "냉면", "초밥", "기타"
  restaurants: Restaurant[];  // sorted by starRating desc, createdAt desc
  count: number;             // restaurants.length
}
```

**Behavior**:
- Fetches all restaurants from Supabase (same query as current `useWishlist()`)
- Extracts subcategory from each restaurant's `category` field
- Groups and sorts client-side
- Groups sorted alphabetically, "기타" last
- Subscribes to `RESTAURANTS_KEY` invalidation for reactivity
- Returns empty array when no restaurants

## New Utility Functions

### `extractSubcategory(category: string): string`

```typescript
function extractSubcategory(category: string): string
```

**Behavior**:
- `"음식점 > 한식 > 냉면"` → `"냉면"`
- `"음식점 > 한식"` → `"한식"`
- `"음식점"` → `"음식점"`
- `""` or `null`/`undefined` → `"기타"`

### `groupBySubcategory(restaurants: Restaurant[]): SubcategoryGroup[]`

```typescript
function groupBySubcategory(restaurants: Restaurant[]): SubcategoryGroup[]
```

**Behavior**:
- Groups restaurants by extracted subcategory
- Sorts restaurants within each group: starRating desc, then createdAt desc
- Sorts groups alphabetically by subcategory name
- "기타" group always last

## Removed Hooks

The following hooks are removed from `src/db/hooks.ts`:

| Hook | Reason |
|------|--------|
| `useMenuItems(restaurantKakaoId)` | Menu item feature removed |
| `useAddMenuItem()` | Menu item feature removed |
| `useRemoveMenuItem()` | Menu item feature removed |
| `useMenuGroups()` | By Menu tab removed |
| `useRestaurantsByMenu(normalizedMenuName)` | By Menu tab removed |

## Retained Hooks (unchanged)

| Hook | Used By |
|------|---------|
| `useWishlist()` | Retained (still useful for flat list if needed elsewhere) |
| `useRestaurant(kakaoPlaceId)` | Restaurant detail page |
| `useAddRestaurant()` | Search page, map page |
| `useRemoveRestaurant()` | Wishlist page, restaurant detail page |
| `useUpdateStarRating()` | Wishlist page, restaurant detail page |
| `useIsWishlisted(kakaoPlaceId)` | Search results |

## Retained Hooks in search-hooks.ts (unchanged)

| Hook | Used By |
|------|---------|
| `useAddRestaurant()` | Search page |
| `useIsWishlistedSet(ids)` | Search results batch check |
