# Feature Specification: Restaurant Wishlist

**Feature Branch**: `001-restaurant-wishlist`
**Created**: 2026-02-15
**Status**: Draft
**Input**: User description: "Build an application that can help me save my restaurant wish-list. Restaurant can be searched with its name or found directly in map. I can add found restaurant to my wish list. I can memo the menu that I wish to eat in the restaurant and restaurants are grouped by menu. I can see list of saved restaurants for each menu."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Search and Add Restaurant (Priority: P1)

As a user, I want to search for a restaurant by name and add it to my
wishlist so that I can keep track of places I want to visit. I type a
restaurant name into the search bar, see matching results with basic
info (name, address, category), and tap "Add to Wishlist" on the one
I want to save.

**Why this priority**: This is the core action of the application.
Without the ability to find and save restaurants, no other feature
has value.

**Independent Test**: Can be fully tested by searching for a restaurant
by name, viewing results, and adding one to the wishlist. The saved
restaurant appears in the wishlist view.

**Acceptance Scenarios**:

1. **Given** I am on the search screen, **When** I type "Pizza Palace"
   into the search bar, **Then** I see a list of matching restaurants
   with name, address, and category.
2. **Given** I see search results, **When** I tap "Add to Wishlist" on
   a restaurant, **Then** it is saved to my wishlist and I see a
   confirmation.
3. **Given** I search for a restaurant, **When** no results match my
   query, **Then** I see a message indicating no restaurants were found.
4. **Given** a restaurant is already in my wishlist, **When** I find it
   in search results, **Then** it is visually marked as already saved.

---

### User Story 2 - Find Restaurant on Map (Priority: P2)

As a user, I want to browse restaurants on an interactive map so that
I can discover places near me or in a specific area. I can pan and zoom
the map, tap on restaurant markers to see details, and add them to my
wishlist directly from the map view.

**Why this priority**: Map-based discovery is a key differentiator and
the second most common way users find restaurants, but search-by-name
alone provides a functional MVP.

**Independent Test**: Can be fully tested by opening the map view,
browsing restaurant markers, tapping one to see details, and adding
it to the wishlist from the map.

**Acceptance Scenarios**:

1. **Given** I am on the map screen and location permission is granted,
   **When** the map loads, **Then** the map centers on my current GPS
   location and I see restaurant markers in the visible area.
2. **Given** I am on the map screen and location permission is denied,
   **When** the map loads, **Then** the map shows a default city-level
   view and I see restaurant markers in that area.
3. **Given** I see markers on the map, **When** I tap a marker, **Then**
   I see a popup with the restaurant name, address, and an "Add to
   Wishlist" button.
4. **Given** I tap "Add to Wishlist" from a map popup, **When** the
   restaurant is saved, **Then** the marker changes appearance to
   indicate it is wishlisted.
5. **Given** I pan or zoom the map, **When** new areas become visible,
   **Then** restaurant markers for the new area load within a
   reasonable time.

---

### User Story 3 - Add Menu Memo to Restaurant (Priority: P3)

As a user, I want to add menu items I wish to eat at a wishlisted
restaurant so that I remember what to order when I visit. I open a
restaurant from my wishlist, type a menu item name, and save it. I can
add multiple menu items to a single restaurant.

**Why this priority**: Menu memos add personal context to saved
restaurants, making the wishlist more actionable. However, the app is
useful even without this feature.

**Independent Test**: Can be fully tested by opening a wishlisted
restaurant, adding one or more menu item names, and verifying they
appear saved under that restaurant.

**Acceptance Scenarios**:

1. **Given** I open a wishlisted restaurant's detail view, **When** I
   tap "Add Menu Item", **Then** I see an input field to type a menu
   item name.
2. **Given** I type a menu item name, **When** I confirm, **Then** the
   menu item is saved under that restaurant and appears in the list.
3. **Given** a restaurant has saved menu items, **When** I view its
   detail page, **Then** I see all saved menu items listed.
4. **Given** I want to remove a menu item, **When** I delete it,
   **Then** it is removed from the restaurant's menu list.

---

### User Story 4 - Browse Restaurants Grouped by Menu (Priority: P4)

As a user, I want to see my wishlisted restaurants grouped by menu item
so that when I crave a specific dish, I can see all restaurants where I
want to eat that dish. For example, if I saved "tonkatsu" at three
different restaurants, I see all three listed under "tonkatsu."

**Why this priority**: This is the unique organizational model of the
app (grouping by menu), but it depends on restaurants and menu items
being saved first.

**Independent Test**: Can be fully tested by having multiple restaurants
with overlapping menu items, navigating to the "By Menu" view, and
verifying restaurants are correctly grouped under each menu item.

