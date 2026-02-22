# Implementation Plan: Wishlist Add Feedback & Search Status Sync

**Branch**: `020-list-add-notify` | **Date**: 2026-02-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/020-list-add-notify/spec.md`

## Summary

Add a toast notification when a user adds a restaurant to their wishlist from search results, and fix the search result card so it immediately reflects the saved state after adding. No new API endpoints or database schema changes are required. Changes are confined to three files: extend `ErrorToast.tsx` into a typed `Toast.tsx`, fix a missing cache invalidation key in `hooks.ts`, and wire up feedback state in `search/page.tsx`.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16 (App Router), React 19, Tailwind CSS 4, Supabase client (`@supabase/ssr`)
**Storage**: Supabase Postgres — `restaurants` table (no schema changes)
**Testing**: Vitest + React Testing Library (unit tests in `tests/unit/`)
**Target Platform**: Web (mobile-first, Next.js App Router)
**Project Type**: Web application (single Next.js project)
**Performance Goals**: Toast appears within 1 second; card state updates within 2 seconds
**Constraints**: No new npm dependencies; changes must not break existing ErrorToast usage
**Scale/Scope**: 4–5 files touched; ~50–80 lines changed

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | ✅ Pass | TypeScript strict; `Toast.tsx` has single responsibility; dead `ErrorToast.tsx` removed |
| II. Testing Standards | ✅ Pass | Unit tests required for `Toast` component and `search/page.tsx` handler logic |
| III. UX Consistency | ✅ Pass | Toast positioned consistently with existing `ErrorToast` (bottom-36, z-40); 200ms feedback gate met |
| IV. Performance | ✅ Pass | No new network calls; status map re-fetch is one query; card update < 2s |
| V. Simplicity | ✅ Pass | No new dependencies; `type` prop extension is minimal; no new abstractions |

**Post-Design Re-check**: All gates still pass. Data model changes are client-state only.

## Project Structure

### Documentation (this feature)

```text
specs/020-list-add-notify/
├── plan.md              ← this file
├── research.md          ← Phase 0 complete
├── data-model.md        ← Phase 1 complete
├── quickstart.md        ← Phase 1 complete
├── contracts/
│   └── client-contracts.md  ← Phase 1 complete
└── tasks.md             ← Phase 2 output (/speckit.tasks — not yet created)
```

### Source Code (files to touch)

```text
src/
├── components/
│   ├── Toast.tsx                   # NEW (rename + extend ErrorToast.tsx)
│   └── RestaurantCard.tsx          # MODIFY: add isAdding prop
├── db/
│   └── hooks.ts                    # MODIFY: add status-map key to invalidateRestaurants()
└── app/
    └── search/
        └── page.tsx                # MODIFY: add toast state + per-card loading state

tests/unit/
├── toast.test.tsx                  # NEW: Toast component tests
└── search-add-feedback.test.tsx    # NEW: handler feedback tests
```

**Structure Decision**: Single web project (Next.js App Router). No new directories needed.

## Complexity Tracking

No constitution violations. No complexity justification required.
