# Feature Specification: Wishlist Add Feedback & Search Status Sync

**Feature Branch**: `020-list-add-notify`
**Created**: 2026-02-22
**Status**: Draft
**Input**: User description: "Notify user when adding new restaurant to own list. And user can see updated restaurant item in search list if it's added to list."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add-to-List Confirmation Notification (Priority: P1)

A user browses the restaurant search results and taps the bookmark/add button on a restaurant. Immediately after the action succeeds or fails, the app displays a brief notification (toast/snackbar) confirming the outcome — e.g., "Added to your list" or "Failed to save. Please try again."

**Why this priority**: Without any feedback, users cannot tell if the action worked, leading to duplicate taps and confusion. This is the most basic affordance expected of any save/add action on mobile.

**Independent Test**: Can be tested standalone by triggering an add-to-list action and verifying a notification appears and then auto-dismisses. Delivers immediate user value as clear confirmation of action.

**Acceptance Scenarios**:

1. **Given** a logged-in user views search results, **When** the user taps the add button on a restaurant not yet in their list, **Then** a success notification appears within 1 second reading "Added to your list" (or equivalent).
2. **Given** a logged-in user views search results, **When** the user taps the add button and the save operation fails, **Then** an error notification appears within 1 second reading "Failed to save. Please try again." (or equivalent).
3. **Given** a success or error notification is displayed, **When** 3–4 seconds pass, **Then** the notification auto-dismisses without any user action.
4. **Given** a success notification is displayed, **When** the user taps anywhere else, **Then** the notification dismisses immediately.

---

### User Story 2 - Search Result Card Reflects Saved Status (Priority: P2)

After a user adds a restaurant to their list from the search results, the restaurant card in the search results immediately updates its visual indicator (e.g., a filled bookmark icon) to reflect the saved state — without a page refresh or re-search.

**Why this priority**: Visual status in the list gives users confidence they don't need to repeat the action. Without this, they must navigate to their wishlist to verify, disrupting the search flow.

**Independent Test**: Add a restaurant to the list from the search view; verify the card's add-button changes state within 2 seconds, confirming "already saved" status.

**Acceptance Scenarios**:

1. **Given** a user has not added a restaurant, **When** they view it in search results, **Then** the card's save indicator is in an "unsaved" state.
2. **Given** a user successfully adds a restaurant from search results, **When** the save completes, **Then** the same card's save indicator transitions to a "saved" state without any page reload.
3. **Given** a restaurant was previously added in an earlier session, **When** the user sees it in search results, **Then** the card already displays the "saved" state on load.
4. **Given** a save action fails, **When** the error notification appears, **Then** the card's save indicator remains in the "unsaved" state.

---

### Edge Cases

- What happens when the user taps add very rapidly (double-tap): the system prevents duplicate additions; only one notification is shown.
- What happens when the user is offline when tapping add: an error notification appears immediately.
- What happens if the user scrolls the search list while the notification is visible: the notification remains anchored and visible.
- What happens for restaurants already in the list: the indicator correctly reflects the saved state; the add action is not repeatable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display an in-app notification (toast/snackbar) when a user successfully adds a restaurant to their own wishlist.
- **FR-002**: System MUST display an in-app notification when adding a restaurant to the wishlist fails for any reason.
- **FR-003**: Notifications MUST auto-dismiss after 3–4 seconds without user action.
- **FR-004**: Notifications MUST be dismissible by a user tap at any time before auto-dismiss.
- **FR-005**: Restaurant cards in the search results MUST display a visual indicator reflecting whether the restaurant is already in the current user's wishlist.
- **FR-006**: The saved-state indicator on a restaurant card MUST update immediately after a successful add action, without requiring page reload or re-search.
- **FR-007**: The saved-state indicator MUST remain in the unsaved state if the add action fails.
- **FR-008**: System MUST prevent duplicate add operations if the user taps the add button multiple times rapidly.
- **FR-009**: The saved-state indicator MUST reflect pre-existing saved restaurants when search results load (restaurants saved in prior sessions appear as "saved" from the start).

### Key Entities

- **WishlistItem**: A restaurant saved to a user's list; identified by restaurant reference and owner; has a creation timestamp.
- **RestaurantCard**: The UI element in search results representing a single restaurant; carries a saved/unsaved visual state derived from the user's wishlist.
- **Notification**: A transient in-app message showing the outcome of the add operation; has content, type (success/error), and auto-dismissal behavior.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A feedback notification appears within 1 second of the user completing an add-to-list action, for both success and failure cases.
- **SC-002**: 100% of restaurant cards that were just added show the updated saved state within 2 seconds, without any additional user action.
- **SC-003**: 100% of restaurants previously saved appear with the correct saved indicator on search results load.
- **SC-004**: Users can complete the add-to-list flow without any second tap or manual verification step, as confirmed by the visible in-app notification.

## Assumptions

- Notifications are in-app only (no push notifications, SMS, or email).
- The update to the search list applies only to the current session view; cross-tab or multi-device sync is out of scope.
- Only the user's own wishlist is relevant — notifications and indicators are scoped to the current logged-in user.
- The visual indicator on the card is an icon or button state change (e.g., filled vs. outline bookmark); specific visual design is left to implementation.
- Notification duration of 3–4 seconds follows standard mobile UX conventions.
