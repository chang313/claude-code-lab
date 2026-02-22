# Feature Specification: Profile Star Ratings

**Feature Branch**: `016-profile-star-ratings`
**Created**: 2026-02-22
**Status**: Draft
**Input**: User description: "User can see other people's star rating in their profile page."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Star Ratings on Other Users' Profiles (Priority: P1)

A logged-in user visits another user's profile page and can see the star ratings (1-3 stars) that the profile owner has given to their visited restaurants. This provides social discovery value — users can quickly gauge how much someone liked a place.

**Why this priority**: This is the core feature request. Without visible star ratings on other profiles, users see restaurant names but cannot tell how the profile owner rated them.

**Independent Test**: Navigate to `/users/[id]` for a user with visited restaurants → verify read-only star ratings appear next to each visited restaurant card.

**Acceptance Scenarios**:

1. **Given** a user views another user's profile who has visited restaurants with star ratings, **When** the profile page loads, **Then** each visited restaurant card displays the star rating as read-only filled stars (1-3)
2. **Given** a user views another user's profile, **When** they see star ratings, **Then** the stars are not interactive (cannot be tapped/clicked to change)
3. **Given** a user views another user's profile who has only wishlist items (no star ratings), **When** the wishlist section loads, **Then** no star ratings are shown for wishlist items (since they have no rating)

---

### User Story 2 - View Star Ratings on Own Profile (Priority: P2)

A logged-in user views their own profile page (`/my` or `/users/[own-id]`) and can see read-only star ratings next to their visited restaurants, consistent with how others see their profile.

**Why this priority**: Consistency — users should see the same star rating display on their own profile as others see, so there's no confusion about what information is public.

**Independent Test**: Navigate to own profile → verify star ratings appear next to visited restaurants in read-only mode.

**Acceptance Scenarios**:

1. **Given** a user views their own profile, **When** the visited restaurant section loads, **Then** each visited restaurant displays its star rating as read-only filled stars
2. **Given** a user sees star ratings on their own profile, **When** they view the same profile as another user would, **Then** the star rating display is visually identical

---

### Edge Cases

- What happens when a restaurant has a star rating of exactly 1, 2, or 3? → All three values display correctly with the corresponding number of filled stars
- What happens when viewing a profile with no visited restaurants? → The existing "아직 방문한 맛집이 없습니다" empty state is shown, no stars appear
- What happens on small screens? → Star rating component already supports `size="sm"` which fits mobile layouts

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display star ratings as read-only on visited restaurant cards when viewing any user's profile page
- **FR-002**: Star ratings MUST show as filled yellow stars matching the saved rating (1, 2, or 3 stars)
- **FR-003**: Star ratings on profile pages MUST NOT be interactive — users cannot change another user's ratings
- **FR-004**: Star ratings on own profile page MUST also be read-only (consistent with other user view)
- **FR-005**: Wishlist restaurant cards (no star rating) MUST NOT display any star indicator

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of visited restaurant cards on profile pages display the correct read-only star rating
- **SC-002**: Star rating display loads within the same time as the restaurant card (no additional loading delay)
- **SC-003**: Star ratings are visually consistent between the profile page view and other star rating displays in the app

## Assumptions

- The existing `StarRating` component with `readonly` mode is reused — no new UI component is needed
- Star ratings on profile cards use the `sm` size variant to fit the compact card layout
- The existing database queries already return `star_rating` for profile restaurant lists — no schema or API changes are needed
