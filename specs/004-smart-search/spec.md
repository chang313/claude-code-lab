# Feature Specification: Smart Search

**Feature Branch**: `004-smart-search`
**Created**: 2026-02-17
**Status**: Draft
**Input**: User description: "Improve search functionality. Currently it shows only keyword included results. But I want to see all relevant results. For example, if I enter 'chicken' as search keyword, then I want to see 'KFC' even it doesn't include 'chicken' keyword, but it's chicken related restaurant. Also, sort the result from nearest ones from current user location."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Semantic Search Results (Priority: P1)

A user searches for a food category like "chicken" and sees all relevant restaurants — not just those with "chicken" in their name. Results include well-known chains (e.g., KFC, Popeyes, BBQ) and local restaurants that serve chicken dishes, even when the restaurant name doesn't contain the search keyword. The system intelligently expands the user's query to capture related restaurant names, food types, and brand names.

**Why this priority**: This is the core value of the feature. Without semantic expansion, the search only returns exact keyword matches, causing users to miss relevant options and reducing trust in the search.

**Independent Test**: Can be fully tested by searching "chicken" and verifying that results include restaurants like "KFC" or "BBQ치킨" that don't contain the word "chicken" in their name. Delivers immediate discovery value.

**Acceptance Scenarios**:

1. **Given** a user on the search page, **When** they search for "chicken", **Then** the results include restaurants whose names don't literally contain "chicken" but are chicken-related (e.g., "KFC", "BBQ", "교촌치킨")
2. **Given** a user on the search page, **When** they search for "피자" (pizza), **Then** the results include "Pizza Hut", "도미노피자", and similar pizza restaurants regardless of exact name match
3. **Given** a user on the search page, **When** they search for "커피" (coffee), **Then** the results include "Starbucks", "이디야", "투썸플레이스" and other coffee chain brands
4. **Given** a user on the search page, **When** they search for a highly specific or uncommon term with no semantic associations, **Then** the system gracefully falls back to standard keyword search results

---

### User Story 2 - Distance-Sorted Results (Priority: P1)

A user sees search results sorted by proximity to their current location, with the nearest restaurants listed first. Each result displays the distance from the user, making it easy to find nearby options. The map also reflects this by showing the user's location alongside restaurant markers.

**Why this priority**: Distance-based sorting is equally critical to semantic search. Users searching for food want the nearest relevant options. Without this, a relevant result 20km away appears before a nearby one, reducing practical value.

**Independent Test**: Can be fully tested by searching any keyword and verifying that results are ordered from nearest to farthest, with distance displayed for each result. Delivers immediate usability value even without semantic expansion.

**Acceptance Scenarios**:

1. **Given** a user with location permissions granted, **When** they perform a search, **Then** results are sorted from nearest to farthest based on their current GPS position
2. **Given** search results are displayed, **When** the user views the result list, **Then** each restaurant card shows its distance from the user (e.g., "350m", "1.2km")
3. **Given** a user who denies location permissions, **When** they perform a search, **Then** results are displayed in the default order (no distance sorting) and no distance labels are shown
4. **Given** a user with location enabled, **When** results are shown on the map, **Then** the map auto-fits to show both the user's position and all result markers

---

### User Story 3 - Combined Semantic + Distance Experience (Priority: P2)

A user benefits from both semantic expansion and distance sorting working together. When searching "치킨" (chicken), they see all chicken-related restaurants sorted nearest-first, giving them the best combination of relevance and convenience.

**Why this priority**: This integrates P1 stories into a cohesive experience. It's a natural consequence of implementing both P1 stories but may require tuning to ensure the combined experience feels right.

**Independent Test**: Can be tested by searching a broad food term, verifying that semantically expanded results appear AND are distance-sorted. Delivers the full intended user experience.

**Acceptance Scenarios**:

1. **Given** a user with location enabled searches "chicken", **When** results appear, **Then** semantically expanded results (e.g., "KFC", "BBQ") are included AND sorted by distance from nearest to farthest
2. **Given** semantic expansion produces results from multiple search queries, **When** combined results are shown, **Then** duplicate restaurants are removed and the merged list is sorted by distance

---

### Edge Cases

