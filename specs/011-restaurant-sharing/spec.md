# Feature Specification: Restaurant Sharing (Mutual Follower Recommendations)

**Feature Branch**: `011-restaurant-sharing`
**Created**: 2026-02-18
**Status**: Draft
**Input**: User description: "Add restaurant sharing functionality. If the user is mutual follower, user can recommend restaurant to the user. User can receive alert for friend's recommendation of the restaurant and directly add to his or her 맛집 list or ignore it."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Send Restaurant Recommendation to Mutual Follower (Priority: P1)

A logged-in user is browsing their own wishlist. They want to share a restaurant they love with a friend. They tap a "Recommend" button on the restaurant, see a list of their mutual followers (people they follow AND who follow them back), select a recipient, and send the recommendation. To recommend to multiple people, the user repeats the action. The sender sees confirmation that the recommendation was sent.

**Why this priority**: Sending a recommendation is the core action of this feature — without it, there is no content to receive or act upon. This is the entry point for the entire sharing flow.

**Independent Test**: Can be fully tested by selecting a restaurant from the wishlist, tapping "Recommend", choosing a mutual follower from the list, and confirming the recommendation was sent. Delivers value by enabling social restaurant sharing.

**Acceptance Scenarios**:

1. **Given** a logged-in user viewing a restaurant in their wishlist, **When** they tap the "Recommend" button, **Then** they see a list of their mutual followers (users they follow who also follow them back).
2. **Given** a logged-in user on the recommend screen, **When** they select a mutual follower and tap "Send", **Then** the recommendation is created and the sender sees a success confirmation (e.g., toast: "추천을 보냈습니다").
3. **Given** a logged-in user on the recommend screen, **When** they have no mutual followers, **Then** they see an empty state message explaining that mutual following is required to send recommendations.
4. **Given** a logged-in user, **When** they try to recommend a restaurant they already recommended to the same user, **Then** the system prevents the duplicate and shows a message (e.g., "이미 추천한 맛집입니다").

---

### User Story 2 - Receive and View Recommendation Alert (Priority: P1)

A logged-in user has received a restaurant recommendation from a mutual follower. They see a notification badge on the bell icon in the top app bar. They tap the bell to view their incoming recommendations — a list showing who recommended what restaurant, with restaurant details (name, category, address).

**Why this priority**: Receiving and viewing recommendations completes the communication loop. Without visibility into received recommendations, the sender's action has no effect.

**Independent Test**: Can be tested by having User A send a recommendation to User B, then logging in as User B and verifying the recommendation appears in their notifications/inbox with correct restaurant details and sender info.

**Acceptance Scenarios**:

1. **Given** a logged-in user who has received a new recommendation, **When** they open the app or navigate to the recommendations area, **Then** they see a badge or indicator showing the number of unread recommendations.
2. **Given** a logged-in user viewing their recommendations list, **When** the list loads, **Then** each recommendation shows the sender's display name, profile picture, the restaurant name, category, and address.
3. **Given** a logged-in user viewing their recommendations list, **When** there are no recommendations, **Then** they see an empty state message (e.g., "아직 받은 추천이 없습니다").
4. **Given** a logged-in user who has read a recommendation, **When** they return to the recommendations list, **Then** the previously viewed recommendation is no longer marked as "new/unread".

---

### User Story 3 - Accept or Ignore a Recommendation (Priority: P1)

A logged-in user views a received recommendation and decides whether to add the restaurant to their own 맛집 list or ignore it. If they accept, the restaurant is added to their wishlist. If they ignore, the recommendation is dismissed. Either action removes the recommendation from the pending list.

**Why this priority**: The accept/ignore action is the payoff of the entire feature — it converts a social recommendation into a personal wishlist entry. This directly drives the core value proposition.

**Independent Test**: Can be tested by receiving a recommendation, tapping "Add to my list" and verifying the restaurant appears in the user's wishlist, then receiving another recommendation and tapping "Ignore" and verifying it disappears from the recommendations list.

**Acceptance Scenarios**:

1. **Given** a logged-in user viewing a received recommendation, **When** they tap "Add to my list" (내 맛집에 추가), **Then** the restaurant is added to their wishlist with a default star rating, and the recommendation is marked as accepted and removed from the pending list.
2. **Given** a logged-in user viewing a received recommendation, **When** they tap "Ignore" (무시), **Then** the recommendation is dismissed and removed from the pending list without adding the restaurant.
3. **Given** a logged-in user who already has the recommended restaurant in their wishlist, **When** they view the recommendation, **Then** they see an indication that the restaurant is already saved (e.g., "이미 저장된 맛집입니다") and the "Add" button is disabled or replaced with a "Already saved" label.
4. **Given** a logged-in user who accepts a recommendation, **When** they navigate to their wishlist, **Then** the newly added restaurant appears in the appropriate category group.

---

### User Story 4 - View Sent Recommendations History (Priority: P3)

A logged-in user wants to see what restaurants they have previously recommended to others. They navigate to a "Sent Recommendations" section and see a list of their past recommendations with the recipient name, restaurant name, and status (pending, accepted, ignored).

**Why this priority**: Sent history is a nice-to-have for transparency but is not critical for the core sharing loop. Users can function without it.

**Independent Test**: Can be tested by sending several recommendations, then navigating to the sent history and verifying all sent recommendations appear with correct details.

**Acceptance Scenarios**:

