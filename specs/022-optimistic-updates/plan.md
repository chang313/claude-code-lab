# Implementation Plan: Optimistic Updates & Star Rating Bug Fix

**Branch**: `022-optimistic-updates` | **Date**: 2026-02-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/022-optimistic-updates/spec.md`

## Summary

Fix the star rating bug where ratings 4 and 5 fail to persist (likely a database CHECK constraint left from the old 1-3 scale), and add optimistic update support to the custom cache system so all restaurant mutations (star rating, promote, demote, delete) reflect instantly in the UI without a full data reload.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16 (App Router), React 19, Supabase JS SDK, @supabase/ssr
**Storage**: Supabase Postgres with RLS
**Testing**: Vitest + React Testing Library (unit tests only, no E2E)
**Target Platform**: Mobile-first web (PWA-style), modern browsers
**Project Type**: Web application (single Next.js project)
**Performance Goals**: <50ms visual update on user tap (optimistic), <200ms visual feedback per constitution
**Constraints**: No new dependencies; extend existing custom cache system
**Scale/Scope**: Single-user mobile app; 5 mutation hooks to update, 1 query hook to extend

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Single responsibility maintained — each mutation hook gets its own optimistic logic |
| II. Testing Standards | PASS | Tests will cover optimistic update, rollback, and star rating 4/5 persistence |
| III. UX Consistency | PASS | Optimistic updates improve UX consistency (instant feedback <200ms) |
| IV. Performance | PASS | Eliminates full refetch on every mutation; no bundle size increase expected |
| V. Simplicity | PASS | Extending existing cache system, not adding new library; snapshot-rollback is simplest viable approach |

No violations. Complexity Tracking section not needed.

### Post-Design Re-check (after Phase 1)

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | 3 new exports in invalidate.ts, behavioral change in use-query.ts — single responsibility preserved |
| II. Testing Standards | PASS | New test file for optimistic behavior; existing tests updated for star rating 4/5 |
| III. UX Consistency | PASS | Error toast reuses existing Toast component; instant feedback under 50ms |
| IV. Performance | PASS | Eliminates 5+ refetch calls per mutation; setCache is synchronous (O(1)) |
| V. Simplicity | PASS | No new dependencies; 3 new functions in invalidate.ts; snapshot/restore is minimal |

## Project Structure

### Documentation (this feature)

```text
specs/022-optimistic-updates/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (internal API contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── lib/supabase/
│   ├── invalidate.ts        # MODIFY: add setCache() for optimistic writes
│   └── use-query.ts         # MODIFY: add setData() for optimistic updates
├── db/
│   ├── hooks.ts             # MODIFY: add optimistic logic to 5 mutation hooks
│   └── search-hooks.ts      # NO CHANGE: invalidated by prefix (stays reactive)
├── components/
│   ├── StarRating.tsx        # NO CHANGE: rendering logic is correct
│   ├── RestaurantCard.tsx    # NO CHANGE: props pass-through
│   ├── Toast.tsx             # REUSE: error feedback for failed mutations
│   └── ErrorToast.tsx        # REUSE: error feedback alternative
├── app/
│   ├── page.tsx              # MODIFY: add error handling for mutation callbacks
│   └── restaurant/[id]/
│       └── page.tsx          # MODIFY: add error handling for star update
└── types/index.ts            # NO CHANGE

tests/unit/
├── db-hooks.test.ts          # MODIFY: add optimistic update + rollback tests
├── hooks.test.ts             # MODIFY: add star rating 4/5 persistence tests
└── optimistic-updates.test.ts # NEW: focused optimistic behavior tests
```

**Structure Decision**: Single Next.js project (existing). All changes are in the existing `src/` tree. Only modifications to existing files plus one new test file.
