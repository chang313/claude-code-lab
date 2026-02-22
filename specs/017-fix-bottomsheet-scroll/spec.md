# Feature Specification: Fix Bottom Sheet Scroll for Search Results

**Feature Branch**: `017-fix-bottomsheet-scroll`
**Created**: 2026-02-22
**Status**: Draft
**Input**: User description: "Fix search results bottom sheet scroll: The BottomSheet component doesn't let users see all search results. When expanded, results are cut off and can't be scrolled to view all items."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Scroll Through All Search Results in Expanded Sheet (Priority: P1)

A user searches for restaurants on the map and gets many results (e.g., 20+). They swipe the bottom sheet up to the "expanded" state and want to scroll through every result. Currently, results are cut off and some are hidden below the bottom navigation bar, making it impossible to see all items.

**Why this priority**: This is the core bug. Users cannot access all search results, which directly breaks the primary search functionality of the app.

**Independent Test**: Can be fully tested by performing a search that returns 10+ results, expanding the bottom sheet, and scrolling to verify every result is visible and accessible.

**Acceptance Scenarios**:

1. **Given** search results are displayed in the bottom sheet in "expanded" state, **When** user scrolls down through results, **Then** all results are visible and none are hidden behind the bottom navigation bar.
2. **Given** search results are displayed in the bottom sheet in "expanded" state, **When** user scrolls to the last result, **Then** the last result card is fully visible above the bottom navigation bar.
3. **Given** the bottom sheet is in "expanded" state, **When** user views the sheet, **Then** the sheet content area fills from its top edge to just above the bottom navigation bar without overflow.

---

### User Story 2 - Drag Bottom Sheet Smoothly Between States (Priority: P2)

A user drags the bottom sheet handle to transition between "peek" and "expanded" states. Currently, dragging from the "expanded" state causes a visual jump because the drag calculation always anchors from the "peek" position instead of the current position.

**Why this priority**: While the sheet snap positions work correctly via tap/swipe, the drag feedback is broken, making the interaction feel glitchy and unreliable.

**Independent Test**: Can be tested by dragging the sheet handle from each state and verifying the sheet follows the finger position smoothly without jumping.

**Acceptance Scenarios**:

1. **Given** the bottom sheet is in "expanded" state, **When** user drags the handle downward, **Then** the sheet moves smoothly from its current position following the finger.
2. **Given** the bottom sheet is in "peek" state, **When** user drags the handle upward, **Then** the sheet moves smoothly from its current position following the finger.
3. **Given** the user is dragging the sheet, **When** the drag ends beyond the threshold, **Then** the sheet snaps to the appropriate state without visual glitches.

---

### User Story 3 - Bottom Sheet Layering Does Not Obscure Content (Priority: P3)

The bottom navigation bar and the bottom sheet must layer correctly so that neither obscures the other's interactive elements. The bottom sheet content should account for the navigation bar's height.

**Why this priority**: This is a visual polish issue. The core scroll fix (P1) addresses content accessibility; this ensures the layering and padding are pixel-perfect.

**Independent Test**: Can be tested by expanding the bottom sheet and verifying that no result card is partially hidden behind the navigation bar, and that the navigation bar remains usable.

**Acceptance Scenarios**:

1. **Given** the bottom sheet is in any state, **When** user views the interface, **Then** the bottom navigation bar remains visible and tappable.
2. **Given** the bottom sheet is expanded with many results, **When** user scrolls to the bottom, **Then** the last result has sufficient spacing above the navigation bar to be fully readable.

---

### Edge Cases

- What happens when the device has a notch or home indicator (safe area insets)?
- How does the sheet behave when the virtual keyboard is open (e.g., search input focused)?
- What happens when the viewport is resized (e.g., rotating device from portrait to landscape)?
- How does the sheet behave with zero search results vs. one result vs. many results?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The bottom sheet scroll container MUST size itself to the visible portion of the sheet (from the drag handle to the bottom navigation bar), not the full viewport height.
- **FR-002**: All search result items MUST be reachable by scrolling within the expanded bottom sheet.
- **FR-003**: The drag gesture MUST use the sheet's current position as the base for calculating movement, not a hardcoded "peek" position.
- **FR-004**: The bottom sheet content MUST have bottom padding that accounts for the bottom navigation bar height so no content is hidden behind it.
- **FR-005**: The bottom sheet and bottom navigation bar MUST layer correctly so both remain functional in all sheet states.
- **FR-006**: The sheet MUST respect device safe area insets (notch, home indicator) when calculating visible content area.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can scroll to and read every search result in the expanded bottom sheet, including the last item, without any result being hidden behind the navigation bar.
- **SC-002**: Dragging the bottom sheet handle from any state produces smooth, continuous movement that follows the user's finger without visual jumps or snapping during the drag.
- **SC-003**: The bottom navigation bar remains fully visible and tappable in all bottom sheet states (hidden, peek, expanded).
- **SC-004**: The fix works correctly on both iOS Safari and Android Chrome mobile browsers, including devices with notches or home indicators.

## Assumptions

- The bottom navigation bar height is fixed and does not change dynamically.
- The three sheet states (hidden, peek, expanded) and their approximate viewport positions remain the same conceptually; only the height/scroll calculations change.
- No new UI elements or features are being added — this is a bug fix to existing behavior.
- The `pb-24` (96px) bottom padding is an approximation of the nav bar height; the fix should use the actual nav bar height or a reliable equivalent.
