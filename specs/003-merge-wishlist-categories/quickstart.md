# Quickstart: Merge Wishlist & Category View

**Branch**: `003-merge-wishlist-categories` | **Date**: 2026-02-16

## Prerequisites

- Node.js / pnpm installed
- `.env.local` with Supabase + Kakao keys configured
- Supabase project with `restaurants` and `menu_items` tables

## Build Order

Implementation should follow this dependency order:

### Step 1: Utility Functions (no dependencies)
- Create `extractSubcategory()` in `src/lib/subcategory.ts`
- Create `groupBySubcategory()` in `src/lib/subcategory.ts`
- Write unit tests first (TDD per constitution)

### Step 2: Data Hook (depends on Step 1)
- Create `useWishlistGrouped()` in `src/db/hooks.ts`
- Uses `extractSubcategory` + `groupBySubcategory` on existing restaurant data

### Step 3: UI Component (depends on Step 2)
- Create `CategoryAccordion` component in `src/components/CategoryAccordion.tsx`
- Collapsible group header with subcategory name + count
- Contains RestaurantCard list

### Step 4: Wishlist Page Rewrite (depends on Steps 2, 3)
- Update `src/app/page.tsx` to use `useWishlistGrouped()` + `CategoryAccordion`
- Replace flat list with grouped accordion view

### Step 5: Remove Menu Item Features (independent of Steps 1-4)
- Remove "By Menu" tab from `BottomNav.tsx`
- Delete `src/app/by-menu/` directory
- Remove menu item section from restaurant detail page
- Remove menu item hooks from `src/db/hooks.ts`
- Remove `MenuItemList` component
- Remove `normalizeMenuName` utility
- Remove `MenuItem` and `MenuGroup` types
- Update tests

### Step 6: Verification
- `pnpm exec vitest run` — all tests pass
- `pnpm exec next build` — build succeeds
- Manual test: add restaurants, verify grouping

## Verification Commands

```bash
# Run unit tests
pnpm exec vitest run

# Type check
pnpm exec tsc --noEmit

# Build
pnpm exec next build
```

## Key Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/subcategory.ts` | CREATE | `extractSubcategory()` + `groupBySubcategory()` |
| `src/components/CategoryAccordion.tsx` | CREATE | Collapsible subcategory group UI |
| `src/app/page.tsx` | MODIFY | Use grouped wishlist view |
| `src/db/hooks.ts` | MODIFY | Add `useWishlistGrouped()`, remove menu hooks |
| `src/components/BottomNav.tsx` | MODIFY | Remove "By Menu" tab |
| `src/app/restaurant/[id]/page.tsx` | MODIFY | Remove menu item section |
| `src/types/index.ts` | MODIFY | Add `SubcategoryGroup`, remove `MenuItem`/`MenuGroup` |
| `src/app/by-menu/` | DELETE | Entire directory |
| `src/components/MenuItemList.tsx` | DELETE | No longer needed |
| `src/lib/normalize.ts` | DELETE | No longer needed |
| `tests/unit/subcategory.test.ts` | CREATE | Tests for extraction + grouping |
| `tests/unit/db-hooks.test.ts` | MODIFY | Remove normalizeMenuName tests |
