# Implementation Plan: Social Follow & User Profiles

**Branch**: `007-social-follow` | **Date**: 2026-02-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/007-social-follow/spec.md`

## Summary

Add social features to the restaurant wishlist app: user search (People tab), follow/unfollow, unified user profiles at `/users/[id]` with inline follower/following tabs, and read-only viewing of other users' wishlists. Two new Supabase tables (`profiles`, `follows`) with RLS policies, a new bottom nav tab, and a profile auto-creation trigger on OAuth callback.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict mode)
**Primary Dependencies**: Next.js 16 (App Router), React 19, Tailwind CSS 4, @supabase/ssr, @supabase/supabase-js
**Storage**: Supabase Postgres with RLS (existing `restaurants` table + new `profiles` and `follows` tables)
**Testing**: Vitest (unit), Playwright (E2E), @testing-library/react
**Target Platform**: Mobile-first web (PWA-ready)
**Project Type**: Web application (Next.js App Router, single project)
**Performance Goals**: User search < 1s, follow/unfollow < 1s feedback, profile+wishlist load < 2s
**Constraints**: <200ms p95 API response, Supabase free tier limits, existing RLS must be preserved for restaurants
**Scale/Scope**: Up to 10,000 users, ~5 new pages/routes, 2 new DB tables, ~10 new components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | TypeScript strict, single-responsibility components, existing patterns followed |
| II. Testing Standards | PASS | Unit tests for hooks/utils, integration tests for DB queries. Test-first per constitution. |
| III. UX Consistency | PASS | Reuses existing design system (Tailwind, BottomNav pattern, CategoryAccordion). Loading/empty/error states specified in spec. |
| IV. Performance | PASS | SC-001–SC-004 define measurable targets within p95 <200ms for DB queries. Indexes planned for search and follow lookups. |
| V. Simplicity | PASS | Direct Supabase queries via hooks (existing pattern), no new abstractions. Two tables, no new dependencies. |

**Gate Result**: PASS — proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/007-social-follow/
├── plan.md              # This file
├── research.md          # Phase 0: technical decisions
├── data-model.md        # Phase 1: profiles + follows tables
├── quickstart.md        # Phase 1: developer setup guide
├── contracts/           # Phase 1: API contracts
│   ├── profiles.md      # Profile read/create
│   ├── follows.md       # Follow/unfollow/list
│   └── user-search.md   # User search
└── tasks.md             # Phase 2: implementation tasks
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── users/
│   │   ├── page.tsx              # /users — People tab (user search)
│   │   └── [id]/
│   │       └── page.tsx          # /users/[id] — Unified profile page
│   ├── my/
│   │   └── page.tsx              # /my — Redirect to /users/[myId]
│   └── auth/
│       └── callback/
│           └── route.ts          # Modified: add profile auto-creation
├── components/
│   ├── BottomNav.tsx             # Modified: add People tab
│   ├── UserCard.tsx              # New: user search result / follower card
│   ├── FollowButton.tsx          # New: follow/unfollow toggle
│   ├── UserSearchBar.tsx         # New: user name search input
│   ├── ProfileHeader.tsx         # New: avatar, name, counts, follow button
│   └── FollowTabs.tsx            # New: inline Followers/Following tabs
├── db/
│   ├── hooks.ts                  # Existing: restaurant hooks
│   ├── profile-hooks.ts          # New: useProfile, useProfiles, useSearchUsers
│   └── follow-hooks.ts           # New: useFollow, useUnfollow, useFollowers, useFollowing, useIsFollowing
├── lib/
│   └── supabase/
│       └── invalidate.ts         # Existing: add new cache keys
└── types/
    └── index.ts                  # Modified: add UserProfile, FollowRelationship types

tests/
├── unit/
│   ├── profile-hooks.test.ts     # New: profile hook tests
│   ├── follow-hooks.test.ts      # New: follow hook tests
│   └── user-search.test.ts       # New: search logic tests
└── integration/
    └── social.test.ts            # New: follow flow integration
```

**Structure Decision**: Follows existing single-project Next.js App Router structure. New files added alongside existing patterns in `src/db/`, `src/components/`, `src/app/`. No new top-level directories.

## Complexity Tracking

No constitution violations — table is empty (no justifications needed).