**Acceptance Scenarios**:

1. **Given** I have saved menu items across multiple restaurants,
   **When** I navigate to the "By Menu" view, **Then** I see a list of
   all unique menu item names.
2. **Given** I see menu items listed, **When** I tap on a menu item
   (e.g., "tonkatsu"), **Then** I see all restaurants where I saved
   that menu item.
3. **Given** a menu item exists under only one restaurant, **When** I
   view that menu item group, **Then** I see exactly one restaurant.
4. **Given** I remove the last menu item of a type from all restaurants,
   **When** I return to the "By Menu" view, **Then** that menu item no
   longer appears in the list.

---

### Edge Cases

- What happens when the user adds a restaurant that is already in the
  wishlist? The system MUST prevent duplicates and inform the user.
- What happens when search returns no results? The system MUST display
  a clear "no results" message with suggestion to refine the query.
- What happens when the user has no internet connection while searching
  or browsing the map? The system MUST show an offline notice and still
  allow browsing of already-saved wishlist data.
- What happens when two menu items have the same name but different
  casing (e.g., "Tonkatsu" vs "tonkatsu")? The system MUST treat them
  as the same menu item (case-insensitive grouping).
- What happens when a restaurant is removed from the wishlist? All
  associated menu items for that restaurant MUST also be removed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to search restaurants by name and
  display matching results with name, address, and category.
- **FR-002**: System MUST display an interactive map with restaurant
  markers that users can tap to view details. The map MUST center on
  the user's current GPS location when permission is granted, and
  fall back to a default city-level view when denied.
- **FR-003**: System MUST allow users to add a restaurant to their
  wishlist from search results or from the map view.
- **FR-004**: System MUST prevent duplicate restaurants in the wishlist
  and visually indicate already-saved restaurants.
- **FR-011**: System MUST allow users to assign a star rating (1, 2,
  or 3) to each wishlisted restaurant, representing how much they
  wish to visit. Default rating is 1 when adding a new restaurant.
- **FR-012**: System MUST sort the main wishlist view by star rating
  in descending order (3-star restaurants first). Restaurants with
  the same rating MUST be sorted by most recently added first.
- **FR-013**: System MUST allow users to change a restaurant's star
  rating at any time from the restaurant detail view or wishlist.
- **FR-005**: System MUST allow users to add, view, and delete menu
  item memos for each wishlisted restaurant.
- **FR-006**: System MUST provide a "By Menu" view that groups
  wishlisted restaurants by their saved menu items.
- **FR-007**: System MUST persist all wishlist data (restaurants and
  menu items) locally so data is available across sessions.
- **FR-008**: System MUST perform case-insensitive matching when
  grouping restaurants by menu item name.
- **FR-009**: System MUST remove all associated menu items when a
  restaurant is deleted from the wishlist.
- **FR-010**: System MUST allow users to browse saved wishlist data
  while offline.

### Assumptions

- This is a single-user, personal application (no multi-user accounts
  or sharing features needed).
- Restaurant search data comes from a third-party location/places
  service (e.g., a maps or places provider).
- The application is a mobile web app (responsive, runs in browser on
  any device). No native mobile build required.
- Menu items are free-text labels entered by the user, not pulled from
  restaurant menus.

### Key Entities

- **Restaurant**: A dining establishment with name, address, category,
  and geographic coordinates. Can exist in search results or in the
  user's wishlist.
- **Wishlist Entry**: A saved reference to a restaurant, including
  when it was added and a star rating (1–3) indicating how much the
  user wishes to visit. Each entry belongs to exactly one user wishlist.
- **Menu Item**: A user-created text label representing a dish the
  user wants to eat at a specific restaurant. A restaurant can have
  zero or more menu items. The same menu item name can appear across
  multiple restaurants.

## Clarifications

### Session 2026-02-15

- Q: Target platform (web, native, cross-platform)? → A: Mobile web app (responsive, browser-based)
- Q: Main wishlist sort order? → A: Sort by star rating (1–3) descending; stars represent how much the user wishes to visit
- Q: Map initial view location? → A: Current GPS location, with fallback to a default city-level view if permission denied

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can find and add a restaurant to their wishlist
  within 30 seconds of opening the app.
- **SC-002**: Users can add a menu item memo to a restaurant within
  10 seconds of opening the restaurant detail view.
- **SC-003**: The "By Menu" grouped view correctly displays all
  restaurants for a given menu item with 100% accuracy.
- **SC-004**: Saved wishlist data remains available after closing and
  reopening the app with no data loss.
- **SC-005**: 90% of first-time users can complete the primary flow
  (search → add restaurant → add menu item → view by menu) without
  guidance.
