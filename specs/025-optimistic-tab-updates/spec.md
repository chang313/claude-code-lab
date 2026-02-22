# Feature Specification: Eliminate Loading Flash on Wishlist Tab Mutations

**Feature Branch**: `025-optimistic-tab-updates`
**Created**: 2026-02-23
**Status**: Draft
**Input**: User description: "User doesn't need to see 'Loading' state when updating something of item in '맛집' tab (e.g. updating stars, or 'go to wishlist')"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Star Rating Update Without Loading Flash (Priority: P1)

A user views their 맛집 리스트 (visited list) and taps a star to change a restaurant's rating. The star visually updates instantly and the rest of the list remains visible throughout. No "로딩 중..." flash appears at any point during the update.

**Why this priority**: This is the most frequently performed mutation on the wishlist tab. Users rate and re-rate restaurants regularly, and seeing a full-page loading flash for each tap is jarring and makes the app feel sluggish.

**Independent Test**: Can be fully tested by tapping any star rating on a visited restaurant and observing that the list never disappears or shows a loading message.

**Acceptance Scenarios**:

1. **Given** a user is on the 맛집 tab with visited restaurants, **When** they tap a star to change a rating, **Then** the star updates immediately and the full list remains visible throughout the server sync.
2. **Given** a user changes a star rating and the server request fails, **When** the error is returned, **Then** the star reverts to its previous value and an error toast appears — the loading screen is never shown.

---

### User Story 2 - Move to Wishlist Without Loading Flash (Priority: P1)

A user taps "위시리스트로" on a visited restaurant. The item moves from the visited list to the wishlist section instantly, without the page flashing "로딩 중...".

**Why this priority**: Moving items between lists is the second most common mutation. The full-page loading flash is especially disorienting here because the user expects to see the item appear in the other section.

**Independent Test**: Can be fully tested by tapping "위시리스트로" on any visited restaurant and verifying the item appears in the wishlist section without any loading flash.

**Acceptance Scenarios**:

1. **Given** a user is on the 맛집 tab with a visited restaurant, **When** they tap "위시리스트로", **Then** the item disappears from the visited list and appears in the wishlist section without any loading screen flash.
2. **Given** a user moves an item to wishlist and the server request fails, **When** the error occurs, **Then** the item returns to its original position in the visited list with an error toast — no loading screen shown.

---

### User Story 3 - Mark as Visited Without Loading Flash (Priority: P1)

A user taps a star on a wishlist item to promote it to the visited list. The item moves between sections instantly without any loading flash.

**Why this priority**: This completes the set of cross-list mutations that currently cause loading flash. All three mutations share the same root cause.

**Independent Test**: Can be fully tested by tapping a star on any wishlist restaurant and verifying the item moves to the visited list without loading flash.

**Acceptance Scenarios**:

1. **Given** a user is on the 맛집 tab with a wishlist restaurant, **When** they tap a star rating on it, **Then** the item moves to the visited list with the chosen rating and no loading screen appears.

---

### User Story 4 - Delete Without Loading Flash (Priority: P2)

A user taps "삭제" on a restaurant. The item disappears instantly without the page showing a loading state.

**Why this priority**: Less frequent than the above mutations but still affected by the same root cause.

**Independent Test**: Can be fully tested by tapping "삭제" on any restaurant and verifying the item disappears without loading flash.

**Acceptance Scenarios**:

1. **Given** a user is on the 맛집 tab with a restaurant, **When** they tap "삭제", **Then** the item disappears from the list without any loading flash.

---

### Edge Cases

- What happens when the user performs multiple rapid mutations (e.g., changing stars on several restaurants quickly)? The list should remain stable throughout all concurrent updates.
- What happens on the very first load when there is genuinely no data? The initial "로딩 중..." should still display correctly for the first page load.
- What happens when both visited and wishlist queries revalidate simultaneously after a cross-list move? Neither should trigger a loading flash.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST NOT display a full-page loading state when revalidating data after a mutation (star rating change, move to wishlist, mark as visited, delete).
- **FR-002**: System MUST continue to show the current data (including optimistic updates) while background revalidation is in progress.
- **FR-003**: System MUST still display a loading state on the initial page load when no data has been fetched yet.
- **FR-004**: System MUST correctly revert optimistic changes and show an error toast if the server request fails — without showing a loading screen at any point.
- **FR-005**: System MUST handle concurrent mutations gracefully — multiple rapid mutations should not cause loading flashes or data inconsistencies.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users never see the "로딩 중..." loading screen after performing any mutation on the 맛집 tab (star update, move, delete).
- **SC-002**: The list content remains continuously visible during all background data refreshes following mutations.
- **SC-003**: Initial page load still shows the loading indicator until data arrives.
- **SC-004**: Error scenarios (network failure, server error) still display proper error feedback via toast without showing a loading screen.

## Assumptions

- The existing optimistic update logic in the mutation hooks is correct and does not need modification — only the query hook's loading state management needs to change.
- The "stale-while-revalidate" pattern (keep showing existing data during background refresh) is the appropriate solution.
- Other pages using `useSupabaseQuery` will also benefit from this change, which is acceptable as the fix is universally correct behavior.
