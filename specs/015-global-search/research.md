# Research: Global Search Beyond Viewport

## Decision 1: Search Strategy

**Decision**: Local-first with fallback to global when local results < 5.

**Rationale**: Kakao's keyword search API with `sort=accuracy` balances relevance and proximity when `x,y` are provided. However, removing `radius` entirely risks mixing nearby and distant results for generic queries like "치킨". The local-first approach preserves existing UX for common queries while enabling global discovery for specific/rare queries.

**Alternatives considered**:
- **Always global (no radius)**: Simplest code change, but generic queries could show distant results mixed with local ones. Map `fitBounds` would zoom out unnecessarily.
- **Parallel local + global**: Both searches run simultaneously, pick local if sufficient. Wastes API calls for every search.
- **Query classification (generic vs. specific)**: Analyze query text to decide strategy. Overly complex for the benefit; result count is a better heuristic.

## Decision 2: Fallback Threshold

**Decision**: `LOCAL_MIN_RESULTS = 5`

**Rationale**: 0-4 local results indicates the query targets something rare or specific (e.g., a unique restaurant name). 5+ results indicates a generic category where local results are meaningful. This threshold balances:
- False positives (unnecessary global search): Low — 5 is generous for specific queries
- False negatives (missed global expansion): Low — most generic food terms return many more than 5 local results in populated areas

**Alternatives considered**:
- Threshold of 1 (only fallback on zero): Too conservative — 1-2 results might miss the intended place
- Threshold of 10: Too aggressive — some legitimate local queries return 5-9 results
- Dynamic threshold based on term count: Over-engineered for current needs

## Decision 3: Kakao API Behavior Without Radius

**Decision**: Confirmed that Kakao Local API keyword search works without `radius` or `rect` parameters, searching nationwide.

**Rationale**: The `searchByKeyword` function already supports optional `radius`. When omitted AND `rect` is also omitted, no geographic restriction is applied (lines 29-33 of `kakao.ts` — the `if/else if` block simply doesn't add any geo parameter). The `x,y` params are still passed for distance calculation and relevance scoring.

**Verification**: The current code at `kakao.ts:29-33`:
```typescript
if (params.rect) {
  url.searchParams.set("rect", params.rect);
} else if (params.radius != null) {
  url.searchParams.set("radius", String(params.radius));
}
```
When neither `rect` nor `radius` is provided, no geographic restriction is added to the API call.

## Decision 4: Performance Impact

**Decision**: Acceptable worst-case of 2x API calls (local then global).

**Rationale**:
- Best case (generic query, 5+ local results): No performance change. Same number of API calls.
- Worst case (specific query, <5 local results): 2x API calls. With Kakao API typical response time of ~200ms per call and 3 pages × N terms, the local check typically completes in <1s, then global search adds another <1s. Total under 2s target.
- Average case: Most user searches are for common food terms that return many local results. Global fallback is triggered only for rare/specific queries — a small fraction of total searches.

## Decision 5: `smartSearch` Signature Change

**Decision**: Remove `radius` parameter from `smartSearch` public API.

**Rationale**: The `radius` parameter was never used by any caller (only the default value `DEFAULT_RADIUS` was used internally). The search page's `handleSearch` does not pass `radius`. Removing it from the signature simplifies the API and makes the local-first-with-fallback behavior an internal concern of `smartSearch`.
