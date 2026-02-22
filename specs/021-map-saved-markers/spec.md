# Feature Specification: Map Saved Markers

**Feature Branch**: `021-map-saved-markers`
**Created**: 2026-02-22
**Status**: Draft
**Input**: User description: "User can see saved restaurants in kakao map. Distinguish wishlist one and favorite one visually."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Saved Restaurants on Map (Priority: P1)

As a user browsing the map, I want to see my saved restaurants displayed as markers so I can visually locate places I've bookmarked without searching for them individually.

**Why this priority**: This is the core value proposition — without markers on the map, the feature doesn't exist. Users currently have no way to see their saved restaurants spatially on the map.

**Independent Test**: Can be fully tested by opening the map view and verifying that all saved restaurants (both wishlist and visited) appear as markers at their correct locations.

**Acceptance Scenarios**:

1. **Given** the user has saved restaurants (both wishlist and visited), **When** they open the map view, **Then** markers appear at each saved restaurant's location within the current map viewport.
2. **Given** the user has no saved restaurants, **When** they open the map view, **Then** no saved markers appear and the map displays normally.
3. **Given** the user pans or zooms the map, **When** new saved restaurants come into the viewport, **Then** their markers become visible without requiring a manual refresh.

---

### User Story 2 - Visually Distinguish Wishlist vs Favorite (Priority: P1)

As a user viewing the map, I want to instantly tell which markers are wishlist items (want to visit) and which are favorites (visited and rated) so I can make quick decisions about where to go.

**Why this priority**: Equal to Story 1 because visual distinction is the explicit user request. Without it, showing all saved markers as identical icons provides minimal value over the existing search-based flow.

**Independent Test**: Can be tested by saving at least one wishlist restaurant (no rating) and one visited restaurant (with rating), then verifying that their map markers are visually distinct from each other and from regular search result markers.

**Acceptance Scenarios**:

1. **Given** the user has both wishlist and visited restaurants, **When** viewing them on the map, **Then** wishlist markers use a different color or icon than visited markers.
2. **Given** the user taps a saved marker, **When** the info window opens, **Then** it shows the restaurant name and its save status (wishlist or visited with star rating).
3. **Given** the user has a visited restaurant with a 5-star rating, **When** viewing its marker, **Then** the star rating is visible either on the marker or in its info window.

---

### User Story 3 - Toggle Saved Markers Visibility (Priority: P2)

As a user searching for new restaurants, I want to toggle saved markers on/off so they don't clutter the map when I'm focused on discovering new places.

**Why this priority**: Search results already show markers on the map. When saved markers are also shown, the map could become cluttered, especially for power users with many saved restaurants. A toggle keeps the map usable.

**Independent Test**: Can be tested by toggling the visibility control and verifying markers appear/disappear without affecting search result markers.

**Acceptance Scenarios**:

1. **Given** saved markers are visible by default on map open, **When** the user taps the toggle control, **Then** all saved markers are hidden and only search result markers remain.
2. **Given** saved markers are hidden, **When** the user taps the toggle control again, **Then** saved markers reappear in their correct positions.
3. **Given** saved markers are hidden, **When** the user performs a search, **Then** search result markers display normally without interference.

---

### Edge Cases

- What happens when a saved restaurant's location is the same as a search result? The saved marker replaces the search result marker entirely, showing save status (wishlist/visited with rating) instead of the generic search result marker.
- What happens when the user has hundreds of saved restaurants? The map should handle large marker counts without significant performance degradation. Consider clustering for dense areas.
- What happens when a saved restaurant is moved from wishlist to visited while the map is open? The marker's visual appearance should update to reflect the new status.
- What happens when the user is viewing another user's profile and then returns to the map? Only the current user's saved restaurants are shown as markers.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display markers for all saved restaurants (both wishlist and visited) within the current map viewport.
- **FR-002**: System MUST use visually distinct marker styles for wishlist restaurants (no rating) versus visited restaurants (with star rating).
- **FR-003**: System MUST show restaurant name and save status (wishlist or visited with star rating) when a saved marker is tapped.
- **FR-004**: System MUST update marker visibility dynamically as the user pans and zooms the map.
- **FR-005**: System MUST provide a toggle control for users to show or hide saved markers on the map.
- **FR-006**: When a saved restaurant appears in search results, the saved marker MUST replace the search result marker, displaying the save status instead of the generic search result style.
- **FR-007**: System MUST refresh marker states when a restaurant's status changes (e.g., wishlist to visited).
- **FR-008**: System MUST only display the current authenticated user's saved restaurants as markers.

### Key Entities

- **Saved Restaurant Marker**: A map marker representing a saved restaurant, containing its location (lat/lng), name, save type (wishlist or visited), and optional star rating (1-5). Derived from existing restaurant data.
- **Marker Style**: Visual configuration (color, icon, shape) associated with each save type. At minimum: one style for wishlist, one for visited, and a distinct style for search results.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can see all their saved restaurants on the map within 2 seconds of opening the map view.
- **SC-002**: Users can correctly identify a marker's type (wishlist vs. visited) at a glance without tapping it, achieving 95%+ accuracy in visual distinction.
- **SC-003**: Map remains responsive (smooth panning and zooming) with up to 200 saved restaurant markers visible simultaneously.
- **SC-004**: Toggling saved marker visibility takes effect within 0.5 seconds.
- **SC-005**: 90% of users can discover and use the marker toggle control on first use without instruction.

## Clarifications

### Session 2026-02-22

- Q: Should saved markers be visible by default when opening the map? → A: Visible by default — saved markers always shown on map open.
- Q: How should overlapping saved + search result markers be handled? → A: Merge — show only the saved marker (with save status), replacing the search result marker.

## Assumptions

- The existing `restaurants` table already contains `lat` and `lng` columns for all saved restaurants, so no geocoding is needed.
- The Kakao Maps SDK supports custom marker icons/images, allowing visual distinction between marker types.
- The current map viewport boundary can be obtained from the Kakao Maps SDK to filter which saved restaurants to display.
- Performance is acceptable for the typical user's saved restaurant count (under 200 items).
