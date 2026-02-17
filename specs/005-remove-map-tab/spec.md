# Feature Specification: Remove Map Tab

**Feature Branch**: `005-remove-map-tab`
**Created**: 2026-02-17
**Status**: Draft
**Input**: User description: "remove 'Map' tab"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Simplified Navigation (Priority: P1)

As a user, I see only three tabs in the bottom navigation bar — Wishlist, Search, and My — so I can navigate the app more efficiently without a redundant Map tab competing with the Search page's built-in map.

**Why this priority**: The Map tab duplicates functionality already available in the Search page (full-screen map, markers, restaurant cards). Removing it simplifies the navigation and reduces user confusion about where to discover restaurants.

**Independent Test**: Navigate between all remaining tabs and confirm each works correctly with no dead links or references to the removed Map tab.

**Acceptance Scenarios**:

1. **Given** the app is loaded, **When** I look at the bottom navigation bar, **Then** I see exactly three tabs: Wishlist, Search, and My.
2. **Given** the Map tab has been removed, **When** I tap Search, **Then** I see a full-screen map with a floating search bar and can discover restaurants the same way as before.
3. **Given** I previously bookmarked or shared a direct link to `/map`, **When** I navigate to `/map`, **Then** I am redirected to the Search page (`/search`) instead of seeing an error.

---

### User Story 2 - Clean Removal of Map Page (Priority: P2)

As a developer maintaining the codebase, the standalone Map page and its associated code are fully removed so that no dead code or unused imports remain.

**Why this priority**: Ensures codebase hygiene and prevents confusion for future contributors.

**Independent Test**: Build the application and confirm no build errors, no references to the removed Map page, and no unused imports.

**Acceptance Scenarios**:

1. **Given** the Map page has been removed, **When** the application is built, **Then** the build completes successfully with no errors or warnings related to the removal.
2. **Given** the Map page has been removed, **When** I search the codebase for references to the `/map` route, **Then** the only reference is the redirect rule (no orphaned links or imports).

---

### Edge Cases

- What happens when a user has `/map` bookmarked? They are redirected to `/search`.
- What happens if external links point to `/map`? They also redirect to `/search`.
- Does removing the Map tab affect the layout or spacing of the remaining three tabs? The three remaining tabs are evenly spaced across the navigation bar.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The bottom navigation bar MUST display exactly three tabs: Wishlist, Search, and My.
- **FR-002**: The standalone Map page (`/map`) MUST be removed from the application.
- **FR-003**: Navigation to `/map` MUST redirect users to `/search` to prevent broken links.
- **FR-004**: All code exclusively used by the standalone Map page MUST be removed (no dead code).
- **FR-005**: The Search page MUST continue to function identically — full-screen map, search bar, markers, bottom sheet results, and marker-click detail cards.
- **FR-006**: The three remaining tabs MUST be evenly distributed across the bottom navigation bar.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The bottom navigation displays exactly 3 tabs with no visual layout issues.
- **SC-002**: Users visiting `/map` are seamlessly redirected to `/search` within 1 second.
- **SC-003**: All existing Search page functionality (map view, keyword search, marker interaction, wishlist add) continues to work without regression.
- **SC-004**: The application builds and deploys without errors after the removal.

## Assumptions

- The Search page's existing map integration fully covers the discovery use case that the standalone Map tab provided.
- No analytics or tracking specifically tied to the Map tab needs to be preserved.
- No deep links from external marketing materials or partner integrations reference `/map` in a way that would require a permanent redirect (a simple redirect is sufficient).
