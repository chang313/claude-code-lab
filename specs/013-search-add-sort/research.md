# Research: Search Add & Sort

**Feature**: `013-search-add-sort`
**Date**: 2026-02-21

## Research Items

### R1: Kakao API `distance` field with `sort=accuracy`

**Decision**: The Kakao Local API populates the `distance` field when `x` and `y` coordinate parameters are included in the request, regardless of the `sort` parameter value.

**Rationale**: The `distance` field represents the calculated distance from the provided coordinates to each result. The `sort` parameter only controls the result ordering (accuracy = relevance ranking, distance = nearest first). Distance calculation and distance sorting are independent behaviors.

**Alternatives considered**:
- Client-side distance computation using Haversine formula: Not needed since the API already provides distance values with coordinate parameters.

**Verification**: After implementation, confirm that `distance` values appear in API responses when using `sort=accuracy` with `x`,`y` params. If not populated, fallback is Haversine computation from `(userLat, userLng)` to `(parseFloat(place.y), parseFloat(place.x))`.

### R2: Relevance ordering with parallel expanded queries

**Decision**: Preserve insertion order from `Promise.allSettled` results. The original query term is always the first element in `getExpandedTerms()`, so its results rank highest.

**Rationale**: Kakao API returns results in relevance order when `sort=accuracy`. Since expanded terms are secondary matches (e.g., "chicken" expands to ["chicken", "KFC", "BBQ치킨"]), the original term's results should appear first. Deduplication already keeps the first occurrence, which naturally preserves relevance priority.

**Alternatives considered**:
- Assign numeric relevance scores based on result position: Over-engineered for the use case. The natural insertion order achieves the same effect.
- Merge and interleave results across terms: Would break the relevance ranking within each term's results.

### R3: Star rating selector UX pattern

**Decision**: Use a compact inline 3-star selector rendered as tappable star icons (★/☆) directly in the detail card, positioned between the restaurant info and the add button.

**Rationale**: The existing wishlist uses the same 1-3 star system. A compact inline selector avoids modal overhead and allows the 2-tap flow (tap marker → tap add) to remain achievable. Users who want to set a rating do so before tapping add; users who don't care keep the default of 1.

**Alternatives considered**:
- Post-add rating prompt (modal/toast): Adds an extra step, breaks the 2-tap success criterion.
- Rating dropdown: Less mobile-friendly than tappable stars.

### R4: Detail card z-index and bottom sheet interaction

**Decision**: Keep existing z-index layering. The detail card already floats above the bottom sheet at `z-30` with `absolute bottom-20`. No changes needed.

**Rationale**: The current implementation already handles the marker detail card correctly — it appears on marker click and overlays the bottom sheet. The edge case of "bottom sheet fully expanded" is handled by the existing sheet state management (user can drag sheet down, or sheet can be programmatically set to "peek" on marker click).

**Alternatives considered**:
- Auto-collapse bottom sheet to "peek" on marker click: Could be added as a UX polish, but not required by spec. Noted for tasks.