- What happens when the user's location is unavailable (GPS off, permission denied)? Results display without distance sorting; a subtle prompt encourages enabling location.
- What happens when semantic expansion returns zero additional results beyond the keyword match? The user sees standard keyword results with no degradation in experience.
- What happens when the user searches with an empty or single-character query? The system requires a minimum of 2 characters before triggering search.
- What happens when semantic expansion generates many results? Results are capped at a reasonable limit (e.g., 45 results across all expanded queries) to maintain performance.
- What happens when the user moves significantly while viewing results? Distance labels and sort order reflect the position at the time of search, not real-time updates.
- What happens when two restaurants have the same distance? They maintain a stable secondary sort order (e.g., by relevance or name).
- What happens when no results exist within 5km? The system shows a "no nearby results" message and suggests the user try a different search term or broaden their area.
- What happens when some expanded queries fail (e.g., network timeout)? The system displays results from successful queries and silently ignores failures. If all queries fail, the system shows a general search error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST expand user search queries to include semantically related terms (e.g., "chicken" → related brand names, Korean equivalents, subcategory terms)
- **FR-002**: System MUST merge results from expanded queries, removing duplicate restaurants (matched by unique place identifier)
- **FR-003**: System MUST use the user's current GPS coordinates as the reference point for distance calculation when location permission is granted
- **FR-004**: System MUST sort search results by ascending distance from the user's current location
- **FR-005**: System MUST display distance from the user on each restaurant result card (formatted as meters or kilometers, e.g., "350m", "1.2km")
- **FR-006**: System MUST gracefully degrade when location is unavailable — showing results without distance sorting and without distance labels
- **FR-007**: System MUST deduplicate results when the same restaurant appears in multiple expanded queries
- **FR-008**: System MUST cap total results to prevent excessive loading times when semantic expansion generates many matches
- **FR-011**: System MUST limit search results to restaurants within approximately 5km of the user's current position when location is available
- **FR-012**: System MUST display results from successful expanded queries even if some expanded queries fail, without showing errors for the failed subset
- **FR-009**: System MUST show a loading indicator while expanded search queries are being processed
- **FR-010**: System MUST preserve existing functionality — map markers, bottom sheet, auto-fit bounds, wishlist integration — while adding smart search capabilities

### Key Entities

- **Search Query Expansion**: A mapping from a user's input term to a set of related search terms (synonyms, brand names, Korean/English equivalents, food category terms). Initial scope: 10-15 common food categories (e.g., chicken, pizza, coffee, burgers, sushi, Korean BBQ, noodles, dessert, bakery, beer/pub, Japanese, Chinese, Vietnamese, brunch). Designed to be incrementally extensible.
- **Search Result (enhanced)**: A restaurant result enriched with distance from the user, maintaining all existing fields (name, address, category, coordinates, phone)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Searching "chicken" returns at least 3 results whose names don't contain the word "chicken" (e.g., brand names, Korean equivalents)
- **SC-002**: When location is available, 100% of search results display a distance label
- **SC-003**: Search results are verifiably sorted in ascending distance order (each result's distance ≥ previous result's distance)
- **SC-004**: Combined search (semantic expansion + distance sorting) completes and displays results within 3 seconds
- **SC-005**: No duplicate restaurants appear in the result list, even when multiple expanded queries return the same place
- **SC-006**: When location permission is denied, search still functions correctly with keyword-based results (no errors or broken UI)

## Clarifications

### Session 2026-02-17

- Q: Should search results have a maximum distance limit, or show all results regardless of distance? → A: Cap at a reasonable radius (~5km) from the user's position to avoid cluttering results with unreachable restaurants.
- Q: How broad should the initial semantic expansion category coverage be? → A: Moderate (10-15 categories) covering common food types plus major chain brands for each. Additional categories can be added incrementally.
- Q: How should the system handle partial failures when some expanded queries fail? → A: Show results from successful queries, silently ignore failed ones. Users still get useful results even if one expanded query fails.

## Assumptions

- The user's device supports GPS/geolocation and the browser provides a standard geolocation API
- The external search API supports location-biased search via coordinate parameters and returns distance when coordinates are provided
- Semantic query expansion will use a predefined mapping of food categories, brand names, and synonyms (not a live AI/ML model) to keep latency low and costs zero
- Korean and English equivalents are both important for query expansion (users may search in either language)
- The existing result card UI has space to display distance information without major layout changes
