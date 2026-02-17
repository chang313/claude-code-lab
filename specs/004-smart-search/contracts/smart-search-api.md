# API Contracts: Smart Search

## Internal Module Contracts

This feature has no new backend APIs. All contracts are internal TypeScript module interfaces.

### 1. Search Expansion Lookup

```typescript
// src/lib/search-expansions.ts

/**
 * Look up expanded search terms for a user query.
 * Returns the original query if no expansion match found.
 */
function getExpandedTerms(query: string): string[]
```

**Input**: User search query string (trimmed, non-empty)
**Output**: Array of 1-5 search terms (always includes original query)
**Behavior**:
- Case-insensitive substring matching against trigger keywords
- Returns first matching entry's terms
- Prepends original query if not already in terms
- Returns `[query]` if no match found

### 2. Smart Search (orchestrator)

```typescript
// src/lib/kakao.ts (extended)

/**
 * Perform expanded search with location awareness.
 * Fires multiple keyword queries in parallel, merges and deduplicates results.
 */
function smartSearch(params: {
  query: string;
  x?: string;        // user longitude
  y?: string;        // user latitude
  radius?: number;   // meters, default 5000
}): Promise<KakaoPlace[]>
```

**Input**: User query + optional coordinates
**Output**: Deduplicated `KakaoPlace[]` sorted by distance (ascending) when coordinates provided
**Behavior**:
- Calls `getExpandedTerms(query)` to get search terms
- Fires `searchByKeyword` for each term (parallel via `Promise.allSettled`)
- Each call includes: `x`, `y`, `sort: "distance"`, `radius`, `size: 15`
- Merges fulfilled results, deduplicates by `id`
- Sorts by `distance` (numeric ascending) if coordinates provided
- Caps at 45 results
- Silently ignores rejected queries

### 3. Distance Formatting

```typescript
// src/lib/format-distance.ts

/**
 * Format distance in meters to human-readable label.
 */
function formatDistance(meters: string | undefined): string | undefined
```

**Input**: Distance string in meters from Kakao API (e.g., "1234") or undefined
**Output**: Formatted string ("350m", "1.2km") or undefined
**Rules**:
- undefined/empty input → undefined
- < 1000 → "{n}m" (e.g., "350m")
- ≥ 1000 → "{n.n}km" with one decimal (e.g., "1.2km")

### 4. Kakao Keyword Search (extended signature)

```typescript
// src/lib/kakao.ts (modified)

function searchByKeyword(params: {
  query: string;
  page?: number;
  size?: number;
  x?: string;
  y?: string;
  radius?: number;   // NEW: search radius in meters (0-20000)
  sort?: string;      // NEW: "accuracy" (default) or "distance"
}): Promise<KakaoSearchResponse>
```

**Changes from current**:
- Added `radius` parameter → maps to Kakao API `radius` query param
- Added `sort` parameter → maps to Kakao API `sort` query param
- No breaking changes to existing callers (new params are optional)
