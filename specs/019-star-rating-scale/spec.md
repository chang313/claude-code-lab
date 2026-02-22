# Feature Specification: Change Star Rating Scale to 5

**Feature Branch**: `019-star-rating-scale`
**Created**: 2026-02-22
**Status**: Draft
**Input**: User description: "Change star rating max number to 5"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Rate a Visited Restaurant on 5-Star Scale (Priority: P1)

A user visits a restaurant and wants to rate it with finer granularity. Instead of choosing between 1, 2, or 3 stars, they can now select from 1 to 5 stars, allowing more nuanced feedback (e.g., distinguishing "good" from "great" from "excellent").

**Why this priority**: This is the core value of the feature — enabling a wider rating scale for more expressive ratings.

**Independent Test**: Can be fully tested by tapping each of the 5 stars on a visited restaurant card and verifying the correct number of filled stars appears.

**Acceptance Scenarios**:

1. **Given** a visited restaurant card in the my-list view, **When** the user taps the 4th star, **Then** stars 1-4 are filled yellow and star 5 is gray.
2. **Given** the star rating component in editable mode, **When** the user taps the 5th star, **Then** all 5 stars are filled yellow and the rating 5 is persisted.
3. **Given** a restaurant with an existing 3-star rating, **When** the user taps the 5th star, **Then** the rating updates to 5 and all 5 stars are filled.

---

### User Story 2 - View 5-Star Ratings on Profile Pages (Priority: P2)

When viewing another user's profile, visited restaurant cards display read-only star ratings on the updated 5-star scale.

**Why this priority**: Ensures the new scale is consistently displayed across all views, not just the owner's list.

**Independent Test**: Can be tested by navigating to a profile page with visited restaurants and verifying 5 stars render in read-only mode with the correct fill state.

**Acceptance Scenarios**:

1. **Given** a user profile page with a visited restaurant rated 4 stars, **When** the page loads, **Then** 4 of 5 stars are filled yellow and none are clickable.
2. **Given** a user profile page with a visited restaurant rated 2 stars, **When** the page loads, **Then** 2 of 5 stars are filled yellow and 3 are gray.

---

### User Story 3 - Preserve Existing Ratings During Migration (Priority: P1)

Users who previously rated restaurants on the 1-3 scale retain their existing ratings without any data loss or automatic conversion. A restaurant previously rated 3 stars remains 3 stars on the new 5-star scale.

**Why this priority**: Data integrity is critical — users must not lose or see altered ratings.

**Independent Test**: Can be tested by checking that restaurants with existing ratings 1, 2, or 3 display correctly on the 5-star scale without modification.

**Acceptance Scenarios**:

1. **Given** a restaurant previously rated 2 on the 3-star scale, **When** the user views it after the update, **Then** it shows 2 of 5 stars filled.
2. **Given** a restaurant previously rated 3 on the 3-star scale, **When** the user views it after the update, **Then** it shows 3 of 5 stars filled (not 5).

---

### Edge Cases

- What happens when a user has a restaurant rated 3 (the old maximum)? It remains 3 — no automatic rescaling.
- What happens when sorting visited restaurants by rating? Sorting continues to work by descending star rating value (5 is highest, 1 is lowest).
- What happens to wishlist items (null rating)? No change — null continues to indicate wishlist status.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display 5 stars (instead of 3) in all star rating components across the application.
- **FR-002**: System MUST accept rating values from 1 to 5 for visited restaurants.
- **FR-003**: System MUST persist the selected rating (1-5) when a user rates a restaurant.
- **FR-004**: System MUST preserve existing ratings (1, 2, or 3) without modification — no automatic rescaling to the new scale.
- **FR-005**: System MUST continue to use null star rating to distinguish wishlist items from visited items.
- **FR-006**: System MUST display star ratings in read-only mode on other users' profile pages using the 5-star scale.
- **FR-007**: System MUST sort visited restaurants by star rating in descending order (5 highest, 1 lowest).

### Key Entities

- **Restaurant**: Existing entity. The `starRating` field changes from accepting values 1-3 to accepting values 1-5. Null continues to represent wishlist status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All star rating displays across the application show exactly 5 stars.
- **SC-002**: Users can select any rating from 1 to 5 and see their selection persisted immediately.
- **SC-003**: All previously saved ratings (1, 2, 3) display correctly without modification on the new 5-star scale.
- **SC-004**: All existing tests pass after updating to reflect the 5-star scale.

## Assumptions

- No database migration is required — the existing integer column already supports values 1-5; only the application-layer type constraints need updating.
- Existing ratings are not rescaled (e.g., a "3 out of 3" does NOT become "5 out of 5"). Users can manually update their old ratings if desired.
- The visual design (yellow filled / gray empty stars, size variants) remains unchanged — only the count of stars increases from 3 to 5.
- Default rating when adding a restaurant as visited remains 1 (the lowest rating).

## Scope

### In Scope
- Updating all type definitions from `1 | 2 | 3` to `1 | 2 | 3 | 4 | 5`
- Updating star rendering to display 5 stars instead of 3
- Updating all tests to reflect the 5-star scale

### Out of Scope
- Data migration or rescaling of existing ratings
- Half-star or fractional ratings
- Changing the visual design of stars (colors, sizes, icons)
- Adding new rating-related features (averages, aggregations, etc.)
