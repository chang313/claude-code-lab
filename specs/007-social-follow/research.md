# Research: Social Follow & User Profiles

**Feature**: 007-social-follow | **Date**: 2026-02-18

## R1: Profile Storage Strategy

**Decision**: Separate `profiles` table with auto-creation via auth callback trigger.

**Rationale**: Supabase `auth.users` is system-managed and cannot be queried by other users due to RLS. A dedicated `profiles` table allows public reads (for search, profile viewing) while keeping auth data private. Profile is created in the `/auth/callback` route after successful OAuth, using `user.user_metadata` (name, avatar_url) from Kakao.

**Alternatives considered**:
- Supabase auth triggers (database function on `auth.users` insert) — too coupled to Supabase internals, harder to debug.
- Lazy creation on first search hit — creates race conditions and stale search results.

## R2: Follower/Following Count Strategy

**Decision**: Computed counts via Supabase `.select('count')` aggregate, not materialized columns.

**Rationale**: At the expected scale (up to 10K users), counting follows per query is fast with proper indexes. Avoids the complexity of maintaining denormalized counters (increment/decrement on every follow/unfollow, transaction risks on concurrent updates). Optimistic UI handles perceived latency.

**Alternatives considered**:
- Materialized `follower_count` / `following_count` columns on `profiles` — simpler reads but requires triggers or application-level counter management, introduces race conditions under concurrent follows.
- Postgres materialized views — overkill for this scale, adds operational complexity.

## R3: User Search Implementation

**Decision**: Supabase `ilike` query on `profiles.display_name` with debounced client input (300ms) and minimum 2-character query.

**Rationale**: `ilike` with a `%query%` pattern is sufficient for substring matching on display names at 10K user scale. No full-text search needed. Adding a GIN trigram index (`pg_trgm`) on `display_name` would optimize this if needed later.

**Alternatives considered**:
- Supabase full-text search (`to_tsvector`) — too heavy for name substring matching; FTS is word-boundary based, not substring.
- Client-side filtering after bulk fetch — doesn't scale, loads all profiles to client.

## R4: RLS Policy for Cross-User Wishlist Viewing

**Decision**: Add a new RLS SELECT policy on `restaurants` table: `authenticated users can SELECT any row` (remove the `user_id = auth.uid()` restriction on SELECT only). INSERT/UPDATE/DELETE policies remain user-scoped.

**Rationale**: The spec requires viewing another user's wishlist. Currently, RLS restricts all operations (including SELECT) to the row owner. We need to open SELECT to all authenticated users while keeping mutations locked to the owner. This is the simplest change — one policy modification.

**Alternatives considered**:
- Separate `public_restaurants` view — adds complexity without benefit since all wishlists are public per spec.
- Server-side API route that bypasses RLS with service role key — breaks the Supabase pattern and adds a custom API layer.

## R5: Profile Auto-Creation Timing

**Decision**: Create profile in `/auth/callback/route.ts` after successful `exchangeCodeForSession`, using upsert to handle returning users (update name/avatar on each login).

**Rationale**: The auth callback is the only guaranteed point where we have fresh Kakao metadata. Upsert (ON CONFLICT user_id DO UPDATE) handles both first-time and returning users, keeping display_name and avatar_url in sync with Kakao.

**Alternatives considered**:
- Database trigger on `auth.users` — requires Supabase SQL access, harder to test and debug.
- Lazy creation on profile page load — first search won't find users who haven't visited their profile.

## R6: Route Structure for `/my` → `/users/[id]` Unification

**Decision**: `/my/page.tsx` fetches the current user's ID and renders a client-side redirect to `/users/[userId]`. The `/users/[id]/page.tsx` checks if `id === currentUserId` to conditionally render edit controls vs. follow button.

**Rationale**: A server-side redirect from `/my` to `/users/[id]` would require an async call to get the user ID, which is fine in Next.js App Router. The unified profile page keeps a single source of truth for profile layout. The `isOwnProfile` boolean drives conditional UI.

**Alternatives considered**:
- Shared layout component imported by both `/my` and `/users/[id]` — adds indirection without benefit.
- Remove `/my` entirely — breaks existing bookmarks and the bottom nav "My" tab UX.
