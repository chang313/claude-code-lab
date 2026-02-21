# Feature Specification: Search Add & Sort

**Feature Branch**: `013-search-add-sort`
**Created**: 2026-02-21
**Status**: Draft
**Input**: User description: "I need to improve search experience. When I search restaurant and get results in map, then I want to add restaurants in map to my list. Also, I want sort search results to show most relevant restaurants first."

## Clarifications

### Session 2026-02-21

- Q: Should the sort be a user-toggleable control (relevance vs distance) or simply always sort by relevance? → A: Always sort by relevance only. No sort toggle UI needed.
- Q: Should viewport search ("Search this area") also use relevance sort instead of distance? → A: Yes. Viewport defines the search area; results within that area are sorted by relevance.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add Restaurant from Map Marker (Priority: P1)

A user searches for restaurants and sees results displayed as markers on the map. The user taps a marker to see restaurant details, and from that detail view, they can add the restaurant directly to their wishlist without scrolling through the bottom sheet list.

**Why this priority**: This is the core interaction improvement — users naturally interact with the map first and expect to take action directly from marker interactions. Currently, they must find the same restaurant in the bottom sheet list, which is friction-heavy when there are many results.

**Independent Test**: Can be fully tested by searching for a restaurant, tapping a map marker, and verifying the "add to wishlist" action is available and functional from the marker detail card.

**Acceptance Scenarios**:

1. **Given** a user has searched for restaurants and results are displayed on the map, **When** the user taps a map marker, **Then** a detail card appears showing the restaurant name, category, address, and an "add to wishlist" button.
2. **Given** a user is viewing a marker detail card for a restaurant not yet in their wishlist, **When** the user taps the "add to wishlist" button, **Then** the restaurant is saved to their wishlist and the button changes to indicate it has been saved.
3. **Given** a user is viewing a marker detail card for a restaurant already in their wishlist, **When** the detail card appears, **Then** the button shows a "saved" state and the user cannot add a duplicate.
4. **Given** a user adds a restaurant from a marker detail card, **When** they navigate to their wishlist, **Then** the newly added restaurant appears in the appropriate category.

---

### User Story 2 - Sort Search Results by Relevance (Priority: P2)

Search results are always sorted by relevance (best match to the search query) so that the most meaningful results appear first in the bottom sheet list. This replaces the current distance-based default sort. Distance labels remain visible on each result for context.

**Why this priority**: Relevance-first sorting ensures users see the best matches to their query at the top, which is more useful than proximity when searching for a specific type of restaurant. Distance information is still shown as a secondary data point.

**Independent Test**: Can be fully tested by searching for a term and verifying results are ordered by relevance (best match first) rather than by distance.

**Acceptance Scenarios**:

1. **Given** a user searches for restaurants via the search bar, **When** results are displayed in the bottom sheet, **Then** results are sorted by relevance (best match to the query) with the most relevant results first.
2. **Given** a user pans/zooms the map and taps "Search this area", **When** viewport search results are displayed, **Then** results within the visible area are also sorted by relevance, not by distance.
3. **Given** results are sorted by relevance (from either search method), **When** the user views the list, **Then** each result still displays its distance from the user's current location (when location is available) as supplementary information.

---

### User Story 3 - Star Rating on Add (Priority: P3)

When a user adds a restaurant to their wishlist from the map marker detail card, they can optionally set a star rating (1-3 stars) at the time of adding, rather than having to edit the rating later.

**Why this priority**: This is a convenience enhancement that reduces friction in the rating workflow but is not essential for the core add-from-map or sort features.

**Independent Test**: Can be fully tested by tapping a marker, choosing a star rating on the detail card, adding the restaurant, and verifying the correct rating is saved.

**Acceptance Scenarios**:

1. **Given** a user is viewing a marker detail card with the add button, **When** the card is displayed, **Then** a star rating selector (1-3 stars) is visible with a default of 1 star.
2. **Given** the user selects 3 stars and taps "add to wishlist", **When** the restaurant is saved, **Then** it appears in the wishlist with a 3-star rating.

---

### Edge Cases

- What happens when a user taps a marker while the bottom sheet is fully expanded? The bottom sheet should collapse to peek height to reveal the marker detail card.
- What happens when search results exceed the display limit (300)? Relevance sort should still function correctly on the full loaded result set.
- What happens when a network error occurs while adding a restaurant from the marker detail card? The user should see an error message and the button should revert to its original state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display an actionable detail card when a user taps a map marker, showing restaurant name, category, address, and distance (when available).
- **FR-002**: The detail card MUST include an "add to wishlist" button that saves the restaurant to the user's wishlist.
- **FR-003**: The detail card MUST show a "saved" indicator for restaurants already in the user's wishlist, preventing duplicate additions.
- **FR-004**: Search results in the bottom sheet MUST always be sorted by relevance (best match to the query), with the most relevant results first. This applies to both keyword searches and viewport searches ("Search this area").
- **FR-005**: Each search result MUST display the distance from the user's current location when location is available, as supplementary information alongside relevance-sorted results.
- **FR-006**: The detail card MUST include a star rating selector (1-3 stars, default 1) for setting the rating at the time of adding.
- **FR-007**: When a restaurant is added from the marker detail card, the corresponding marker on the map MUST update to show the "saved" indicator.

### Key Entities

- **Search Result**: A restaurant returned from the search query, containing name, category, address, coordinates, and relevance ranking. Transient — exists only during the search session.
- **Wishlist Item**: A restaurant saved by the user with a star rating. Persisted in the user's cloud-synced data store.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add a restaurant to their wishlist within 2 taps from seeing it on the map (tap marker, tap add).
- **SC-002**: 100% of wishlisted restaurants display the "saved" indicator on both the map marker and the marker detail card.
- **SC-003**: Search results are ordered by relevance, with the best matches appearing in the top 5 results for a given query.
- **SC-004**: Users with location access see distance labels on all search results regardless of sort order.
- **SC-005**: The add-from-marker flow has the same reliability as the existing add-from-list flow (no new error modes introduced).

## Assumptions

- The existing marker detail card (floating above the bottom sheet on marker click) will be enhanced rather than replaced.
- Star rating options remain 1-3 stars, consistent with the existing wishlist rating system.
- "Relevance" sort corresponds to the search provider's default ranking (accuracy/best match).
- Distance labels are informational only and do not affect result ordering.
- The existing "saved" badge on markers already indicates wishlisted status; this feature extends that to the detail card interaction.

## Out of Scope

- Sort toggle UI or user-selectable sort options.
- Filtering search results by category, rating, or other attributes (separate feature).
- Multi-select and batch-add from map markers.
- Editing or removing restaurants from the wishlist via the map view.
