# Quickstart: Profile Star Ratings

**Branch**: `016-profile-star-ratings`

## What Changed

`RestaurantCard` now displays a read-only `StarRating` on visited restaurant cards even when no `onStarChange` handler is provided. This makes star ratings visible on profile pages.

## Files Modified

1. **`src/components/RestaurantCard.tsx`** — Added readonly star rating display for visited variant without `onStarChange`
2. **`tests/unit/restaurant-card-star-rating.test.tsx`** — Unit tests for readonly star display

## How to Verify

1. Navigate to any user's profile page (`/users/[id]`)
2. Visited restaurants should show filled yellow stars (1-3) matching their saved rating
3. Stars should not be clickable/interactive
4. Wishlist items should show no stars

## No Database Changes

No migration needed. Existing `star_rating` data is already returned by profile queries.
