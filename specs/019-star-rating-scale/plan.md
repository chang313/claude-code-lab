# Implementation Plan: Change Star Rating Scale to 5

**Branch**: `019-star-rating-scale` | **Date**: 2026-02-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/019-star-rating-scale/spec.md`

## Summary

Change the star rating system from a 3-star scale to a 5-star scale. This is a type-widening change: update the TypeScript union type from `1 | 2 | 3` to `1 | 2 | 3 | 4 | 5`, update the StarRating component to render 5 stars instead of 3, and update all consuming code and tests. No database migration needed — the existing integer column already supports values 1-5.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16 (App Router), React 19, Tailwind CSS 4
**Storage**: Supabase Postgres — `restaurants.star_rating` integer column (nullable). No schema change needed.
**Testing**: Vitest + React Testing Library (unit tests in `tests/unit/`)
**Target Platform**: Mobile-first web application
**Project Type**: Web application (Next.js App Router — unified src/)
**Performance Goals**: N/A — no performance impact from this change
**Constraints**: Existing ratings (1-3) must be preserved as-is, no rescaling
**Scale/Scope**: ~15 files affected (types, components, hooks, pages, tests)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Type widening maintains single responsibility; no dead code introduced |
| II. Testing Standards | PASS | All existing tests will be updated; test-first approach for new rating values (4, 5) |
| III. UX Consistency | PASS | Same visual design system (yellow/gray stars, size variants); only count changes |
| IV. Performance | PASS | No performance impact — same rendering pattern, 2 additional star elements |
| V. Simplicity | PASS | Minimal change — widening a union type and updating a constant array |

No violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/019-star-rating-scale/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output (minimal — no unknowns)
├── data-model.md        # Phase 1 output (no schema changes)
├── quickstart.md        # Phase 1 output
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── types/
│   └── index.ts              # No change needed (uses `number | null`, not union type)
├── components/
│   ├── StarRating.tsx         # Render 5 stars, update props interface
│   └── RestaurantCard.tsx     # Update rating callback types
├── db/
│   ├── hooks.ts               # Update rating parameter types
│   ├── profile-hooks.ts       # Update rating types if referenced
│   └── recommendation-hooks.ts # Update rating types if referenced
├── app/
│   ├── page.tsx               # Update rating handler types
│   ├── search/page.tsx        # Update addAsVisited rating type
│   └── restaurant/[id]/page.tsx # Update detail page rating type
└── middleware.ts              # No change expected

tests/
└── unit/
    ├── star-selector.test.tsx          # Update to test 5 stars
    ├── restaurant-card-star-rating.test.tsx # Update rating range assertions
    ├── hooks.test.ts                   # Update rating payload assertions
    ├── recommendation-hooks.test.ts    # Update if rating types referenced
    └── subcategory.test.ts             # Update if rating types referenced
```

**Structure Decision**: Existing Next.js App Router structure. No new files created — all changes are modifications to existing files.
