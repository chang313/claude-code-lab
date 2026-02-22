# Feature Specification: Optimistic Updates & Star Rating Bug Fix

**Feature Branch**: `022-optimistic-updates`
**Created**: 2026-02-22
**Status**: Draft
**Input**: User description: "Prevent re-loading when user update information of saved item. User can experience updates like native app. Also, fix star rating updating not applied bug for 4,5 stars."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Star Rating Bug Fix for 4 and 5 Stars (Priority: P1)

A user taps the 4th or 5th star on a visited restaurant card to update the rating. The new rating is saved and persists across page refreshes.

**Why this priority**: This is a critical data integrity bug — users cannot save ratings of 4 or 5 stars. The feature (5-star scale from feature #022) is fundamentally broken for 40% of the rating options.

**Independent Test**: Tap the 4th or 5th star on any visited restaurant card. Refresh the page. The rating should still show 4 or 5 stars.

**Acceptance Scenarios**:

1. **Given** a visited restaurant with a 2-star rating, **When** the user taps the 4th star, **Then** the rating updates to 4 and persists after page refresh
2. **Given** a visited restaurant with no rating issue for 1-3 stars, **When** the user taps stars 1, 2, or 3, **Then** ratings continue to work as before (no regression)
3. **Given** a visited restaurant, **When** the user taps the 5th star, **Then** the rating updates to 5 and is reflected in the detail page, home page, and other users' profile views
4. **Given** a wishlist restaurant, **When** the user taps the 4th or 5th star to promote it to visited, **Then** the restaurant moves to the visited list with the correct 4 or 5 star rating

---

### User Story 2 - Instant Star Rating Update Without Page Reload (Priority: P2)

A user changes the star rating on a visited restaurant and sees the new rating reflected immediately in the UI without any loading state or page reload. The experience feels like a native app.

**Why this priority**: The current cache invalidation strategy causes a visible loading flash after every mutation. This is the most common user action (rating change) and the reload is jarring.

**Independent Test**: Tap a different star rating on a visited card. Observe that the star UI updates instantly with no loading indicator, flicker, or card re-render.

**Acceptance Scenarios**:

1. **Given** a visited restaurant showing 3 stars, **When** the user taps the 5th star, **Then** the star display immediately shows 5 yellow stars without any loading state
2. **Given** a successful star update, **When** the server confirms the change, **Then** no additional visual changes occur (the UI already shows the correct state)
3. **Given** a star update that fails on the server, **When** the server returns an error, **Then** the stars revert to the previous value and the user sees a brief error indication

---

### User Story 3 - Instant Wishlist-to-Visited Promotion Without Reload (Priority: P2)

A user taps a star on a wishlist restaurant card to promote it to visited. The card moves from the wishlist section to the visited section immediately, without a full data reload.

**Why this priority**: This is the second most common mutation. The full refetch causes both the wishlist and visited sections to flash through a loading state.

**Independent Test**: Tap a star on a wishlist card. Observe that the card disappears from the wishlist section and appears in the visited section without the entire page re-rendering.

**Acceptance Scenarios**:

1. **Given** a wishlist restaurant, **When** the user taps the 3rd star, **Then** the card immediately moves to the visited section showing 3 stars
2. **Given** the promotion succeeds on the server, **When** data is confirmed, **Then** no additional visual changes occur
3. **Given** the promotion fails on the server, **When** the error occurs, **Then** the card returns to the wishlist section and a brief error is shown

---

### User Story 4 - Instant Delete and Move-to-Wishlist Without Reload (Priority: P3)

A user deletes a restaurant or moves a visited restaurant back to the wishlist. The UI updates immediately without reloading all data.

**Why this priority**: These are less frequent actions but still cause the same reload flash. Completing this delivers a fully native-feeling experience.

**Independent Test**: Delete a visited restaurant. Observe that the card disappears immediately. Move a visited restaurant to wishlist. Observe the card moves sections immediately.

**Acceptance Scenarios**:

1. **Given** a visited restaurant, **When** the user taps delete, **Then** the card disappears immediately from the visited section
2. **Given** a visited restaurant, **When** the user taps "위시리스트로", **Then** the card moves to the wishlist section immediately (star rating is cleared)
3. **Given** any mutation that fails, **When** the server returns an error, **Then** the UI reverts to the previous state

---

### Edge Cases

- What happens when the user rapidly taps different star ratings in quick succession? (Last value wins, intermediate updates should not cause visual flickering)
- What happens when the user is offline or has a slow network? (Optimistic update shows immediately; if the server call eventually fails, the UI reverts)
- What happens when the same restaurant is visible in multiple views (e.g., detail page and home page)? (All views should update consistently after the server confirms)
- What happens when the database rejects a star rating value? (The user should see the stars revert to the previous value with a brief error indication — not silent failure)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to save star ratings of 1, 2, 3, 4, or 5 for any restaurant (database must support the full 5-star scale)
- **FR-002**: System MUST update the star rating display immediately when the user taps a star, before the server responds
- **FR-003**: System MUST revert the displayed star rating to the previous value if the server rejects the update
- **FR-004**: System MUST show the user a brief, non-blocking error indication when a mutation fails (e.g., toast notification)
- **FR-005**: System MUST update the restaurant list display immediately when items are promoted, demoted, or deleted — without a full data reload
- **FR-006**: System MUST handle rapid successive mutations on the same item without visual flickering (last action wins)
- **FR-007**: System MUST keep all visible views of the same restaurant consistent after a mutation is confirmed by the server

### Key Entities

- **Restaurant**: User's saved restaurant entry — key attributes: name, star rating (1-5 or null), list membership (wishlist if null rating, visited if rated)
- **Cache Entry**: Local in-memory representation of restaurant data — updated optimistically before server confirmation, rolled back on failure

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully save ratings of 4 and 5 stars, verified by the value persisting after page refresh
- **SC-002**: Star rating changes are visually reflected within 50ms of user tap (before any network round-trip)
- **SC-003**: List mutations (promote, demote, delete) are visually reflected within 50ms of user action
- **SC-004**: Failed mutations revert the UI to the previous state and show an error indication within 2 seconds of server error
- **SC-005**: No full-page loading indicators appear during any restaurant list mutation

## Assumptions

- The star rating bug for 4 and 5 stars is caused by a database constraint (CHECK constraint) that was not updated when the scale changed from 1-3 to 1-5 in feature #022. If the root cause differs, the fix approach may change but the user-facing behavior remains the same.
- The existing custom cache invalidation system (`invalidate()` / `subscribe()`) will be extended to support optimistic updates rather than replacing it with a third-party library (e.g., TanStack Query).
- Error rollback will use a simple "snapshot before mutation → restore on error" approach rather than a full undo/redo system.
- Toast notifications from feature #020 will be reused for error feedback on failed mutations.
