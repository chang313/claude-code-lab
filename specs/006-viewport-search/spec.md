# Feature Specification: Viewport-Based Search Results

**Feature Branch**: `006-viewport-search`
**Created**: 2026-02-18
**Status**: Draft
**Input**: User description: "Remove the limit of search result. Show all restaurants in current viewport of the map."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See All Results in Map Viewport (Priority: P1)

A user searches for "chicken" and the map shows results. Currently, the results are capped at 45 and limited to a fixed 5km radius from the user's location. The user wants to see **all matching restaurants** that are visible within the current map viewport — not just the first 45. When the user pans or zooms the map, the results should update to reflect what's visible on the screen.

**Why this priority**: This is the core ask — removing the artificial result cap and tying results to the visible map area. Without this, the feature has no value.

**Independent Test**: Can be fully tested by searching any food keyword, then panning/zooming the map and verifying that markers appear for all matching restaurants within the visible area.

**Acceptance Scenarios**:

1. **Given** a user submits a search for "pizza", **When** the initial results load, **Then** the map auto-fits to show all results and no "Search this area" button is visible.
2. **Given** initial search results are displayed, **When** the user pans or zooms the map away from the result area, **Then** a "Search this area" button appears on the map.
3. **Given** the "Search this area" button is visible, **When** the user taps it, **Then** the system fetches all matching restaurants within the current viewport and replaces the previous results.
4. **Given** the user has not moved the map since the last search, **When** viewing results, **Then** no "Search this area" button is shown.

---

### User Story 2 - Bottom Sheet Reflects Viewport Results (Priority: P2)

The scrollable bottom sheet list should stay in sync with the markers visible on the map. As the user pans or zooms, the bottom sheet updates to show only the restaurants currently on the map.

**Why this priority**: The bottom sheet is the primary way users browse details (name, address, distance). If it's out of sync with the map, the experience is confusing.

**Independent Test**: Can be tested by searching, then panning the map and verifying the bottom sheet list matches the visible markers.

**Acceptance Scenarios**:

1. **Given** a user taps "Search this area" after panning, **When** new results load, **Then** the bottom sheet list updates to show only restaurants from the new viewport search.
2. **Given** a user clicks a marker on the map, **When** the detail card appears, **Then** the detail card shows accurate distance and information for the selected restaurant.

---

### User Story 3 - Loading Feedback During Viewport Changes (Priority: P3)

When the user pans or zooms the map and new results are being fetched, the system should provide visual feedback that loading is in progress, without blocking map interaction.

**Why this priority**: Without loading feedback, users may think the app is broken or that there are no results in the new area.

**Independent Test**: Can be tested by panning the map quickly and verifying a loading indicator appears while new results are fetched.

**Acceptance Scenarios**:

1. **Given** a user pans the map to a new area, **When** new results are being fetched, **Then** a non-blocking loading indicator is visible.
2. **Given** results are loading for a new viewport, **When** the user continues to pan or zoom, **Then** the map remains interactive and the loading does not block user interaction.
3. **Given** a viewport search returns no results, **When** loading completes, **Then** the user sees an appropriate empty-state message.

---

### Edge Cases

- What happens when the user zooms out to cover a very large area (e.g., all of Seoul)? The system should impose a reasonable upper bound on total results to prevent performance degradation, and inform the user if the area is too large to show all results.
- What happens when the user pans rapidly? The "Search this area" button appears once the map settles; no automatic API calls are made during panning.
- What happens when the external search service returns paginated results? The system should fetch all available pages within the viewport bounds.
- What happens when the user has no active search query and just pans the map? No viewport-based fetching should occur — a search query must be active.
- What happens when the user's device has a slow connection? Loading indicators should remain visible until all results are loaded, and partial results should be displayed as they arrive.
- What happens when the search service fails after tapping "Search this area"? Previous results remain visible with an error toast; "Search this area" button stays available for retry.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST fetch and display all matching restaurants within the current map viewport when the user has an active search query, removing the current 45-result hard cap.
- **FR-002**: System MUST display a "Search this area" button when the user pans or zooms the map away from the current result area while a search query is active. Tapping the button triggers a new search within the current viewport.
- **FR-003**: System MUST hide the "Search this area" button when the viewport has not changed since the last search, or when no search query is active.
- **FR-004**: System MUST fetch all available pages of results from the search service to ensure completeness within the viewport.
- **FR-005**: System MUST keep the bottom sheet result list in sync with the currently visible map markers.
- **FR-006**: System MUST display a non-blocking loading indicator while fetching results for a new viewport area.
- **FR-007**: System MUST deduplicate results across multiple fetches and expanded search terms (same behavior as current deduplication logic).
- **FR-008**: System MUST preserve the existing semantic search expansion (e.g., "chicken" finds KFC, BBQ, etc.) when searching within the viewport.
- **FR-009**: System MUST impose a maximum of 300 results per viewport search to protect against performance issues when viewing very large areas.
- **FR-010**: System MUST show an empty-state message when no results are found in the current viewport area.
- **FR-011**: System MUST NOT trigger viewport-based fetching when no search query is active.
- **FR-012**: System MUST sort viewport results by distance from the user's current location (nearest first) when location is available.
- **FR-013**: When a viewport search fails (network error, service unavailable, rate limit), the system MUST keep the previous results visible on the map and bottom sheet, and display a brief, dismissible error toast to inform the user. The "Search this area" button MUST remain available for retry.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users see all matching restaurants within the visible map area, not limited to an arbitrary count (validated by searching in a dense area and confirming markers match expectations).
- **SC-002**: When the user taps "Search this area", new results appear within 2 seconds.
- **SC-003**: The bottom sheet list always matches the markers visible on the map (zero desync after viewport changes).
- **SC-004**: No API calls are triggered by map panning or zooming alone — only by the user tapping "Search this area".
- **SC-005**: The map remains interactive and responsive while results are loading (no UI freeze or blocking).
- **SC-006**: Existing search features (semantic expansion, distance sorting, wishlist status) continue to work correctly with viewport-based results.

## Clarifications

### Session 2026-02-18

- Q: Should viewport updates auto-refresh or use a "Search this area" button? → A: "Search this area" button — user explicitly triggers re-search after panning/zooming.
- Q: Should the initial search auto-fit to results or search within the current viewport? → A: Auto-fit first — initial search preserves current auto-fit behavior; "Search this area" activates only for subsequent viewport changes.
- Q: What should happen when the search service fails after tapping "Search this area"? → A: Keep previous results visible and show a brief error toast. User can retry via the button.
- Q: What should the maximum result display cap be? → A: 300 results per viewport search.

## Assumptions

- The external search service supports bounding-box or coordinate-based queries with pagination, allowing viewport-based fetching.
- The current semantic expansion dictionary (12 food categories) remains unchanged for this feature.
- The user's geolocation behavior remains the same (optional, browser-based).
- The initial search still triggers from the search bar and auto-fits the map to show all results (current behavior preserved). The "Search this area" button only appears after the user manually pans or zooms away from the initial result area.
- Performance is acceptable for up to 300 results displayed simultaneously on the map.
