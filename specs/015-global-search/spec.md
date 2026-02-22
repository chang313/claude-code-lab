# Feature Specification: Global Search Beyond Viewport

**Feature Branch**: `015-global-search`
**Created**: 2026-02-22
**Status**: Draft
**Input**: User description: "Improve search experience to find most relevant results even outside the current map viewport. Like Naver Map, searching for '산토리니' should show '산토리니 카페' in Gangneung-si even if the map is not showing that area."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Search Finds Distant Places by Name (Priority: P1)

A user is browsing the map in Seoul and types "산토리니" in the search bar. Even though there is no restaurant named "산토리니" near Seoul, the app finds "산토리니 카페" in Gangneung-si and other matching places across Korea. The map automatically pans and zooms to show the found results.

**Why this priority**: This is the core problem being solved. Without this, users cannot discover restaurants by name when the restaurant is not in their current area. This is the primary use case described in the feature request.

**Independent Test**: Can be fully tested by searching for a known restaurant name that only exists in a distant city and verifying the map moves to show it.

**Acceptance Scenarios**:

1. **Given** the user is viewing Seoul on the map, **When** they search "산토리니", **Then** results include "산토리니" restaurants from any location in Korea (not just Seoul), and the map pans/zooms to fit the results.
2. **Given** the user is viewing Seoul on the map, **When** they search "해운대 횟집", **Then** results include seafood restaurants in the Haeundae area of Busan, and the map moves to Busan to show them.
3. **Given** the user searches a generic term like "치킨", **When** results exist near the user's location, **Then** nearby results are prioritized and the map stays near the user's current area.

---

### User Story 2 - Local Results Prioritized for Generic Queries (Priority: P2)

When a user searches for a common/generic food term like "치킨" or "파스타", the app still prioritizes nearby results first (existing behavior). The global search expansion only activates when local results are insufficient or when the query appears to target a specific named place.

**Why this priority**: Preserving the existing good behavior for generic searches prevents regression. Users searching "치킨" expect to see nearby chicken restaurants, not ones across the country.

**Independent Test**: Search "치킨" while viewing a populated area and verify results are near the user, not scattered nationwide.

**Acceptance Scenarios**:

1. **Given** the user is in Seoul and searches "치킨", **When** many chicken restaurants exist nearby, **Then** results are shown near the user's location and the map does not jump to a distant city.
2. **Given** the user is in a remote area and searches "스타벅스", **When** no Starbucks exists within the local area, **Then** the app expands the search to find the nearest Starbucks locations and moves the map accordingly.

---

### User Story 3 - "Search This Area" Still Works for Viewport Search (Priority: P2)

After the initial global search moves the map to a new location, the user can pan/zoom the map and use "Search This Area" to search within the new viewport. The viewport-bounded search behavior remains unchanged.

**Why this priority**: This preserves existing functionality and ensures the two search modes (global initial search vs. viewport re-search) work together seamlessly.

**Independent Test**: Perform a global search, let the map move, then pan slightly and verify "Search This Area" works within the new viewport.

**Acceptance Scenarios**:

1. **Given** the user searched "산토리니" and the map moved to Gangneung, **When** the user pans the map slightly, **Then** the "Search This Area" button appears and searches within the Gangneung viewport.

---

### Edge Cases

- What happens when a search query returns zero results both locally and globally? The app should display a "No results found" message.
- What happens when the search term is ambiguous (e.g., a restaurant name that exists in multiple cities)? Show all matching results and let the map fit all of them.
- What happens when the user has no location permissions? Global search should still work since it does not depend on user location.
- What happens when a global search returns results spread across the entire country? The map should zoom out enough to show all results, but cap the zoom-out level to keep results readable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST search for places across all of Korea when the initial search query is entered, not limited to the current viewport or a fixed radius around the user.
- **FR-002**: System MUST automatically pan and zoom the map to fit all results returned by a global search.
- **FR-003**: System MUST prioritize local/nearby results when the search query is generic (common food terms) and local results exist.
- **FR-004**: System MUST fall back to a broader geographic search when few or no results are found within the local area.
- **FR-005**: System MUST preserve the existing "Search This Area" viewport-bounded search behavior after the map has been repositioned by a global search.
- **FR-006**: System MUST maintain the existing semantic expansion behavior (e.g., "chicken" finding "KFC", "BBQ치킨", etc.) for both local and global searches.
- **FR-007**: System MUST cap the total number of displayed results at 300, consistent with existing behavior.
- **FR-008**: System MUST display distance information relative to the user's current position for all results, even for distant ones.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users searching for a specific restaurant name that exists only in a distant city see it in results 100% of the time (previously 0% when outside local radius).
- **SC-002**: Users searching for common/generic food terms still see local results first, with no perceived change in behavior from the current experience.
- **SC-003**: The map correctly repositions to show all results within 1 second of search completion.
- **SC-004**: The existing "Search This Area" flow continues to work identically after a global search moves the map.
- **SC-005**: Search results load within 2 seconds for both local and global queries.

## Assumptions

- The Kakao Local API keyword search endpoint supports searching without geographic bounds (no `rect` or `radius` parameter), returning results ranked by relevance nationwide. This is verified by Kakao API documentation.
- Generic vs. specific query detection can use a simple heuristic: if local search returns sufficient results (e.g., 5+), treat it as generic and keep local results. If local search returns few/no results, expand to global.
- The 300-result cap is sufficient for global searches since the Kakao API already returns relevance-ranked results.
- The existing `fitBounds` logic in `MapView` can handle results spread across a wide geographic area.
