# Research: Merge Wishlist & Category View

**Branch**: `003-merge-wishlist-categories` | **Date**: 2026-02-16

## R-001: Subcategory Extraction Strategy

**Decision**: Extract subcategory at query time using a pure utility function `extractSubcategory(category: string): string`. No new database column or migration needed.

**Rationale**: The `category` field (from Kakao `category_name`) is already stored in the `restaurants` table. The extraction is a trivial string split operation (`split(" > ").pop()`). For a personal wishlist app with < 100 restaurants per user, computing this on the client at render time has zero performance impact.

**Alternatives considered**:
- **New DB column + backfill migration**: Adds unnecessary schema change and Supabase migration for a value that's easily derivable. Rejected per Principle V (Simplicity).
- **Lazy backfill (compute + persist on load)**: Adds write operations on read paths, complicating the hooks. Rejected.

## R-002: Grouped Wishlist Data Hook Pattern

**Decision**: Create a new `useWishlistGrouped()` hook that reuses the existing `useSupabaseQuery` + invalidation pattern. This hook fetches all restaurants (same query as `useWishlist()`), then groups them client-side by extracted subcategory.

**Rationale**: Reuses the proven `useSupabaseQuery` → `invalidate()` pattern already used by 10+ hooks. Client-side grouping keeps the Supabase query simple and avoids database-level string manipulation.

**Alternatives considered**:
- **SQL GROUP BY with string functions**: Would require Postgres `split_part()` or similar, complicating the query and making it database-specific. Rejected.
- **Server-side API route for grouping**: Over-engineering for a single-user personal app. Rejected.

## R-003: Collapsible Accordion Component

**Decision**: Build a lightweight `CategoryAccordion` component using React `useState` to track expanded/collapsed state per group. All groups start expanded by default (per clarification).

**Rationale**: The app uses Tailwind CSS without a component library. A simple state toggle with height transition is sufficient. No need for an external accordion library.

**Alternatives considered**:
- **HTML `<details>`/`<summary>`**: Limited styling control, inconsistent animation support across browsers. Rejected.
- **Third-party accordion library (Radix, Headless UI)**: Introduces a new dependency for a single component. Rejected per Principle V.

## R-004: Menu Item Cleanup Scope

**Decision**: Remove all menu item UI and hooks from the application. Retain the `menu_items` database table (no Supabase migration to drop it). Remove: `MenuItemList` component, `useMenuItems`, `useAddMenuItem`, `useRemoveMenuItem`, `useMenuGroups`, `useRestaurantsByMenu` hooks, `normalizeMenuName` utility, `by-menu/` pages, and the `MenuItem`/`MenuGroup` types.

**Rationale**: Per spec scope — menu_items table is retained for data integrity but all application references are removed. This is a clean removal that simplifies the codebase.

**Alternatives considered**:
- **Drop the menu_items table via Supabase migration**: Out of scope per spec. Could be done in a future cleanup.
- **Keep hooks but mark as deprecated**: Violates Principle I (dead code must be removed before merge).

## R-005: Navigation Restructuring

**Decision**: Remove the "By Menu" tab entry from the `tabs` array in `BottomNav.tsx`, reducing from 5 tabs to 4: Wishlist, Search, Map, My.

**Rationale**: Direct array modification. The existing `BottomNav` component uses a simple `tabs` array — removing one entry is a one-line change.
