# Research: 006-viewport-search

## Decision 1: Geographic Query Method

**Decision**: Use the Kakao Local API `rect` parameter for bounding-box viewport queries instead of `x/y/radius`.

**Rationale**: The `/v2/local/search/keyword` endpoint supports `rect=left_x,left_y,right_x,right_y` which maps directly to the map viewport's SW/NE bounds. This eliminates the need to compute a center + radius from viewport corners and avoids the circular approximation error of radius-based search on a rectangular viewport.

**Alternatives considered**:
- `x/y/radius` (center + radius): Requires computing center and diagonal radius from viewport corners. Searches a circular area, which either misses viewport corners or over-fetches. Rejected.
- Client-side filtering: Fetch with large radius, filter by viewport bounds on client. Wasteful API calls. Rejected.

## Decision 2: Pagination Strategy to Exceed 45-Result Limit

**Decision**: Paginate each expanded search term query to fetch all 3 pages (45 results per term), combined with semantic expansion (up to 5 terms) for a theoretical max of 225 results before deduplication.

**Rationale**: The Kakao API hard-caps at 45 results per query (`pageable_count` max = 45, `page` range 1-45, `size` range 1-15). There is no way to get more than 45 results from a single keyword query. However, semantic expansion already runs multiple queries in parallel (up to 5 terms). By paginating each term to 3 pages × 15 results = 45 per term × 5 terms = 225 max, we significantly exceed the current 45 total cap.

**Alternatives considered**:
- Viewport tiling (subdivide viewport into sub-regions): Complex, multiplies API calls exponentially. Overkill for current density requirements. Rejected for V1.
- Single page per term with higher size: Already maxed at size=15. No gain. Rejected.

## Decision 3: Viewport Change Detection for "Search this area" Button

**Decision**: Use the existing `onBoundsChange` callback from MapView which fires on the Kakao map `idle` event. Compare new bounds against the bounds used for the last search to determine whether to show the button.

**Rationale**: The `onBoundsChange` callback already exists and emits `{ sw: {lat, lng}, ne: {lat, lng} }` on map idle. We need to store the "last searched bounds" and compare against the current viewport bounds. If they differ meaningfully (not just minor floating-point drift), show the button.

**Alternatives considered**:
- Threshold-based distance check (only show button if viewport moved >X meters): Adds complexity. Simple bounds inequality check is sufficient since the button is user-triggered anyway. Rejected for V1.
- Listening to `dragend`/`zoom_changed` events instead of `idle`: More granular but fires before the map finishes animating, causing flicker. `idle` is the correct event. Already used.

## Decision 4: Error Handling Pattern

**Decision**: On viewport search failure, retain previous results on map/bottom sheet and show a dismissible toast notification. Keep "Search this area" button visible for retry.

**Rationale**: Per spec clarification. Clearing results on transient errors is disruptive. Users can retry via the button or continue browsing existing results.

**Alternatives considered**:
- Clear results + full error state: Too destructive for transient failures. Rejected.
- Silent auto-retry: Masks errors, confuses users if network is persistently down. Rejected.

## Decision 5: No New Dependencies Required

**Decision**: No new libraries needed. Use existing Kakao Maps SDK event system, React state, and existing toast/notification patterns.

**Rationale**: The feature is a refactor of the search flow, not a new integration. All building blocks exist: `onBoundsChange` for viewport detection, `searchByKeyword` for API calls, `Promise.allSettled` for parallel fetching, existing bottom sheet and marker rendering.

**Alternatives considered**:
- React Query / SWR for caching viewport searches: Adds dependency for a simple use case. Direct state management is sufficient. Rejected per Constitution Principle V (Simplicity).
