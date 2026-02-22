# Implementation Plan: Eliminate Loading Flash on Wishlist Tab Mutations

**Branch**: `025-optimistic-tab-updates` | **Date**: 2026-02-23 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/025-optimistic-tab-updates/spec.md`

## Summary

Eliminate the full-page "로딩 중..." loading flash that occurs after mutations on the 맛집 tab. The root cause is that `useSupabaseQuery` sets `isLoading = true` on every revalidation, including background refreshes triggered by `invalidateRestaurants()`. The fix implements a stale-while-revalidate pattern: only show loading on initial fetch (when no data exists), and keep showing existing data during background revalidation.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: React 19, Next.js 16 (App Router)
**Storage**: Supabase Postgres (no schema changes needed)
**Testing**: Vitest + React Testing Library (unit tests only)
**Target Platform**: Mobile-first web (all modern browsers)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Mutations must provide visual feedback within 200ms (already met via optimistic updates; this fix prevents regression to full-page loading)
**Constraints**: No new dependencies; fix must be backward-compatible with all existing `useSupabaseQuery` consumers
**Scale/Scope**: Single hook change + test update; affects all pages that use `useSupabaseQuery`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Single-responsibility change to one hook; no dead code introduced |
| II. Testing Standards | PASS | Unit tests will verify loading state behavior (initial vs revalidation) |
| III. User Experience Consistency | PASS | This fix directly improves UX — eliminates jarring loading flash; maintains loading indicator for initial page load |
| IV. Performance Requirements | PASS | No new queries, no bundle size increase; purely behavioral fix |
| V. Simplicity | PASS | Minimal change (one conditional in `useSupabaseQuery`); no new abstractions |

All gates pass. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/025-optimistic-tab-updates/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # N/A (no schema changes)
├── quickstart.md        # Phase 1 output
├── contracts/           # N/A (no API changes)
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
└── lib/
    └── supabase/
        └── use-query.ts     # Core fix: stale-while-revalidate loading state

tests/
└── unit/
    └── use-query.test.ts    # New/updated: verify loading behavior
```

**Structure Decision**: This feature modifies a single existing file (`src/lib/supabase/use-query.ts`) and adds/updates one test file. No new directories or structural changes needed.

## Complexity Tracking

No constitution violations. Table not applicable.
