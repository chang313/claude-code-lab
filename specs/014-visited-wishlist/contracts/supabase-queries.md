# Supabase Query Contracts: 014-visited-wishlist

**Date**: 2026-02-21

## Hook → Query Mapping

### useVisitedGrouped()
**Purpose**: Fetch visited restaurants (star_rating IS NOT NULL), grouped by subcategory.
```typescript
const { data } = await supabase
  .from("restaurants")
  .select("*")
  .not("star_rating", "is", null)
  .order("star_rating", { ascending: false })
  .order("created_at", { ascending: false });
return groupBySubcategory(data.map(mapDbRestaurant));
```
**Cache key**: `"restaurants"` (shared — invalidated on any restaurant mutation)

### useWishlistGrouped()
**Purpose**: Fetch wishlist restaurants (star_rating IS NULL), grouped by subcategory.
```typescript
const { data } = await supabase
  .from("restaurants")
  .select("*")
  .is("star_rating", null)
  .order("created_at", { ascending: false });
return groupBySubcategory(data.map(mapDbRestaurant));
```
**Cache key**: `"restaurants"` (shared)

### useAddRestaurant()
**Purpose**: Add restaurant to wishlist (default) or as visited (with rating).
```typescript
// Wishlist add (default):
await supabase.from("restaurants").insert({
  ...placeFields,
  star_rating: null,  // Changed from default 1
});

// Visited add (with rating):
await supabase.from("restaurants").insert({
  ...placeFields,
  star_rating: rating,  // 1, 2, or 3
});
```
**Invalidates**: `"restaurants"`

### useMarkAsVisited()
**Purpose**: Promote wishlist → visited by setting star_rating.
```typescript
await supabase
  .from("restaurants")
  .update({ star_rating: rating })
  .eq("kakao_place_id", kakaoPlaceId);
```
**Invalidates**: `"restaurants"`, `"wishlisted:{kakaoPlaceId}"`

### useMoveToWishlist()
**Purpose**: Demote visited → wishlist by clearing star_rating.
```typescript
await supabase
  .from("restaurants")
  .update({ star_rating: null })
  .eq("kakao_place_id", kakaoPlaceId);
```
**Invalidates**: `"restaurants"`, `"wishlisted:{kakaoPlaceId}"`

### useIsWishlisted() — unchanged
**Purpose**: Check if a restaurant exists in either list.
```typescript
const { count } = await supabase
  .from("restaurants")
  .select("id", { count: "exact", head: true })
  .eq("kakao_place_id", kakaoPlaceId);
return (count ?? 0) > 0;
```

### useRestaurantStatus()
**Purpose**: Get the list type for a saved restaurant (for search indicators).
```typescript
const { data } = await supabase
  .from("restaurants")
  .select("star_rating")
  .eq("kakao_place_id", kakaoPlaceId)
  .maybeSingle();
if (!data) return null;         // Not saved
if (data.star_rating === null) return "wishlist";  // ♡
return "visited";               // ★
```
**Cache key**: `"restaurant-status:{kakaoPlaceId}"`

### useAcceptRecommendation() — updated insert
**Purpose**: Accept recommendation → add to wishlist.
```typescript
await supabase.from("restaurants").insert({
  ...recommendationFields,
  star_rating: null,  // Changed from hardcoded 1 → wishlist
});
```

### Profile hooks (useUserVisitedGrouped, useUserWishlistGrouped)
**Purpose**: Fetch another user's restaurants by list type.
```typescript
// Visited:
.from("restaurants").select("*")
  .eq("user_id", userId)
  .not("star_rating", "is", null)
  .order("star_rating", { ascending: false })
  .order("created_at", { ascending: false });

// Wishlist:
.from("restaurants").select("*")
  .eq("user_id", userId)
  .is("star_rating", null)
  .order("created_at", { ascending: false });
```
