# Feature Specification: Social Follow & User Profiles

**Feature Branch**: `007-social-follow`
**Created**: 2026-02-18
**Status**: Draft
**Input**: User description: "Create following functionality. User can search other users with their names and can follow them. User can navigate to other user's profile and see their wishlist."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Search for Other Users (Priority: P1)

A logged-in user wants to discover other people on the platform. They tap the "People" tab in the bottom navigation (4th tab, route `/users`), type a name into a search bar, and see a list of matching users with their profile picture and display name. Each result links to that user's profile.

**Why this priority**: Discovery is the foundation of all social interaction — without the ability to find users, follow and profile features have no entry point.

**Independent Test**: Can be fully tested by searching for a known user by name and verifying results appear. Delivers value by letting users know who else is on the platform.

**Acceptance Scenarios**:

1. **Given** a logged-in user on the user search page, **When** they type "김" into the search field, **Then** they see a list of users whose display name contains "김", each showing profile picture, display name, and a link to their profile.
2. **Given** a logged-in user searching for a name, **When** no users match the query, **Then** they see an empty state message like "No users found."
3. **Given** a logged-in user on the search page, **When** the search query is fewer than 2 characters, **Then** no search is performed (debounced minimum input).
4. **Given** a logged-in user viewing search results, **When** they see themselves in the results, **Then** their own entry is excluded from the list.

---

### User Story 2 - Follow / Unfollow a User (Priority: P1)

A logged-in user finds another user (via search or profile) and taps a "Follow" button to add them to their following list. Tapping again ("Unfollow") removes the relationship. The follow count updates immediately.

**Why this priority**: Following is the core social action that connects discovery (P1) to profile viewing (P2). Without it, viewing other users' wishlists has no persistent social graph.

**Independent Test**: Can be tested by following a user, verifying the button state changes to "Following", navigating away and back, and confirming the follow persists. Unfollowing reverses this.

**Acceptance Scenarios**:

1. **Given** a logged-in user viewing another user's profile, **When** they tap "Follow", **Then** the button changes to "Following" and the target user's follower count increases by 1.
2. **Given** a logged-in user who already follows a user, **When** they tap "Following" (unfollow), **Then** the button reverts to "Follow" and the follower count decreases by 1.
3. **Given** a logged-in user, **When** they attempt to follow themselves, **Then** the follow button is not displayed on their own profile.
4. **Given** a logged-in user who follows several users, **When** they view their "Following" list, **Then** they see all users they follow with profile picture, name, and an unfollow option.

---

### User Story 3 - View Another User's Profile & Wishlist (Priority: P2)

A logged-in user navigates to another user's profile page. They see the user's display name, profile picture, follower/following counts, and that user's restaurant wishlist grouped by category — the same accordion view as their own wishlist, but read-only.

**Why this priority**: Profile viewing is the payoff of discovery and following — it answers "what restaurants does this person recommend?" This is what makes the social graph valuable.

**Independent Test**: Can be tested by navigating to `/users/[userId]` for a known user and verifying their display name, follower/following counts, and wishlist appear correctly in read-only mode.

**Acceptance Scenarios**:

1. **Given** a logged-in user navigating to another user's profile, **When** the page loads, **Then** they see the target user's display name, profile picture, follower count, following count, and wishlist.
2. **Given** a logged-in user viewing another user's wishlist, **When** the wishlist renders, **Then** restaurants are grouped by category in an accordion view (read-only, no edit/delete controls).
3. **Given** a logged-in user viewing another user's profile, **When** that user has no wishlist entries, **Then** they see an empty state like "No restaurants saved yet."
4. **Given** a logged-in user, **When** they tap a restaurant in another user's wishlist, **Then** they can view the restaurant detail (name, address, category, star rating, map link) but cannot edit or remove it.

---

### User Story 4 - View My Followers & Following Lists (Priority: P3)

A logged-in user navigates to their profile page (`/users/[myId]`) and toggles between inline "Followers" and "Following" tabs. Each tab shows user cards with profile pictures, names, and follow/unfollow buttons. These same tabs appear on other users' profiles too.

**Why this priority**: Managing your social graph is important but secondary to the core loop of discover → follow → view wishlist.

**Independent Test**: Can be tested by following several users, then verifying both the "Following" list and "Followers" list display correct counts and entries.

**Acceptance Scenarios**:

