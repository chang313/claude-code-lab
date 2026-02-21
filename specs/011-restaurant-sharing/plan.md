# Implementation Plan: Restaurant Sharing (Mutual Follower Recommendations)

**Branch**: `011-restaurant-sharing` | **Date**: 2026-02-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/011-restaurant-sharing/spec.md`

## Summary

Add restaurant recommendation functionality between mutual followers. Users can recommend restaurants from their wishlist to mutual followers via a "Recommend" button. Recipients see a notification badge (bell icon in top app bar) and can accept (add to their wishlist) or ignore recommendations. Requires a new `recommendations` table in Supabase, a mutual followers query, a top bar with bell icon, a recommendations inbox page, and recommend flow UI.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict mode)
**Primary Dependencies**: Next.js 16 (App Router), React 19, @supabase/ssr, Tailwind CSS 4
**Storage**: Supabase Postgres with RLS
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Mobile-first web app (responsive)
**Project Type**: Web (Next.js monolith — no separate backend)
**Performance Goals**: Recommendation send < 1s, inbox load < 2s, accept action < 1s
**Constraints**: Poll-based notifications (no WebSocket/push), Supabase RLS for authorization
**Scale/Scope**: ~100 users, ~1000 recommendations

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Single-responsibility hooks pattern established. Will follow existing `db/hooks.ts` pattern. |
| II. Testing Standards | PASS | Will add Vitest unit tests for hooks and Playwright E2E for the recommend flow. |
| III. UX Consistency | PASS | Follows existing mobile-first card + button patterns. Korean locale. Bell icon badge is standard. |
| IV. Performance | PASS | Poll-based badge count query is lightweight. Restaurant snapshot avoids JOINs on read. |
| V. Simplicity | PASS | Single new DB table. No new dependencies. Follows existing custom hook + invalidate pattern. |

No violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/011-restaurant-sharing/
├── spec.md              # Feature specification (done)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── recommendations-api.md
└── tasks.md             # Phase 2 output (from /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── recommendations/
│   │   └── page.tsx          # NEW: Recommendations inbox page
│   └── ...existing pages
├── components/
│   ├── TopBar.tsx             # NEW: App bar with bell icon + badge
│   ├── RecommendButton.tsx    # NEW: "Recommend" button for restaurant cards
│   ├── RecommendModal.tsx     # NEW: Mutual follower picker modal
│   ├── RecommendationCard.tsx # NEW: Received recommendation card (accept/ignore)
│   └── ...existing components
├── db/
│   ├── recommendation-hooks.ts # NEW: All recommendation CRUD hooks
│   └── ...existing hooks
├── types/
│   └── index.ts              # MODIFIED: Add recommendation types
└── ...existing files
```

**Structure Decision**: Follows existing Next.js App Router convention. New page at `/recommendations`. New hooks file `db/recommendation-hooks.ts` matches the established pattern (`db/hooks.ts`, `db/follow-hooks.ts`). New components are standalone — no new shared libraries or abstractions needed.
