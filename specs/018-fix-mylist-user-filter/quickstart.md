# Quickstart: Fix My Restaurant List User Filter

**Branch**: `018-fix-mylist-user-filter` | **Date**: 2026-02-22

## What to Build

Add user-scoped filtering to the main page restaurant hooks so each user only sees their own saved restaurants.

## Files to Modify

1. **`src/db/hooks.ts`** — Add `.eq("user_id", userId)` to `useVisitedGrouped()`, `useWishlistGrouped()`, `useWishlist()`, `useRestaurant()`, and `useIsWishlisted()`. Obtain userId via `supabase.auth.getUser()` inside each query function.

2. **`tests/unit/hooks.test.ts`** (or new test file) — Add tests verifying that the Supabase query includes the `user_id` filter for each affected hook.

## Reference Pattern

`src/db/profile-hooks.ts` lines 171-208 already implement the correct pattern:
```
.from("restaurants")
.select("*")
.eq("user_id", userId)  // ← This filter is what's missing in hooks.ts
```

## Verification

```bash
pnpm test          # Unit tests pass
tsc --noEmit       # Type check (may need pnpm build instead)
pnpm build         # Build succeeds
```

## What NOT to Change

- Database schema or RLS policies (social profile feature needs cross-user reads)
- `src/db/profile-hooks.ts` (already correct)
- `src/app/page.tsx` (no changes needed if hooks handle auth internally)
