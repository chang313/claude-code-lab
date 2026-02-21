# Feature Specification: Integrate Search & Map Tabs

**Feature Branch**: `002-integrate-search-tabs`
**Created**: 2026-02-16
**Status**: Draft
**Input**: User description: "Integrate 'Search' & 'Map' tabs into one. Show search results when user enters 'Enter' key or press search button. Show searched results in kakao map."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Search and View Results on Map (Priority: P1)

A logged-in user opens the "Search" tab and sees a search bar at the top with a full-screen map below it. The user types a restaurant name or keyword and presses Enter (or taps the search button). The map updates to show markers for all matching restaurants, and a draggable bottom sheet appears containing a scrollable list of results. The user can swipe the bottom sheet up to browse the list or swipe it down to focus on the map.

**Why this priority**: This is the core feature — combining keyword search with map visualization in a single, unified view. Without this, the feature has no value.

**Independent Test**: Can be fully tested by typing a keyword, pressing Enter, and verifying that both map markers and a result list appear. Delivers the primary value of seeing search results spatially.

**Acceptance Scenarios**:

1. **Given** the user is on the Search tab, **When** they type "pizza" and press Enter, **Then** the map displays markers for matching restaurants and a draggable bottom sheet with the result list slides up.
2. **Given** the user is on the Search tab, **When** they type "pizza" and tap the search button, **Then** the same search results appear on both the map and the bottom sheet (identical to pressing Enter).
3. **Given** the user is on the Search tab with no query entered, **When** they press Enter or tap the search button, **Then** no search is performed and the current view remains unchanged.

---

### User Story 2 - Interact with Map Markers from Search Results (Priority: P2)

After searching, the user taps a marker on the map. A restaurant detail card appears showing the restaurant name, address, and category. The user can add the restaurant to their wishlist directly from this card.

**Why this priority**: Marker interaction connects the visual map experience with actionable information. This is essential for usability but depends on Story 1 being functional.

**Independent Test**: Can be tested by searching for a keyword, tapping a marker, and verifying the detail card appears with correct information and a working wishlist button.

**Acceptance Scenarios**:

1. **Given** search results are displayed on the map, **When** the user taps a marker, **Then** a detail card appears showing the restaurant's name, address, and category.
2. **Given** a detail card is shown for a restaurant not yet wishlisted, **When** the user taps "Add to Wishlist", **Then** the restaurant is saved to their wishlist and the marker visually indicates it is wishlisted.
3. **Given** a detail card is shown for a restaurant already wishlisted, **When** the user views the card, **Then** the card indicates the restaurant is already in their wishlist.

---

### User Story 3 - Add to Wishlist from Result List (Priority: P3)

In the bottom sheet overlay, the user sees a scrollable list of search results. Each result card shows the restaurant name, address, and category with a button to add it to their wishlist. Tapping "Add" saves the restaurant.

**Why this priority**: The list view provides an alternative way to browse results when the map alone is insufficient (e.g., many results clustered together). This complements Story 2 but is lower priority since the map interaction already covers wishlist addition.

**Independent Test**: Can be tested by searching for a keyword, scrolling the result list, and tapping "Add" on a result card to verify it is saved to the wishlist.

**Acceptance Scenarios**:

1. **Given** search results are displayed, **When** the user scrolls the result list, **Then** all matching restaurants are shown with name, address, and category.
2. **Given** a result in the list is not wishlisted, **When** the user taps "Add to Wishlist", **Then** the restaurant is saved and the button state updates to reflect it is wishlisted.

---

### Edge Cases

- What happens when the search returns no results? The map shows no markers and the list area displays a "No restaurants found" message.
- What happens when the user searches while a previous search is still loading? The previous search is cancelled and replaced by the new one.
- What happens when the map cannot load (e.g., no internet)? A fallback message is shown in place of the map, and the result list still displays if cached results exist.
- What happens when a search result has no valid coordinates? That result appears in the list but no marker is placed on the map for it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST combine the current Search and Map tabs into a single "Search" tab.
- **FR-002**: The combined Search tab MUST display a search bar at the top and a full-screen map below it.
- **FR-003**: The system MUST trigger a search when the user presses the Enter key while the search bar is focused.
- **FR-004**: The system MUST trigger a search when the user taps the search button.
- **FR-005**: The system MUST display search results as markers on the map, positioned at each restaurant's geographic coordinates.
- **FR-006**: The system MUST display search results in a draggable bottom sheet overlay on the map. The user can swipe up to expand the list or swipe down to minimize it.
- **FR-013**: The bottom sheet MUST appear automatically when search results are returned and default to a partially expanded state (showing ~2-3 result cards).
- **FR-007**: The system MUST show a restaurant detail card when the user taps a map marker.
- **FR-008**: The system MUST allow users to add a restaurant to their wishlist from either the map detail card or the result list.
- **FR-009**: The system MUST visually distinguish wishlisted restaurants from non-wishlisted ones (in both markers and list items).
- **FR-010**: The system MUST remove the separate "Map" tab from the bottom navigation.
- **FR-011**: The system MUST center the map on the user's current location on initial load (with user permission), falling back to a default location if permission is denied.
- **FR-012**: The system MUST show a loading indicator while search results are being fetched.
- **FR-014**: The system MUST automatically adjust the map's zoom and position to fit all result markers in view after each search.
- **FR-015**: Before the first search, the system MUST show an empty map (no markers, no bottom sheet) centered on the user's location.

### Key Entities

- **Search Query**: The keyword entered by the user to find restaurants.
- **Search Result (Place)**: A restaurant returned by the search, containing name, address, category, and geographic coordinates.
- **Map Marker**: A visual indicator on the map representing a search result's location, with a visual state for wishlisted vs. non-wishlisted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can search for restaurants and see results on the map within 2 seconds of submitting a query.
- **SC-002**: The bottom navigation displays 4 tabs (Wishlist, Search, By Menu, My) instead of the previous 5.
- **SC-003**: 100% of search results with valid coordinates are displayed as markers on the map.
- **SC-004**: Users can add a restaurant to their wishlist in 2 taps or fewer from the search results (one tap to search, one tap to add).
- **SC-005**: The integrated search-map experience loads and becomes interactive within 3 seconds on a standard mobile connection.

## Clarifications

### Session 2026-02-16

- Q: How should the map and result list share vertical space on mobile? → A: Full-screen map with a draggable bottom sheet overlay for the result list (swipe up to expand, swipe down to minimize).
- Q: Should the map auto-fit to show all result markers after a search? → A: Yes, auto-fit — map zooms/pans to show all result markers after each search.
- Q: What should the user see before their first search? → A: Empty map centered on user's location; no markers, no bottom sheet until first search.

## Assumptions

- The existing search functionality (keyword-based restaurant search) will be preserved as-is; only the UI container changes.
- The existing map component (with marker support and bounds tracking) will be reused; no new map features are needed beyond displaying search result markers.
- The map will no longer auto-search by bounds (the current Map tab behavior); instead, the map only shows results from the keyword search.
- Geolocation for initial map center will be carried over from the current Map tab behavior.
- The `/map` route will be removed or redirected to `/search`.
