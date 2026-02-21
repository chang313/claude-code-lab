# Feature Specification: Visited & Wishlist Split

**Feature Branch**: `014-visited-wishlist`
**Created**: 2026-02-21
**Status**: Draft
**Input**: User description: "Split restaurant list into two groups — visited (맛집 리스트) with 1-3 star ratings, and wishlist (위시 리스트) without stars."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add a Restaurant to Wishlist (Priority: P1)

A user discovers a restaurant they want to try later. They add it to their list, and it appears under "위시 리스트" (wish list) by default — no star rating required.

**Why this priority**: The wishlist is the entry point for all restaurants. Every restaurant starts as a wish before it can become a visited place. This is the foundational flow.

**Independent Test**: Can be fully tested by adding a restaurant from search results and verifying it appears in the "위시 리스트" section without any star rating.

**Acceptance Scenarios**:

1. **Given** a user is on the search page and finds a restaurant, **When** they tap the "+" button, **Then** the restaurant is added to "위시 리스트" with no star rating.
2. **Given** a user has restaurants in their wishlist, **When** they open the main (맛집) tab, **Then** they see a "위시 리스트" section showing those restaurants without star indicators.
3. **Given** a user adds a restaurant, **When** they view it in the wishlist, **Then** it shows the restaurant name, category, and address — but no stars.

---

### User Story 2 - Mark a Restaurant as Visited with Rating (Priority: P1)

A user has visited a restaurant from their wishlist. They tap the star rating area on the wishlist card to rate it, which automatically promotes it to "맛집 리스트."

**Why this priority**: This is the core lifecycle action — promoting a wish to a visited place. Equal priority with Story 1 because the two lists only make sense together.

**Independent Test**: Can be tested by having a restaurant in the wishlist, tapping the star area to rate it, and verifying it moves to "맛집 리스트" with the chosen stars.

**Acceptance Scenarios**:

1. **Given** a restaurant is in "위시 리스트," **When** the user taps the star rating area on the card, **Then** stars appear and the selected rating (1-3) is applied.
2. **Given** the user taps a star, **When** the rating is applied, **Then** the restaurant automatically moves from "위시 리스트" to "맛집 리스트" with that rating.
3. **Given** a restaurant is now in "맛집 리스트," **When** the user views it, **Then** it displays the assigned star rating (1-3 stars).

---

### User Story 3 - View Two Separate Lists on Main Tab (Priority: P1)

When a user opens the main tab (맛집), they see two clearly separated sections: "맛집 리스트" for visited restaurants and "위시 리스트" for unvisited ones.

**Why this priority**: The visual separation is what makes the feature meaningful. Without it, the two-list concept has no user-facing value.

**Independent Test**: Can be tested by having restaurants in both lists and verifying the main tab shows two distinct sections with correct labels and contents.

**Acceptance Scenarios**:

1. **Given** a user has restaurants in both lists, **When** they open the main tab, **Then** they see "맛집 리스트" section at the top and "위시 리스트" section below.
2. **Given** the "맛집 리스트" section, **When** the user views it, **Then** restaurants are grouped by subcategory (existing accordion behavior) and show star ratings.
3. **Given** the "위시 리스트" section, **When** the user views it, **Then** restaurants are grouped by subcategory but show no star ratings.
4. **Given** one list is empty, **When** the user views the main tab, **Then** the empty section shows a helpful empty state message, and the other section displays normally.

---

### User Story 4 - Change Star Rating on Visited Restaurant (Priority: P2)

A user wants to update the star rating of a visited restaurant. They can change the rating directly from the "맛집 리스트" section.

**Why this priority**: Editing ratings is important but secondary — the core flow (add → visit → rate) must work first.

**Independent Test**: Can be tested by tapping on star rating of a visited restaurant and verifying the new rating persists.

**Acceptance Scenarios**:

1. **Given** a restaurant in "맛집 리스트" with a 2-star rating, **When** the user taps the 3rd star, **Then** the rating updates to 3 stars immediately.
2. **Given** the rating was changed, **When** the user refreshes or navigates away and back, **Then** the updated rating persists.

---

### User Story 5 - Move a Visited Restaurant Back to Wishlist (Priority: P3)

A user made a mistake or wants to re-classify a visited restaurant. They can move it back to "위시 리스트," which removes its star rating.

**Why this priority**: This is an undo/correction flow, not part of the primary journey.

**Independent Test**: Can be tested by moving a visited restaurant back to wishlist and verifying it loses its star rating and appears in the wishlist section.

**Acceptance Scenarios**:

1. **Given** a restaurant in "맛집 리스트," **When** the user chooses to move it back to wishlist, **Then** it moves to "위시 리스트" and its star rating is removed.
2. **Given** the restaurant was moved back, **When** the user later marks it as visited again, **Then** they are prompted for a new star rating.

---

### User Story 6 - Add Restaurant Directly as Visited (Priority: P3)

