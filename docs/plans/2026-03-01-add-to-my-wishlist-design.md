# Add to My Wishlist from Friend's Profile

## Problem

Users can view friends' restaurant wishlists and visited lists, but cannot save those places to their own wishlist. They must manually search for the same restaurant, which is friction-heavy and error-prone.

## Solution

Add a one-tap "내 위시리스트에 추가" button on each restaurant card when viewing another user's profile. The button appears on both visited and wishlist tabs.

## Requirements

- Button on each `RestaurantCard` when viewing another user's profile (both tabs)
- One-tap adds to current user's wishlist (unrated, `star_rating = null`)
- Already-saved restaurants show disabled `♡ 저장됨` state
- Success: toast + button state change; Error: error toast
- No new database tables or columns needed

## Approach: Extend RestaurantCard

Chosen over separate overlay component (over-engineered) and server API route (breaks client-side Supabase pattern).

### Data Flow

1. `UserProfileView` collects all `kakao_place_id`s from friend's restaurants
2. `useRestaurantStatusMap(allIds)` batch-checks which are already in current user's collection
3. New `useAddFromFriend` hook inserts `Restaurant` data directly (no `KakaoPlace` conversion)
4. On success: toast, invalidate restaurant caches + status map cache

### Component Changes

**`RestaurantCard`** — Two new optional props:
- `onSaveToMyWishlist?: () => void` — triggers the add
- `isSavedToMyWishlist?: boolean` — controls button vs saved indicator

When `onSaveToMyWishlist` provided and `!isSavedToMyWishlist`: blue `+ 내 위시리스트에 추가` button.
When `isSavedToMyWishlist`: pink `♡ 저장됨` (disabled).

**`UserProfileView`** — When `!isOwnProfile` and user is authenticated:
- Batch-check saved status via `useRestaurantStatusMap`
- Pass save handler + status to each card
- Track `addingId` state for per-item loading prevention

### New Hook

```typescript
// src/db/hooks.ts
useAddFromFriend(): { addFromFriend: (restaurant: Restaurant) => Promise<boolean> }
```

Inserts `Restaurant` fields into current user's `restaurants` table with `star_rating = null`.
Handles duplicate (23505 → false), calls `invalidateRestaurants()` on success.

### Error Handling

- Not logged in: save props not passed → button hidden
- Duplicate: `♡ 저장됨` state prevents tap; DB constraint as fallback
- Race condition: 23505 returns false silently (no error toast)
- Optimistic update: not needed — button state change is instant via local `addingId`

### Testing

- `useAddFromFriend` hook: insert, duplicate, invalidation
- `RestaurantCard`: save button rendering and saved state
- `UserProfileView` with `isOwnProfile=false`: save buttons present
