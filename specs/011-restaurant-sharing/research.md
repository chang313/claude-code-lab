# Research: Restaurant Sharing

**Feature**: 011-restaurant-sharing | **Date**: 2026-02-18

## R1: Mutual Follower Query Pattern

**Decision**: Use a self-join on the `follows` table to compute mutual followers.

**Rationale**: Mutual followers = users where BOTH directions of follow exist. A self-join (`follows f1 JOIN follows f2 ON f1.follower_id = f2.followed_id AND f1.followed_id = f2.follower_id`) is the standard approach for bidirectional relationship queries. No need for a materialized `mutual_follows` table at this scale (~100 users).

**Alternatives considered**:
- Materialized view / separate table: Overkill for current scale. Adds write-time overhead on every follow/unfollow.
- Application-level computation (fetch followers + following, intersect in JS): Viable but less efficient and harder to paginate. DB-level join is simpler.

**Supabase implementation**: Use a Postgres function (`get_mutual_followers(user_id)`) exposed via `.rpc()` since Supabase's query builder doesn't support self-joins directly.

## R2: Restaurant Identity for Deduplication

**Decision**: Use `kakao_place_id` as the canonical restaurant identifier.

**Rationale**: The existing `restaurants` table uses `kakao_place_id` as the unique external identifier (with a unique constraint per user). When checking "is this restaurant already in the recipient's wishlist" or preventing duplicate recommendations, matching on `kakao_place_id` is the natural choice.

**Alternatives considered**:
- Internal DB `id` (auto-increment): Not portable across users' wishlists — the same physical restaurant has different `id` values in different users' rows.
- Name + address matching: Fuzzy, error-prone, not reliable.

## R3: Notification Badge — Poll vs. Real-Time

**Decision**: Poll-based badge count via Supabase query on page load/navigation.

**Rationale**: The spec explicitly scopes real-time push as out of scope. A simple `SELECT count(*) FROM recommendations WHERE recipient_id = auth.uid() AND status = 'pending' AND is_read = false` query on component mount is sufficient. The `TopBar` component will call this hook, and since it renders on every page (via layout), the badge refreshes on navigation.

**Alternatives considered**:
- Supabase Realtime (Postgres changes channel): Would provide instant updates but adds complexity (WebSocket connection management, subscription lifecycle). Deferred to future iteration.
- Polling interval (setInterval): Unnecessary overhead when navigation-based refresh is sufficient for this app's usage pattern (users actively navigate between tabs).

## R4: Recommendation Snapshot vs. Live Reference

**Decision**: Store a snapshot of restaurant data (name, category, address, kakao_place_id) in the recommendation row.

**Rationale**: Per spec, recommendations must remain valid even if the sender removes the restaurant from their wishlist. A snapshot ensures the recipient always sees the restaurant info. The `kakao_place_id` is also stored so the system can check if the recipient already has it.

**Alternatives considered**:
- Foreign key to `restaurants` table: Would break if sender deletes the restaurant. Also, `restaurants` has a composite uniqueness (user_id + kakao_place_id), so referencing it from a recommendation is awkward.
- Separate `restaurant_snapshots` table: Over-normalized for this use case. Inline columns are simpler.

## R5: Accept Flow — How to Add Restaurant to Wishlist

**Decision**: On accept, insert a new row into `restaurants` table using the snapshot data from the recommendation, mapped to a `KakaoPlace`-like shape for the existing `useAddRestaurant` pattern.

**Rationale**: The existing `useAddRestaurant` hook takes a `KakaoPlace` object and inserts into `restaurants`. We can construct a compatible object from the recommendation snapshot. This reuses the existing insertion logic (including duplicate handling via `23505` unique constraint error).

**Alternatives considered**:
- New dedicated insert function: Duplicates existing logic without benefit.
- Direct SQL insert bypassing the hook: Loses the invalidation and error handling logic.

## R6: Top Bar Component Placement

**Decision**: Add a `TopBar` component to `AuthLayoutShell`, rendered above `<main>` on all authenticated pages. Contains the app title/logo area and the bell icon with badge.

**Rationale**: The spec says the bell icon should be "accessible from any page." The layout shell (`AuthLayoutShell`) already wraps all authenticated pages and is the correct place for persistent UI. Currently it only has `OfflineBanner` above `<main>` — the `TopBar` slots in naturally.

**Alternatives considered**:
- Per-page header: Would require duplicating the bell icon across every page component. Violates DRY.
- BottomNav integration: Bell icon in bottom nav would compete with the existing 4 tabs and doesn't fit the standard mobile pattern (notifications live at the top).
