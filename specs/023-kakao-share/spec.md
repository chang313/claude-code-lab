# Feature Specification: KakaoTalk Service Share

**Feature Branch**: `023-kakao-share`
**Created**: 2026-02-22
**Status**: Draft
**Input**: User description: "User can share this service link to friends with kakao talk."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Share Service Entry Point via KakaoTalk (Priority: P1)

A logged-in user wants to invite a friend to join the restaurant wishlist service. They tap a "Share via KakaoTalk" button visible in the app (e.g., in the header or a menu). KakaoTalk opens with a pre-filled message containing the service name, a short description, a thumbnail image, and a link to the service homepage. The user selects a friend and sends the message.

**Why this priority**: This is the core feature — sharing the service itself so friends can discover and join. Without this, the feature has no value. It also requires no authentication from the recipient.

**Independent Test**: Can be fully tested by tapping the share button, verifying the KakaoTalk share sheet appears with correct service info, and confirming the shared link opens the service homepage.

**Acceptance Scenarios**:

1. **Given** a logged-in user is anywhere in the app, **When** they tap the "Share via KakaoTalk" button, **Then** the KakaoTalk share dialog opens with the service name, description, thumbnail, and link pre-populated.
2. **Given** the KakaoTalk share dialog is open, **When** the user selects a friend and sends, **Then** the friend receives a KakaoTalk message containing a working link to the service.
3. **Given** a non-KakaoTalk user receives the link, **When** they tap it, **Then** they are taken to the service landing page (no crash or broken link).

---

### User Story 2 - Share Own Wishlist/Profile Page (Priority: P2)

A user with a wishlist wants to share their personal restaurant list with a friend. They tap a "Share my list" button on their own profile page (the button does not appear on other users' profiles). The KakaoTalk share message includes their profile name, number of saved restaurants, and a direct link to their public profile/wishlist page.

**Why this priority**: Sharing a personal wishlist is more viral than sharing the service homepage — it gives recipients a concrete reason to visit. Builds on P1's infrastructure.

**Independent Test**: Can be tested by navigating to the user's own profile page, tapping the share button, and verifying the shared link lands on that specific user's public profile.

**Acceptance Scenarios**:

1. **Given** a logged-in user is on their own profile or wishlist page, **When** they tap the share button, **Then** the KakaoTalk dialog opens with the user's name, their restaurant count, and a direct URL to their profile.
2. **Given** a recipient clicks the shared profile link, **When** the page loads, **Then** they see the wishlist owner's saved restaurants without needing to log in.
3. **Given** a user's profile is empty (0 saved restaurants), **When** they share, **Then** the share message reflects 0 restaurants and the link still works correctly.

---

### Edge Cases

- What happens when KakaoTalk is not installed on the device (mobile) or the browser does not support the Kakao Share SDK? → Fall back to a "Copy link" option so the user can share manually.
- What happens when the user cancels the KakaoTalk share dialog without sending? → No error is shown; the user returns to the app in their previous state.
- What if the shared link points to a user profile that no longer exists (account deleted)? → Recipient sees a graceful "User not found" message rather than a crash.
- What if the user is not logged in when they try to share? → The share button is visible but tapping it redirects to the login screen; after successful login the user is returned to their previous screen.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to initiate the service share via a KakaoTalk share button in the main app header, visible on all screens.
- **FR-002**: The share message MUST include a service thumbnail image, title, and short description written in Korean, plus a valid link to the service.
- **FR-003**: The shared link MUST be accessible to recipients who do not have an account, showing a public landing or profile page.
- **FR-004**: When KakaoTalk sharing is unavailable (SDK not loaded, app not installed), the system MUST provide a fallback allowing users to copy the link to their clipboard.
- **FR-005**: Users MUST be able to share their own public profile/wishlist page via a share button that appears only on their own profile page (not on other users' profiles).
- **FR-006**: The share button MUST be visible to all users (including guests); tapping it while unauthenticated MUST redirect to the login screen instead of opening the share dialog.
- **FR-007**: The shared link MUST remain valid and functional indefinitely (no expiring tokens in the URL).

### Key Entities

- **Share Target**: What is being shared — either the service homepage URL or a user-specific profile URL. No new persistent data is created; sharing is a one-time action.
- **Share Message**: The pre-filled KakaoTalk message content: title, description, thumbnail URL, and destination link. Defined statically (for service share) or dynamically (for profile share).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can initiate and complete a KakaoTalk share in under 10 seconds from any main screen.
- **SC-002**: 100% of shared links open the correct destination page without errors for recipients.
- **SC-003**: The fallback "Copy link" mechanism works when KakaoTalk sharing is unavailable, confirmed by clipboard content matching the expected URL.
- **SC-004**: A shared profile link displays the correct user's wishlist to any recipient, including non-authenticated visitors.

## Clarifications

### Session 2026-02-22

- Q: Where should the share button be placed for P1 (service share)? → A: Main app header (visible on all screens)
- Q: What happens when a guest (non-logged-in user) taps the share button? → A: Button is visible; tapping redirects guest to login first
- Q: What language should the KakaoTalk share message content be in? → A: Korean only
- Q: Can users share other people's profiles, or only their own? → A: Own profile only

## Assumptions

- The app already has Kakao's JavaScript SDK integrated (used for OAuth and Maps), so the Share SDK can be initialized with the same app key without additional platform registration.
- "Share this service" means sharing the service's public homepage URL, not a deep link to a private page.
- Profile pages are already publicly accessible (feature 016 introduced star ratings visible on other users' profiles).
- No analytics or tracking is required for share events in this iteration.
- The share thumbnail and description copy will be provided by the product team or can use the app's existing Open Graph meta tags.
