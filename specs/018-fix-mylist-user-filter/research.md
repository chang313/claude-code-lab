# Research: Fix My Restaurant List User Filter

**Branch**: `018-fix-mylist-user-filter` | **Date**: 2026-02-22

## Root Cause Analysis

### Decision: Bug is in application-layer query, not RLS
- **Rationale**: Feature 007 (social-follow) intentionally relaxed RLS from `user_id = auth.uid()` to `true` so users could view each other's profiles. The main page hooks were never updated to add client-side `.eq("user_id", userId)` filtering.
- **Alternatives considered**:
  - Revert RLS to strict per-user: Rejected — would break the social profile feature.
  - Add a separate RLS policy with conditions: Over-engineered for this case — the profile page needs cross-user reads.

### Decision: Modify existing hooks to accept userId parameter
- **Rationale**: The pattern already exists in `src/db/profile-hooks.ts` (`useUserVisitedGrouped(userId)` and `useUserWishlistGrouped(userId)`). The main page hooks (`useVisitedGrouped()` and `useWishlistGrouped()` in `src/db/hooks.ts`) need the same `.eq("user_id", userId)` filter.
- **Alternatives considered**:
  - Reuse profile-hooks directly in page.tsx: Viable, but profile-hooks use a different cache key pattern (`restaurants:visited:{userId}`) which would cause cache fragmentation with the existing invalidation logic (`invalidateRestaurants()` invalidates `restaurants:visited`, not `restaurants:visited:{userId}`).
  - Create an auth context provider: Over-engineered for this fix — getting the user via `supabase.auth.getUser()` inside the query function is sufficient and matches the pattern used in `useAddRestaurant`.

### Decision: Obtain userId inside the hook via supabase.auth.getUser()
- **Rationale**: The mutation hooks (`useAddRestaurant`, etc.) already call `supabase.auth.getUser()` inline. Applying the same pattern to the read hooks keeps the API consistent — hooks remain zero-argument and self-contained.
- **Alternatives considered**:
  - Pass userId as a parameter from page.tsx: Would require page.tsx to manage auth state (useState + useEffect), adding complexity to the page component for no clear benefit.
  - Use a React context for current user: Adds a new abstraction for a single use case — violates Principle V (Simplicity).

## Additional Hooks to Fix

Beyond `useVisitedGrouped` and `useWishlistGrouped`, the following hooks in `src/db/hooks.ts` also lack user filtering:

| Hook | Issue | Fix Needed |
|------|-------|------------|
| `useWishlist()` | Returns all users' restaurants | Add `.eq("user_id", userId)` |
| `useRestaurant(kakaoPlaceId)` | Returns any user's restaurant by place ID | Add `.eq("user_id", userId)` — currently a user could see another user's restaurant detail |
| `useIsWishlisted(kakaoPlaceId)` | Checks if *any* user has saved a place | Add `.eq("user_id", userId)` — otherwise shows "saved" for places saved by other users |

All mutation hooks (`useAddRestaurant`, `useRemoveRestaurant`, `useUpdateStarRating`, etc.) already correctly scope by user via auth or RLS write policies.
