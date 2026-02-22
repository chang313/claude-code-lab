# Feature Specification: Fix My Restaurant List User Filter

**Feature Branch**: `018-fix-mylist-user-filter`
**Created**: 2026-02-22
**Status**: Draft
**Input**: User description: "'맛집' tab should show current logged-in user's saved list not 박창현's list"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Logged-in user sees only their own restaurants on the main tab (Priority: P1)

When a logged-in user opens the app's main page ('나의 맛집' tab), they should see only their own saved and visited restaurants — not restaurants saved by other users. Currently, the main page shows all users' data because the database queries lack a user-specific filter.

**Why this priority**: This is the core bug. Users see other people's restaurant lists mixed with their own, making the feature unusable for personal list management.

**Independent Test**: Log in as two different users who each have saved different restaurants. Verify each user only sees their own list on the main page.

**Acceptance Scenarios**:

1. **Given** User A is logged in and has 3 saved restaurants, **When** User A opens the main page ('나의 맛집' tab), **Then** only User A's 3 restaurants are displayed (not restaurants from other users).
2. **Given** User B is logged in and has 5 visited restaurants with ratings, **When** User B views the '방문한 곳' (visited) section, **Then** only User B's 5 rated restaurants are shown.
3. **Given** User A is logged in and User B has 10 wishlist items, **When** User A views the '가고 싶은 곳' (wishlist) section, **Then** User B's wishlist items do not appear.

---

### User Story 2 - Other users' profiles still show their restaurants (Priority: P1)

The social profile feature must continue working correctly — when viewing another user's profile page, their restaurants should still be visible.

**Why this priority**: Equal priority to the bug fix because the fix must not break the existing social profile feature that relies on cross-user data visibility.

**Independent Test**: After applying the fix, navigate to another user's profile and verify their restaurant list is still fully visible.

**Acceptance Scenarios**:

1. **Given** User A is logged in and navigates to User B's profile, **When** the profile page loads, **Then** User B's saved and visited restaurants are displayed correctly.
2. **Given** the main page queries are fixed to filter by current user, **When** viewing any other user's profile, **Then** that user's full restaurant list remains visible (no regression).

---

### Edge Cases

- What happens when a user is not logged in and tries to view the main page? (Existing redirect to login should continue working.)
- What happens when the logged-in user has zero saved restaurants? (Empty state should display normally.)
- What happens when the current user's session expires mid-use? (Existing auth handling should apply.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The main page ('나의 맛집') MUST display only restaurants belonging to the currently logged-in user.
- **FR-002**: The visited restaurants section MUST show only the current user's rated restaurants.
- **FR-003**: The wishlist section MUST show only the current user's unrated (wishlist) restaurants.
- **FR-004**: The current user's identity MUST be obtained from the active authentication session, not hardcoded or assumed.
- **FR-005**: Other users' profile pages MUST continue to display that user's restaurants without regression.

### Key Entities

- **Restaurant**: A saved place belonging to a specific user, identified by user_id. Restaurants with a star_rating are "visited"; those without are "wishlist" items.
- **User**: An authenticated user identified by their session. Each user has their own collection of restaurants.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every logged-in user sees exactly and only their own restaurants on the main tab — zero cross-user data leakage.
- **SC-002**: Profile pages for other users continue to show that user's full restaurant list (no regression).
- **SC-003**: Switching between user accounts on the same device shows the correct per-user restaurant list each time.

## Assumptions

- The database already stores `user_id` on each restaurant record, so no schema changes are needed.
- Row-Level Security (RLS) allows all authenticated users to read all restaurant records (changed in feature 007 for social profiles). The fix is at the application query level, not the RLS level.
- The current user's ID is available via the Supabase auth session (`supabase.auth.getUser()`).
- A correct implementation already exists in the profile hooks (`useUserVisitedGrouped` and `useUserWishlistGrouped`), which can serve as a reference pattern.
