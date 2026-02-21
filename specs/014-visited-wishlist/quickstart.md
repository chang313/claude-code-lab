# Quickstart: 014-visited-wishlist

**Date**: 2026-02-21

## Prerequisites

1. Run migration SQL in Supabase Dashboard > SQL Editor (see `data-model.md`)
2. Working in worktree: `cd ../014-visited-wishlist`
3. Dependencies installed: `pnpm install`

## Implementation Order

### Layer 1: Data Foundation
1. **Update types** (`src/types/index.ts`): `starRating: number | null`
2. **Update DB hooks** (`src/db/hooks.ts`):
   - `useAddRestaurant()`: default `star_rating: null` (was `1`)
   - Split `useWishlistGrouped()` into visited/wishlist filtered queries
   - Add `useMarkAsVisited()` and `useMoveToWishlist()` hooks
3. **Update recommendation hooks** (`src/db/recommendation-hooks.ts`): `star_rating: null` (was `1`)
4. **Update profile hooks** (`src/db/profile-hooks.ts`): Add visited/wishlist filtered versions

### Layer 2: Component Updates
5. **Update StarRating** (`src/components/StarRating.tsx`): Handle `value={null}` (show empty stars as tappable affordance)
6. **Update RestaurantCard** (`src/components/RestaurantCard.tsx`):
   - Wishlist cards: show gray star area (tappable → promotes to visited)
   - Visited cards: show filled stars (editable as now)
   - Search results: show ♡ or ★ indicator based on status
7. **Add search dual-button**: "+" for wishlist + ★ for visited add

### Layer 3: Page Assembly
8. **Update main page** (`src/app/page.tsx`): Two sections with headers
9. **Update search page** (`src/app/search/page.tsx`): Dual add buttons + indicators
10. **Update profile page** (`src/components/UserProfileView.tsx`): Two sections

### Layer 4: Tests
11. **Unit tests** for new/updated hooks
12. **Unit tests** for component rendering variants

## Verification

```bash
pnpm build       # TypeScript + Next.js build
pnpm test        # Unit tests
```

## Key Files to Modify

| File | Changes |
|------|---------|
| `src/types/index.ts` | `starRating: number \| null` |
| `src/db/hooks.ts` | Filter queries, new hooks, default null |
| `src/db/recommendation-hooks.ts` | `star_rating: null` on accept |
| `src/db/profile-hooks.ts` | Filtered profile queries |
| `src/components/StarRating.tsx` | Handle null value |
| `src/components/RestaurantCard.tsx` | Conditional star display, indicators |
| `src/app/page.tsx` | Two-section layout |
| `src/app/search/page.tsx` | Dual add buttons, status indicators |
| `src/components/UserProfileView.tsx` | Two-section layout |
| `tests/unit/*.test.ts` | New and updated tests |
