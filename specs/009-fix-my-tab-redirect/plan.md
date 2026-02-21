# Implementation Plan: Fix My Tab Redirect

**Branch**: `009-fix-my-tab-redirect` | **Date**: 2026-02-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/009-fix-my-tab-redirect/spec.md`

## Summary

The `/my` page currently acts as a redirect gate — it fetches the authenticated user, upserts their profile, then immediately redirects to `/users/{user-id}`. This causes the "사람" tab to activate instead of "MY" because the BottomNav uses `pathname.startsWith(tab.href)` to determine the active tab.

**Approach**: Extract the profile rendering logic from `/users/[id]/page.tsx` into a shared `UserProfileView` component. Reuse it in both `/my/page.tsx` (with auth + upsert) and `/users/[id]/page.tsx` (with route param). The URL stays at `/my`, so the BottomNav correctly highlights the "MY" tab.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 15 (App Router), React 19, Supabase (@supabase/ssr)
**Storage**: Supabase Postgres (no schema changes needed)
**Testing**: Manual testing (project has no automated test suite currently)
**Target Platform**: Mobile-first web app (Vercel deployment)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Profile renders within 1 second of tab tap (SC-001)
**Constraints**: No new dependencies, no database changes, front-end routing fix only
**Scale/Scope**: 3 files modified, 1 new component file

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Extracting shared component eliminates future duplication |
| II. Testing Standards | PASS (justified) | No automated test suite exists in the project; manual testing covers acceptance scenarios |
| III. UX Consistency | PASS | Fixes navigation inconsistency — MY tab will correctly stay active |
| IV. Performance | PASS | Same data fetching, no additional queries; removes one `router.replace` hop |
| V. Simplicity | PASS | Minimal change — extract component, reuse in two places |

## Project Structure

### Documentation (this feature)

```text
specs/009-fix-my-tab-redirect/
├── plan.md              # This file
└── spec.md              # Feature specification
```

### Source Code (files touched)

```text
src/
├── app/
│   ├── my/page.tsx              # MODIFY: Remove redirect, render profile inline
│   └── users/[id]/page.tsx      # MODIFY: Use shared UserProfileView component
└── components/
    └── UserProfileView.tsx      # CREATE: Shared profile view component
```

**Structure Decision**: Shared component in `src/components/` following existing conventions (e.g., `ProfileHeader.tsx`, `FollowTabs.tsx` already live there).

## Design

### Component Extraction

**New file: `src/components/UserProfileView.tsx`**

Extract the entire profile rendering body from `/users/[id]/page.tsx` into a reusable component:

```
Props:
  - userId: string          (which profile to display)
  - isOwnProfile: boolean   (controls edit/follow button visibility)

Internal state:
  - Uses useProfileWithCounts(userId) for profile data
  - Uses useUserWishlistGrouped(userId) for wishlist data

Renders:
  - Loading skeleton (existing)
  - "사용자를 찾을 수 없습니다" empty state (existing)
  - ProfileHeader + FollowTabs + CategoryAccordion (existing)
```

**Modified file: `src/app/my/page.tsx`**

```
1. Fetch authenticated user (existing)
2. If no user → router.replace("/login") (existing)
3. Upsert profile to DB (existing)
4. Set userId in state
5. Render <UserProfileView userId={userId} isOwnProfile={true} />  ← NEW
   (was: router.replace(`/users/${id}`))
```

**Modified file: `src/app/users/[id]/page.tsx`**

```
1. Extract id from params (existing)
2. Fetch current user ID for isOwnProfile check (existing)
3. Render <UserProfileView userId={id} isOwnProfile={isOwnProfile} />  ← SIMPLIFIED
```

### BottomNav — No Changes Needed

The active tab logic already works correctly:
- `pathname.startsWith("/my")` → "MY" tab active
- `pathname.startsWith("/users")` → "사람" tab active

The bug was that `/my` redirected to `/users/{id}`, changing the pathname. Removing the redirect fixes the tab highlighting automatically.

## Build Sequence

1. **Create** `src/components/UserProfileView.tsx` — extract from `users/[id]/page.tsx`
2. **Modify** `src/app/users/[id]/page.tsx` — replace inline rendering with `<UserProfileView />`
3. **Modify** `src/app/my/page.tsx` — replace redirect with `<UserProfileView />`
4. **Verify** build passes (`pnpm build`)
5. **Manual test**: Tap MY tab → stays at `/my`, MY tab active, profile renders
