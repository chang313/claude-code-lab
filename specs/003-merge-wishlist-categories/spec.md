# Feature Specification: Merge Wishlist & Category View

**Feature Branch**: `003-merge-wishlist-categories`
**Created**: 2026-02-16
**Status**: Draft
**Input**: User description: "Integrate 'WishList' and 'By Menu' tabs into one. User doesn't need to manually add 'menu'. Instead it categorizes restaurant by its subcategory (the last subcategory of the restaurant that kakao api provides)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Wishlist Grouped by Subcategory (Priority: P1)

A user opens the Wishlist tab and sees their saved restaurants automatically organized by food subcategory (e.g., "냉면", "돈까스", "초밥"). Each category group shows its restaurants sorted by star rating (highest first), and the groups themselves are listed alphabetically. The user can browse all their restaurants at a glance, understanding what types of food they have saved without any manual categorization effort.

**Why this priority**: This is the core feature — replacing two separate tabs with one unified, auto-categorized view. Without this, the feature has no value.

**Independent Test**: Can be fully tested by adding several restaurants with different subcategories to the wishlist and verifying they appear grouped correctly.

**Acceptance Scenarios**:

1. **Given** a user has 5 saved restaurants across 3 different subcategories, **When** they open the Wishlist tab, **Then** they see 3 category groups, each containing the correct restaurants.
2. **Given** a user has restaurants with subcategories "냉면", "초밥", and "돈까스", **When** they view the wishlist, **Then** the groups are displayed in alphabetical order ("냉면", "돈까스", "초밥").
3. **Given** a category group has multiple restaurants, **When** the user views that group, **Then** restaurants within the group are sorted by star rating (highest first), then by most recently added.
4. **Given** a user has no saved restaurants, **When** they open the Wishlist tab, **Then** they see an empty state message encouraging them to search or browse the map.

---

### User Story 2 - Automatic Subcategory Extraction on Save (Priority: P1)

When a user adds a restaurant to their wishlist from search or map, the system automatically extracts the food subcategory from the restaurant's full category string (e.g., "음식점 > 한식 > 냉면" becomes "냉면"). The user does not need to manually tag or categorize the restaurant. This subcategory is stored with the restaurant and used for grouping.

**Why this priority**: Equally critical as Story 1 — without automatic categorization, the grouped view cannot function.

**Independent Test**: Can be tested by adding a restaurant from search and verifying its subcategory is correctly extracted and stored.

**Acceptance Scenarios**:

1. **Given** a restaurant has the category "음식점 > 한식 > 냉면", **When** the user adds it to their wishlist, **Then** the system stores "냉면" as its subcategory.
2. **Given** a restaurant has the category "음식점 > 일식 > 초밥,롤", **When** the user adds it, **Then** the system stores "초밥,롤" as its subcategory.
3. **Given** a restaurant has the category "음식점 > 한식" (only two levels, no specific subcategory), **When** the user adds it, **Then** the system stores "한식" as its subcategory (last available segment).

---

### User Story 3 - Remove Manual Menu Item Management (Priority: P2)

The manual menu item feature (adding/removing individual menu items per restaurant) and the "By Menu" tab are removed entirely. The restaurant detail page no longer shows the menu item input form. Navigation is simplified from 5 bottom tabs to 4: Wishlist, Search, Map, My.

**Why this priority**: Cleanup task that simplifies the UI. Depends on Stories 1 & 2 replacing the "By Menu" functionality.

**Independent Test**: Can be tested by verifying the "By Menu" tab no longer appears, the restaurant detail page has no menu item section, and the bottom navigation shows exactly 4 tabs.

**Acceptance Scenarios**:

1. **Given** the updated app, **When** the user views the bottom navigation, **Then** they see exactly 4 tabs: Wishlist, Search, Map, My.
2. **Given** the updated app, **When** the user opens a restaurant detail page, **Then** there is no menu item input form or menu item list.

---

### Edge Cases

