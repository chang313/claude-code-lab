# Feature Specification: Adjust Map Icons to Circular Shape

**Feature Branch**: `028-adjust-map-icons`
**Created**: 2026-02-23
**Status**: Draft
**Input**: User description: "Modify map icon to circular shape one. Also, adjust icon size little bit smaller so that user can distinguish nearby places."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Distinguish Nearby Restaurants on Map (Priority: P1)

A user searches for restaurants in a dense area (e.g., a food street or mall district). The map displays multiple markers close together. With the new smaller circular markers, the user can visually distinguish individual restaurants without markers overlapping or obscuring each other.

**Why this priority**: This is the core motivation for the change — users currently struggle to differentiate nearby places when markers are large and overlap.

**Independent Test**: Can be tested by searching in a dense restaurant area and verifying that adjacent markers are visually distinguishable at the default zoom level.

**Acceptance Scenarios**:

1. **Given** a map area with 5+ restaurants within a 100m radius, **When** the user views the map at default zoom, **Then** each restaurant marker is visually distinguishable from its neighbors.
2. **Given** markers displayed on the map, **When** the user views any marker, **Then** the marker appears as a filled circle (not a teardrop/pin shape).
3. **Given** markers of different types (search, wishlist, visited), **When** displayed together, **Then** each type remains distinguishable by its unique color and inner icon.

---

### User Story 2 - Identify Marker Types at a Glance (Priority: P2)

A user views the map with a mix of search results, wishlist items, and visited restaurants. Each circular marker retains its distinct color and inner icon so the user can immediately understand the status of each place without tapping.

**Why this priority**: Preserving type differentiation ensures the circular redesign doesn't regress existing usability.

**Independent Test**: Can be tested by loading a map with all three marker types present and verifying color/icon distinction.

**Acceptance Scenarios**:

1. **Given** a map with search, wishlist, and visited markers, **When** the user views the map, **Then** search markers appear red with a white dot, wishlist markers appear blue with a white heart, and visited markers appear orange with a white star.
2. **Given** the smaller marker size, **When** the user views any marker, **Then** the inner icon (dot, heart, or star) remains recognizable.

---

### User Story 3 - Tap a Circular Marker to View Details (Priority: P2)

A user taps on a circular marker to view the restaurant's info window. The tap target must remain usable despite the smaller size.

**Why this priority**: Interaction must remain functional after the size reduction.

**Independent Test**: Can be tested by tapping markers on a mobile device and verifying the info window opens reliably.

**Acceptance Scenarios**:

1. **Given** a circular marker on the map, **When** the user taps it, **Then** the info window opens showing the restaurant name and status.
2. **Given** two markers close together, **When** the user taps one, **Then** only that marker's info window opens (not the adjacent one).

---

### Edge Cases

- What happens when markers overlap at low zoom levels? Circular markers should still reduce overlap compared to the taller teardrop shape, but some overlap is expected at very low zoom.
- How do markers appear on high-DPI (Retina) displays? SVG-based markers scale cleanly regardless of display density.
- What happens when only one marker is on the map? It should display as a centered circle at the specified size.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All map markers MUST render as filled circles instead of the current teardrop/pin shape.
- **FR-002**: Marker dimensions MUST be reduced from the current 28×40 pixels to 20×20 pixels (circle diameter).
- **FR-003**: Each marker type MUST retain its current color scheme: red (#E74C3C) for search, blue (#3498DB) for wishlist, orange (#F39C12) for visited.
- **FR-004**: Each marker type MUST retain a recognizable inner icon: white dot for search, white heart for wishlist, white star for visited.
- **FR-005**: Markers MUST remain tappable on mobile devices — the effective tap target area MUST be sufficient for reliable finger interaction, even if the visual marker is smaller.
- **FR-006**: The marker anchor point MUST be centered on the geographic coordinate (center of the circle), not offset like the previous teardrop's bottom tip.
- **FR-007**: Info windows MUST continue to open when a marker is tapped, displaying the same content as before.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can visually distinguish individual markers when 3 or more restaurants are within 50m of each other at default zoom level.
- **SC-002**: All three marker types (search, wishlist, visited) are correctly identifiable by color and icon in under 2 seconds of viewing.
- **SC-003**: Marker tap success rate on mobile remains at or above pre-change levels (no increase in mis-taps).
- **SC-004**: No visual regression — markers render crisply on both standard and high-DPI displays.

## Assumptions

- The Kakao Maps SDK supports custom marker images with square dimensions and centered anchor points.
- SVG-based markers will continue to be encoded as base64 data URIs (no change in encoding approach).
- The size reduction from 28×40 to 20×20 is sufficient to reduce overlap while maintaining visibility; if testing reveals icons are too small, 24×24 is an acceptable fallback.
- No changes to the info window content or behavior are needed.
- The marker merge logic (search + saved) and type determination remain unchanged.

## Out of Scope

- Marker clustering (grouping overlapping markers into a count badge) — this is a separate future enhancement.
- Animated marker transitions or hover effects.
- Changes to the info window design or content.
- Changes to the bottom sheet or restaurant card components.
- Changes to marker colors or the type classification logic.