A user finds a restaurant on the search page that they have already visited. They tap the star icon (adjacent to the "+" button) to add it directly to "맛집 리스트" with a rating.

**Why this priority**: Convenience shortcut — the primary flow (add to wishlist first) covers the main use case.

**Independent Test**: Can be tested by adding a restaurant from search via the star icon and verifying it appears directly in "맛집 리스트."

**Acceptance Scenarios**:

1. **Given** a user finds a restaurant in search, **When** they tap the star icon (adjacent to the "+" button), **Then** a rating picker (1-3 stars) appears.
2. **Given** the user selects a rating from the picker, **When** the restaurant is saved, **Then** it appears directly in "맛집 리스트" with the selected rating.

---

### Edge Cases

- What happens when a user removes a restaurant from either list? It should be fully deleted, not moved between lists.
- What happens to existing restaurants (currently all have star ratings 1-3)? They should be migrated to "맛집 리스트" (visited) since they already have ratings, preserving all existing data.
- What happens when a user receives a restaurant recommendation? The recommended restaurant should be added to "위시 리스트" by default when accepted.
- What happens if both lists are empty? Show a single combined empty state encouraging the user to search for restaurants.
- How does a search result indicate a restaurant already saved? Distinct indicators: ♡ for wishlisted, ★ for visited.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support two restaurant list types: "맛집 리스트" (visited, with star rating 1-3) and "위시 리스트" (wishlist, no star rating).
- **FR-002**: When a user taps the "+" button on a search result, the system MUST add it to "위시 리스트" without a star rating. An adjacent star icon MUST provide an alternative path to add directly as visited (see FR-007).
- **FR-003**: Users MUST be able to mark a wishlist restaurant as visited by tapping the star rating area on the card. Selecting a star (1-3) automatically promotes the restaurant to "맛집 리스트."
- **FR-004**: Users MUST be able to move a visited restaurant back to "위시 리스트," which removes its star rating.
- **FR-005**: The main tab MUST display two separate sections — "맛집 리스트" at the top and "위시 리스트" below — each with its own subcategory accordion grouping.
- **FR-006**: Star ratings (1-3) MUST only be editable on restaurants in "맛집 리스트." Wishlist restaurants MUST NOT show star rating controls.
- **FR-007**: Users MUST be able to add a restaurant directly as visited by tapping the star icon (adjacent to "+") on a search result, which opens a rating picker (1-3). Selecting a rating saves the restaurant to "맛집 리스트."
- **FR-008**: Existing restaurants (from before this feature) MUST be automatically treated as visited ("맛집 리스트") since they all have star ratings.
- **FR-009**: Removing a restaurant from either list MUST delete it entirely (not move it to the other list).
- **FR-010**: Restaurant recommendations (feature 011) MUST add accepted restaurants to "위시 리스트" by default.
- **FR-011**: Search results MUST show distinct saved indicators: ♡ for restaurants in "위시 리스트" and ★ for restaurants in "맛집 리스트." Unsaved restaurants show no indicator.

### Key Entities

- **Restaurant**: Gains a new attribute indicating whether it is "visited" or "wishlisted." Visited restaurants have a star rating (1-3); wishlisted restaurants have no rating.
- **List Type**: Two states — visited ("맛집 리스트") and wishlisted ("위시 리스트"). A restaurant belongs to exactly one list at any time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add a restaurant to their wishlist in under 2 taps from search results.
- **SC-002**: Users can promote a wishlist restaurant to visited (with star rating) in under 3 taps.
- **SC-003**: The main tab clearly separates two lists with distinct section headers visible without scrolling.
- **SC-004**: All existing user data (restaurants with ratings) remains intact and accessible in "맛집 리스트" after the update.
- **SC-005**: Moving between lists (wishlist ↔ visited) takes under 2 seconds to reflect in the UI.

## Clarifications

### Session 2026-02-21

- Q: How does the user trigger "mark as visited" on a wishlist card? → A: Tapping the star rating area on the card auto-promotes it. Stars appear on tap, and selecting a rating (1-3) moves the restaurant to "맛집 리스트."
- Q: How does the search UI present "add to wishlist" vs "add as visited"? → A: Single "+" button defaults to wishlist; an adjacent star icon opens a rating picker to add directly as visited.
- Q: Should search saved indicators differentiate between wishlist and visited? → A: Yes. Distinct indicators: ♡ for wishlisted, ★ for visited. Unsaved restaurants show no indicator.

## Assumptions

- The bottom navigation tab label "맛집" remains unchanged — the tab now contains both "맛집 리스트" and "위시 리스트" sections.
- "맛집 리스트" is displayed above "위시 리스트" on the main tab, as visited/rated restaurants represent higher-value content.
- Subcategory accordion grouping (existing behavior) applies to both sections independently.
- The restaurant count in each section header is useful context for users (e.g., "맛집 리스트 (12)" and "위시 리스트 (5)").
- Public profile views (feature 007) will also reflect the two-list separation when viewing another user's restaurants.
