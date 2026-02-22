# Research: 021-map-saved-markers

**Date**: 2026-02-22

## Decision 1: Custom Marker Icons via Kakao Maps SDK

**Decision**: Use `kakao.maps.MarkerImage` to create custom marker icons for each save type (wishlist, visited, search result).

**Rationale**: The Kakao Maps SDK natively supports `MarkerImage` as a constructor option for `Marker`. This allows setting custom image URLs, sizes, and offsets per marker. SVG data URIs or inline-generated images work without external dependencies.

**Alternatives considered**:
- CSS overlay on marker DOM elements — Kakao SDK markers aren't regular DOM nodes; limited customization after render.
- CustomOverlay instead of Marker — more flexible but loses built-in click/hover behavior, requiring manual reimplementation.
- Different-colored pins via Kakao's built-in marker colors — SDK only provides the default red pin; no built-in color variants.

## Decision 2: Fetching Saved Restaurants for Map Display

**Decision**: Create a new `useSavedRestaurantsForMap()` hook that fetches all of the current user's saved restaurants (`id`, `kakao_place_id`, `name`, `lat`, `lng`, `star_rating`) in a single query, filtered by the current viewport bounds on the client side.

**Rationale**: The existing `useWishlist()` and `useVisitedGrouped()` hooks fetch all user restaurants but return fully mapped `Restaurant` objects with grouping logic. A dedicated hook avoids unnecessary data transfer and processing. Client-side viewport filtering is sufficient because the typical user has <200 saved restaurants — no server-side spatial query needed.

**Alternatives considered**:
- Reuse `useWishlist()` + `useVisitedGrouped()` — these hooks are cache-keyed separately and have grouping logic that adds overhead for the map use case.
- Server-side PostGIS bounding box filter — over-engineering for <200 rows per user; adds migration complexity.
- Fetch all restaurants once, filter in `useMemo` — this is effectively what we're doing, just with a lightweight query.

## Decision 3: Marker Merge Strategy for Search Results + Saved

**Decision**: When building the markers array, check each search result against the saved restaurants set. If a match is found (by `kakao_place_id`), render the saved marker style instead of the search result style. This gives saved status visual precedence.

**Rationale**: The spec clarification confirmed "merge — show only the saved marker." This avoids z-index stacking issues and gives users the most informative marker state.

**Alternatives considered**:
- Two separate marker layers with z-index management — complex, risk of click target confusion.
- Badge overlay on search markers — requires CustomOverlay, losing native Marker API benefits.

## Decision 4: Marker Visual Design

**Decision**: Use three visually distinct marker styles:
1. **Search result**: Default Kakao red pin (no change)
2. **Wishlist (saved, no rating)**: Blue pin with heart icon — signals "want to visit"
3. **Visited (saved, with rating)**: Orange/gold pin with star icon — signals "been there, rated"

**Rationale**: Blue and orange are colorblind-friendly when paired (distinguishable in deuteranopia and protanopia). Heart = aspiration, star = achievement is an intuitive metaphor. The default red pin remains for unsaved search results, maintaining backward compatibility.

**Alternatives considered**:
- Green for wishlist — too close to red for colorblind users.
- Size differentiation only — insufficient distinction at map zoom levels where pins are small.
- Emoji-based markers — inconsistent rendering across devices/OS versions.

## Decision 5: Toggle Control Placement

**Decision**: Place the toggle button in the top-right area of the map, below the search bar area. Use a small floating button with a bookmark/pin icon that toggles between filled (markers visible) and outline (markers hidden).

**Rationale**: Top-right is the conventional placement for map controls (zoom, layers). A small floating button doesn't compete with the search bar (top-center) or the bottom sheet. The filled/outline state matches standard toggle icon patterns.

**Alternatives considered**:
- Bottom toolbar — conflicts with bottom sheet and bottom navigation.
- Settings/filter panel — too hidden for a frequently toggled feature.
- Long-press gesture — undiscoverable.