1. **Given** a logged-in user on their profile page, **When** they tap "Following", **Then** they see a list of all users they follow, each with a profile picture, name, and "Unfollow" button.
2. **Given** a logged-in user on their profile page, **When** they tap "Followers", **Then** they see a list of all users who follow them, each with profile picture, name, and a "Follow back" option (if not already following).
3. **Given** a logged-in user with no followers, **When** they view the Followers tab, **Then** they see an empty state message.

---

### Edge Cases

- What happens when a user deletes their account while others follow them? Follow relationships referencing that user should be automatically cleaned up (cascade delete).
- What happens when a user's Kakao profile name changes? The display name should reflect the latest OAuth metadata on next login.
- What happens when two users have identical display names? Search results show profile pictures alongside names to help distinguish; no uniqueness constraint on display names.
- What happens if a user has 1000+ followers? Follower/following lists should paginate (load more on scroll) rather than loading all at once.
- What happens when viewing a profile while offline? Show a clear error or cached state; do not silently show stale data.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow logged-in users to search for other users by display name with a minimum query length of 2 characters.
- **FR-002**: System MUST exclude the searching user from their own search results.
- **FR-003**: System MUST display user search results with profile picture, display name, and a link to their profile.
- **FR-004**: System MUST allow a logged-in user to follow another user by tapping a "Follow" button.
- **FR-005**: System MUST allow a logged-in user to unfollow a user they currently follow.
- **FR-006**: System MUST prevent a user from following themselves.
- **FR-007**: System MUST display follower count and following count on each user's profile.
- **FR-008**: System MUST display another user's restaurant wishlist on their profile page, grouped by category in a read-only accordion view.
- **FR-009**: System MUST allow navigation to a restaurant's detail view from another user's wishlist (read-only, no edit/delete).
- **FR-010**: System MUST provide a "Following" inline tab on the profile page showing all users the profile owner follows.
- **FR-011**: System MUST provide a "Followers" inline tab on the profile page showing all users who follow the profile owner.
- **FR-012**: System MUST auto-create a user profile from Kakao OAuth metadata (display name, profile picture) on first login.
- **FR-013**: System MUST update follower/following counts in real-time (optimistic UI) when follow/unfollow actions occur.
- **FR-014**: System MUST paginate search results and follower/following lists for users with many results.

### Key Entities

- **User Profile**: A public-facing representation of a user. Attributes: user ID, display name, profile picture URL, follower count, following count, created date. Derived from Kakao OAuth metadata. One profile per authenticated user.
- **Follow Relationship**: A directed relationship from one user (follower) to another (followed). Attributes: follower user ID, followed user ID, created date. A user can follow many users and be followed by many users. No self-follows allowed.
- **Restaurant (existing)**: Existing wishlist entity. In the social context, another user's restaurants become viewable (read-only) through their profile. No changes to the restaurant entity itself.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can find another user by name and navigate to their profile within 10 seconds of starting a search.
- **SC-002**: Follow/unfollow actions complete with visible UI feedback within 1 second.
- **SC-003**: Another user's wishlist loads and displays on their profile page within 2 seconds.
- **SC-004**: User search returns results within 1 second for databases up to 10,000 users.
- **SC-005**: Follower and following counts are accurate and reflect changes immediately after follow/unfollow actions.
- **SC-006**: All social features are accessible only to authenticated users; unauthenticated access redirects to login.

## Clarifications

### Session 2026-02-18

- Q: Where does user search live in the app's navigation? → A: New 4th bottom nav tab "People" at `/users`, alongside Wishlist, Search, My.
- Q: Should own profile and other users' profiles share the same page? → A: Unified profile page at `/users/[id]` for all users. `/my` redirects to or wraps `/users/[myId]` with same layout but conditional controls (edit own, follow others).
- Q: How should followers and following lists be displayed? → A: Inline tabs on the `/users/[id]` profile page. Users toggle between "Followers" and "Following" tabs directly on the profile, no separate routes.

## Assumptions

- All user profiles are public by default. There is no private/public profile toggle in this initial version. Privacy controls may be added in a future iteration.
- Display names come from Kakao OAuth metadata and are not editable by users in this version.
- Restaurant wishlists are fully visible to anyone viewing a user's profile. There is no per-restaurant privacy setting.
- The follow relationship is one-directional (A follows B does not imply B follows A).
- There is no notification system for new followers in this version.
- There is no activity feed or "what my followed users added recently" feature in this version.

## Out of Scope

- Private/public profile toggle
- Editable user profiles (bio, custom display name)
- Notification system (new follower alerts)
- Activity feed / timeline of followed users' actions
- Blocking or muting users
- Shared wishlists or collaborative lists
- Direct messaging between users
