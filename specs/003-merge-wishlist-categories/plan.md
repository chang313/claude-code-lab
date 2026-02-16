# Implementation Plan: Merge Wishlist & Category View

**Branch**: `003-merge-wishlist-categories` | **Date**: 2026-02-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-merge-wishlist-categories/spec.md`

## Summary

Merge the Wishlist and "By Menu" tabs into a single auto-categorized view. Restaurants are automatically grouped by their Kakao API subcategory (last segment of `category_name`), displayed as collapsible accordion sections sorted alphabetically. Manual menu item management is removed entirely, simplifying navigation from 5 tabs to 4.

**Technical approach**: Extract subcategory from the existing `category` column at query time (no DB migration). Build a `useWishlistGrouped()` hook that groups/sorts client-side. Create a `CategoryAccordion` component for the grouped UI. Remove all menu item code.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 15 (App Router), React 19, Tailwind CSS 4, Supabase (@supabase/ssr)
**Storage**: Supabase Postgres (existing `restaurants` table — no schema changes)
**Testing**: Vitest + jsdom (unit tests), React Testing Library patterns
**Target Platform**: Web (mobile-first responsive)
**Project Type**: Web application (Next.js App Router — single project)
**Performance Goals**: Wishlist renders grouped view within 1 second (SC-001)
**Constraints**: Personal app, < 100 restaurants per user. Client-side grouping is sufficient.
**Scale/Scope**: Single user per session, ~4 pages affected, ~12 files changed

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Dead code (menu items) will be removed. No unused imports. Single responsibility maintained. |
| II. Testing Standards | PASS | TDD: unit tests for `extractSubcategory` and `groupBySubcategory` written first. Existing menu item tests removed with their code. |
| III. UX Consistency | PASS | Reuses existing `RestaurantCard` component. Accordion pattern follows existing card styling. Loading/empty states preserved. |
| IV. Performance | PASS | No new API calls. Same Supabase query, client-side grouping adds negligible overhead. No bundle size increase (net decrease from removed code). |
| V. Simplicity | PASS | No new dependencies. No DB migration. Utility functions are pure and trivial. Removes more code than it adds. |

**Gate result**: ALL PASS — proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/003-merge-wishlist-categories/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: research decisions
├── data-model.md        # Phase 1: entity model
├── quickstart.md        # Phase 1: build order guide
├── contracts/
│   └── hooks-api.md     # Phase 1: hook interfaces
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── page.tsx                    # MODIFY: grouped wishlist view
│   ├── restaurant/[id]/page.tsx    # MODIFY: remove menu items section
│   ├── by-menu/                    # DELETE: entire directory
│   │   ├── page.tsx
│   │   └── [menu]/page.tsx
│   ├── search/page.tsx             # unchanged
│   ├── map/page.tsx                # unchanged
│   └── my/page.tsx                 # unchanged
├── components/
│   ├── BottomNav.tsx               # MODIFY: remove By Menu tab
│   ├── CategoryAccordion.tsx       # CREATE: collapsible category group
│   ├── RestaurantCard.tsx          # unchanged
│   ├── StarRating.tsx              # unchanged
│   └── MenuItemList.tsx            # DELETE
├── db/
│   ├── hooks.ts                    # MODIFY: add useWishlistGrouped, remove menu hooks
│   └── search-hooks.ts            # unchanged
├── lib/
│   ├── subcategory.ts             # CREATE: extractSubcategory + groupBySubcategory
│   ├── normalize.ts               # DELETE
│   ├── kakao.ts                   # unchanged
│   └── supabase/                  # unchanged
└── types/
    └── index.ts                   # MODIFY: add SubcategoryGroup, remove MenuItem/MenuGroup

tests/
└── unit/
    ├── subcategory.test.ts        # CREATE: extraction + grouping tests
    ├── db-hooks.test.ts           # MODIFY: remove normalizeMenuName tests
    └── kakao.test.ts              # unchanged
```

**Structure Decision**: Existing Next.js App Router single-project structure. No new directories needed beyond one new utility file and one new component.

## Complexity Tracking

No constitution violations. No complexity justifications needed.

## Post-Design Constitution Re-Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Net code removal. New code follows existing patterns. |
| II. Testing Standards | PASS | `extractSubcategory` and `groupBySubcategory` get unit tests (TDD). Edge cases (empty, no separator, "기타") covered. |
| III. UX Consistency | PASS | Accordion uses same card styling, same star rating component. |
| IV. Performance | PASS | Same single Supabase query. Client grouping on < 100 items is instant. |
| V. Simplicity | PASS | Two pure functions + one hook + one component. Removes 5 hooks, 2 pages, 2 components. |

**Gate result**: ALL PASS — design is ready for task generation.
