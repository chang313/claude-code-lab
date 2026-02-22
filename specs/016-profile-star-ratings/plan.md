# Implementation Plan: Profile Star Ratings

**Branch**: `016-profile-star-ratings` | **Date**: 2026-02-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/016-profile-star-ratings/spec.md`

## Summary

Display read-only star ratings on visited restaurant cards when viewing any user's profile page. Currently, `RestaurantCard` on profile pages renders without star ratings because the `onStarChange` prop guard prevents `StarRating` from rendering when no handler is passed. The fix: render a read-only `StarRating` on visited-variant cards even when no `onStarChange` handler is provided.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16 (App Router), React 19, Tailwind CSS 4
**Storage**: Supabase Postgres (no schema changes needed — `star_rating` already returned by profile queries)
**Testing**: Vitest + React Testing Library (unit tests in `tests/unit/`)
**Target Platform**: Mobile-first web app
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: No additional latency — reuses existing data already fetched
**Constraints**: Read-only display only; no mutations introduced
**Scale/Scope**: 1 component file modified, 1 test file added

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Single responsibility — adding read-only display to existing component. No new modules. |
| II. Testing Standards | PASS | Unit test will verify star rating renders in readonly mode on profile cards. Test-first approach. |
| III. UX Consistency | PASS | Reuses existing `StarRating` component with `readonly` prop and `sm` size — consistent with rest of app. |
| IV. Performance | PASS | No new queries, no bundle size increase (reuses existing component). |
| V. Simplicity | PASS | Minimal change — add conditional render of existing component. No new abstractions. |

All gates pass. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/016-profile-star-ratings/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0 (minimal — no unknowns)
├── data-model.md        # Phase 1 (N/A — no schema changes)
└── quickstart.md        # Phase 1
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── RestaurantCard.tsx    # MODIFY: add readonly StarRating for visited variant
│   └── StarRating.tsx        # NO CHANGE: already supports readonly prop
├── app/
│   ├── users/[id]/page.tsx   # NO CHANGE: already passes data through
│   └── my/page.tsx           # NO CHANGE
└── db/
    └── profile-hooks.ts      # NO CHANGE: already returns star_rating

tests/
└── unit/
    └── restaurant-card-star-rating.test.tsx  # NEW: verify readonly star display
```

**Structure Decision**: Existing Next.js App Router structure. Only `RestaurantCard.tsx` needs modification. One new test file.

## Complexity Tracking

No violations — table not applicable.
