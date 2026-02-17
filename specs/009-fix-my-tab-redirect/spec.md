# Feature Specification: Fix My Tab Redirect

**Feature Branch**: `009-fix-my-tab-redirect`
**Created**: 2026-02-18
**Status**: Draft
**Input**: User description: "Don't redirect 'My' tab navigation to '사람' tab. When user click 'My' tab, let the user stay at the tab."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - My Tab Shows Own Profile Directly (Priority: P1)

As a logged-in user, when I tap the "MY" tab in the bottom navigation, I want to see my own profile page rendered at the `/my` route instead of being redirected to `/users/{my-id}`. This way the "MY" tab remains visually active in the navigation bar, and I stay within the "My" section of the app.

**Why this priority**: This is the core issue — the current redirect causes the "MY" tab to lose its active state because the URL changes to `/users/{id}`, which activates the "사람" tab instead. This creates a confusing navigation experience where tapping "MY" takes the user to what appears to be the "사람" (People) section.

**Independent Test**: Can be fully tested by tapping the "MY" tab and verifying the user stays on a `/my` route with their profile displayed and the "MY" tab highlighted.

**Acceptance Scenarios**:

1. **Given** a logged-in user on any page, **When** the user taps the "MY" tab, **Then** the app navigates to `/my` and displays the user's own profile information (display name, avatar, wishlist) without redirecting to `/users/{id}`.
2. **Given** a logged-in user viewing the "MY" page, **When** the user looks at the bottom navigation, **Then** the "MY" tab is visually highlighted as active (not the "사람" tab).
3. **Given** a logged-in user on the "MY" page, **When** the page finishes loading, **Then** the browser URL remains `/my` (no URL change to `/users/{id}`).

---

### User Story 2 - Unauthenticated Users Are Directed to Login (Priority: P1)

As an unauthenticated user, when I try to access the "MY" tab, I should be redirected to the login page since a profile cannot be displayed without authentication.

**Why this priority**: Auth gating is essential to prevent errors or blank states. This is existing behavior that must be preserved.

**Independent Test**: Can be tested by accessing `/my` without being logged in and verifying redirection to `/login`.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user, **When** they attempt to navigate to `/my`, **Then** they are redirected to the login page.

---

### User Story 3 - Other Users' Profiles Remain on /users/{id} (Priority: P2)

As a logged-in user browsing the "사람" (People) section, when I view another user's profile, I should still see it at `/users/{id}` under the "사람" tab. The "MY" page should only display the current user's own profile.

**Why this priority**: The separation between "my profile" and "other people's profiles" is important for clear navigation. The "사람" tab should continue to work as before for viewing other users.

**Independent Test**: Can be tested by navigating to `/users/{other-user-id}` and verifying the "사람" tab is active, not the "MY" tab.

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** they navigate to another user's profile via `/users/{id}`, **Then** the "사람" tab is highlighted as active and the profile is displayed at `/users/{id}`.
2. **Given** a logged-in user on `/users/{other-id}`, **When** they tap the "MY" tab, **Then** they are taken to `/my` showing their own profile (not the other user's).

---

### Edge Cases

- What happens if the user's profile does not exist in the database yet? The system should create/upsert the profile automatically, as it does today.
- What happens if the user navigates directly to `/my` via URL bar? Should behave identically to tapping the tab — show own profile.
- What happens if the user is on `/my` and taps the "MY" tab again? Should stay on `/my` with no reload or redirect.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `/my` route MUST display the authenticated user's own profile content (display name, avatar, wishlist) directly, without redirecting to `/users/{id}`.
- **FR-002**: The "MY" tab in the bottom navigation MUST appear as the active tab when the user is on the `/my` route.
- **FR-003**: The system MUST preserve the existing profile upsert behavior (creating a profile record if one doesn't exist) when the `/my` page loads.
- **FR-004**: The system MUST continue to redirect unauthenticated users from `/my` to `/login`.
- **FR-005**: The `/users/{id}` route MUST continue to work for viewing any user's profile, and the "사람" tab MUST be active when viewing these routes.
- **FR-006**: The system MUST NOT change the URL from `/my` to any other path when displaying the user's own profile on the "MY" tab.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Tapping the "MY" tab displays the user's profile within 1 second, with the URL remaining `/my` and the "MY" tab visually active.
- **SC-002**: 100% of "MY" tab taps result in the "MY" tab being highlighted (not the "사람" tab).
- **SC-003**: Navigating between "MY" and "사람" tabs correctly highlights the respective tab every time, with no tab state confusion.

## Assumptions

- The profile content displayed on `/my` will be identical to what is currently shown on `/users/{current-user-id}` — the same profile view component can be reused.
- The profile upsert logic (ensuring a profile record exists) will continue to run on the `/my` page to handle users with pre-existing sessions that may lack a profile record.
- No new database tables or schema changes are required — this is a front-end routing/navigation fix only.
