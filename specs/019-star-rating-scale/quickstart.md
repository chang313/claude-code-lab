# Quickstart: Change Star Rating Scale to 5

**Branch**: `019-star-rating-scale` | **Date**: 2026-02-22

## Prerequisites

- Node.js 18+, pnpm installed
- Supabase project with `restaurants` table (existing)
- No database migration needed

## Implementation Order

### Step 1: Update Type Definitions
Update the star rating union type in `src/types/index.ts` (if a named type exists) or directly in component props from `1 | 2 | 3` to `1 | 2 | 3 | 4 | 5`.

### Step 2: Update StarRating Component
In `src/components/StarRating.tsx`:
- Change the props interface to accept `1 | 2 | 3 | 4 | 5`
- Change the render array from `[1, 2, 3] as const` to `[1, 2, 3, 4, 5] as const`

### Step 3: Update Consuming Code
Update all files that pass or handle star rating values:
- `src/components/RestaurantCard.tsx`
- `src/db/hooks.ts`
- `src/app/search/page.tsx`
- `src/app/restaurant/[id]/page.tsx`
- `src/app/page.tsx`
- `src/db/profile-hooks.ts`
- `src/db/recommendation-hooks.ts`

### Step 4: Update Tests
Update all test files to reflect the 5-star scale:
- `tests/unit/star-selector.test.tsx`
- `tests/unit/restaurant-card-star-rating.test.tsx`
- `tests/unit/hooks.test.ts`
- Other test files referencing star ratings

### Step 5: Verify
```bash
pnpm build && pnpm test
```

## Verification Checklist

- [ ] `StarRating` component renders 5 stars
- [ ] Tapping stars 1-5 each works correctly
- [ ] Existing ratings (1, 2, 3) display correctly
- [ ] Read-only mode shows 5 stars
- [ ] All tests pass
- [ ] Build succeeds with no type errors