1. **Given** a logged-in user who has sent recommendations, **When** they view their sent recommendations list, **Then** they see each recommendation with the recipient's name, restaurant name, and current status (pending/accepted/ignored).
2. **Given** a logged-in user with no sent recommendations, **When** they view the sent recommendations list, **Then** they see an empty state message.

---

### Edge Cases

- What happens when a mutual follow relationship is broken (one user unfollows) after a recommendation is sent but before it's acted upon? The pending recommendation remains visible and actionable — the relationship was valid at the time of sending.
- What happens when the sender deletes the recommended restaurant from their own wishlist? The recommendation remains valid for the recipient — it references the restaurant data, not the sender's wishlist entry.
- What happens when a user receives multiple recommendations for the same restaurant from different friends? Each recommendation appears separately in the list. Accepting one auto-dismisses the others for the same restaurant (since it's now in the user's wishlist).
- What happens when a recommended restaurant's information changes (e.g., it closes)? The recommendation stores a snapshot of the restaurant info at the time of recommendation. Stale data is acceptable for this version.
- What happens when a user has many pending recommendations (e.g., 50+)? The recommendations list should support scrolling/pagination.
- What happens when the sender or recipient deletes their account? Cascade delete removes the associated recommendations.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST restrict restaurant recommendations to mutual followers only (both users follow each other).
- **FR-002**: System MUST allow a logged-in user to recommend a restaurant from their own wishlist to a single mutual follower per action.
- **FR-003**: System MUST prevent duplicate recommendations (same sender, same restaurant, same recipient while pending).
- **FR-004**: System MUST display a notification indicator (badge count) for unread/pending recommendations.
- **FR-005**: System MUST display a list of received recommendations showing sender info, restaurant name, category, and address.
- **FR-006**: System MUST allow the recipient to accept a recommendation, adding the restaurant to their wishlist.
- **FR-007**: System MUST allow the recipient to ignore/dismiss a recommendation, removing it from the pending list.
- **FR-008**: System MUST indicate when a recommended restaurant is already in the recipient's wishlist.
- **FR-009**: System MUST mark recommendations as read when viewed by the recipient.
- **FR-010**: System MUST auto-dismiss other pending recommendations for the same restaurant when one is accepted.
- **FR-011**: System MUST persist recommendation data (sender, recipient, restaurant info, status, timestamps).
- **FR-012**: System MUST clean up recommendations when either the sender or recipient account is deleted.
- **FR-013**: System MUST preserve pending recommendations even if the mutual follow relationship is subsequently broken.

### Key Entities

- **Recommendation**: A directed suggestion from one user to another for a specific restaurant. Attributes: sender, recipient, restaurant reference, restaurant snapshot (name, category, address, place ID), status (pending/accepted/ignored), read/unread flag, created date, resolved date. One sender can send many recommendations; one recipient can receive many. Uniqueness: one pending recommendation per sender-recipient-restaurant triple.
- **Mutual Follower**: A derived relationship — two users who each follow the other. Not stored separately; computed from existing follow relationships. Used as a prerequisite for sending recommendations.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can send a restaurant recommendation to a mutual follower within 10 seconds (from tapping share to confirmation).
- **SC-002**: Received recommendations are visible to the recipient within 5 seconds of being sent (on next app load or page visit).
- **SC-003**: Accepting a recommendation adds the restaurant to the user's wishlist within 1 second with visible confirmation.
- **SC-004**: The notification badge accurately reflects the count of unread recommendations at all times.
- **SC-005**: 90% of users who receive a recommendation can successfully find and act on it (accept or ignore) without confusion.
- **SC-006**: All recommendation features are accessible only to authenticated users.

## Clarifications

### Session 2026-02-18

- Q: Where should the recommendations inbox be located in the app navigation? → A: Bell icon in the top app bar, accessible from any page. Badge count shows unread recommendations.
- Q: Can users recommend restaurants from another user's profile or search results? → A: Only from own wishlist. User must personally have the restaurant saved to recommend it.
- Q: Should the recommend action support multi-select or single recipient? → A: Single recipient per action. User can repeat the action for multiple people.

## Assumptions

- Mutual follower status is determined at the time of sending a recommendation. If the relationship is later broken, existing pending recommendations remain valid.
- Recommendations store a snapshot of restaurant data (name, category, address, Kakao place ID) at the time of sending, so they remain meaningful even if the sender removes the restaurant from their wishlist.
- The recommendation notification is poll-based (visible on page load/navigation) rather than real-time push. Real-time push notifications may be added in a future iteration.
- When a recipient accepts a recommendation, the restaurant is added to their wishlist with a default star rating (e.g., 0 or unrated). The user can edit the rating later.
- The "Recommend" button is accessible from the wishlist item and/or restaurant detail view.
- The recommendations inbox is accessed via a bell icon in the top app bar, visible from all pages. The bell displays a badge with the count of unread recommendations.

## Out of Scope

- Real-time push notifications (e.g., mobile push, web push, WebSocket)
- Multi-recipient selection (recommending to several users in a single action; user repeats for each recipient)
- Group/shared wishlists
- Comments or messages attached to recommendations (e.g., "You should try the spicy chicken!")
- Recommendation algorithms or automated suggestions ("People who liked X also liked Y")
- Public recommendation feed or timeline
- Restaurant recommendation from search results (only from user's own wishlist)