- What happens when a restaurant's category string has no ">" separator (e.g., just "음식점")? The system uses the full category string as the subcategory.
- What happens when two restaurants share the same subcategory but different parent categories (e.g., "음식점 > 한식 > 냉면" and "음식점 > 분식 > 냉면")? They are grouped together under the same "냉면" subcategory since the grouping is by the last segment only.
- What happens when a restaurant's category string is empty or missing? The system assigns it to a default group labeled "기타" (Other).
- What happens to existing menu_items data after migration? Existing menu items data becomes unused. The menu_items table can be retained but is no longer referenced by the application.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST automatically extract the subcategory from each restaurant's category string by taking the last segment after the final ">" separator, trimmed of whitespace.
- **FR-002**: System MUST store the extracted subcategory with each restaurant when it is added to the wishlist.
- **FR-003**: The Wishlist view MUST display restaurants grouped by their subcategory.
- **FR-004**: Category groups MUST be sorted alphabetically by subcategory name.
- **FR-005**: Restaurants within each category group MUST be sorted by star rating (descending), then by creation date (most recent first).
- **FR-006**: System MUST handle restaurants with only a top-level category (no ">" separator) by using the entire category string as the subcategory.
- **FR-007**: System MUST assign restaurants with empty or missing category strings to a default "기타" group.
- **FR-008**: The "By Menu" tab MUST be removed from the bottom navigation.
- **FR-009**: The manual menu item management (add/remove menu items) MUST be removed from the restaurant detail page.
- **FR-010**: The bottom navigation MUST show exactly 4 tabs: Wishlist, Search, Map, My.
- **FR-011**: Each category group header MUST display the subcategory name and the count of restaurants in that group.
- **FR-012**: Users MUST still be able to tap a restaurant card to navigate to its detail page.
- **FR-013**: Users MUST still be able to change star ratings and remove restaurants from the wishlist.

### Key Entities

- **Restaurant**: A wishlisted restaurant. Now includes a subcategory field derived from the Kakao category string. Key attributes: name, address, subcategory, star rating, creation date.
- **Subcategory Group**: A logical grouping of restaurants sharing the same subcategory. Displayed as a collapsible accordion in the Wishlist view; each group header toggles open/closed, and all groups start expanded by default. Key attributes: subcategory name, restaurant count.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users see their wishlist organized by food subcategory within 1 second of opening the Wishlist tab.
- **SC-002**: 100% of newly added restaurants are automatically categorized without any manual user input.
- **SC-003**: Navigation is reduced from 5 tabs to 4 tabs, simplifying the user experience.
- **SC-004**: Users can find a specific type of restaurant (e.g., all their saved ramen places) by scanning category group headers, without scrolling through an unsorted list.

## Clarifications

### Session 2026-02-16

- Q: Should category groups be collapsible accordions or flat section headers? → A: Collapsible accordion — each group header toggles open/closed, all start expanded by default.
- Q: How should existing restaurants get their subcategory — backfill migration or compute at query time? → A: Compute at query time from the stored category string (no DB schema changes or migration for existing data).

## Assumptions

- The Kakao API `category_name` field consistently uses " > " (space-arrow-space) as the separator between category levels.
- Most restaurants in the Kakao API have at least 2 levels of category (e.g., "음식점 > 한식"), providing a meaningful subcategory.
- Existing wishlisted restaurants that were saved before this feature will have their subcategory computed at query time from their stored `category` field (no database migration or new column needed for existing data).
- The menu_items database table is retained for data integrity but no longer referenced by the application UI or hooks.

## Scope Boundaries

### In Scope
- Merging Wishlist and By Menu tabs into one grouped view
- Automatic subcategory extraction from Kakao category strings
- Removing manual menu item management UI
- Removing the By Menu tab and related pages

### Out of Scope
- Custom user-defined categories or tags
- Filtering or searching within the wishlist by category
- Reordering or pinning category groups
- Migrating existing menu_items data to any new format
- Deleting the menu_items database table
