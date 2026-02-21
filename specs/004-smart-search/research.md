# Research: Smart Search

## R-001: Kakao Local API Location-Based Search Capabilities

**Decision**: Use Kakao API's native `sort=distance`, `radius`, and `x`/`y` parameters for distance-based search.

**Rationale**: The Kakao keyword search endpoint (`/v2/local/search/keyword`) natively supports:
- `x`, `y` parameters: center coordinates for distance reference
- `sort=distance`: sorts results by distance from coordinates (default is `accuracy`)
- `radius`: limits results to a circle around x,y (0–20,000 meters). We'll use 5,000m per the spec clarification.
- `distance` field: returned in each document (in meters) **only when x,y are provided**

This means distance sorting and filtering require **zero client-side computation** — the API handles it.

**Alternatives considered**:
- Client-side Haversine distance calculation: unnecessary since API provides distance natively
- Using `rect` (bounding box) instead of `radius`: less intuitive for "nearest" semantics, and `radius` maps directly to the spec's 5km requirement

## R-002: Semantic Query Expansion Strategy

**Decision**: Use a static mapping dictionary (`search-expansions.ts`) that maps food category keywords to arrays of related search terms.

**Rationale**:
- Zero runtime cost (no external API calls for expansion)
- Predictable, testable behavior
- Kakao API is keyword-based — to find "KFC" when searching "chicken", we need to fire separate queries for ["chicken", "치킨", "KFC", "BBQ치킨", "교촌", "Popeyes", "굽네", "BHC"]
- Each expanded term becomes a separate `searchByKeyword` call, all with the same x/y/radius/sort parameters
- Results from all calls are merged, deduplicated by place `id`, and sorted by distance

**Alternatives considered**:
- LLM-based expansion: high latency, cost per search, unpredictable results — rejected
- Kakao category search (`/search/category`): only supports category_group_code (e.g., "FD6" for all restaurants), not subcategory filtering — too broad
- Single query with broader matching: Kakao API only does keyword matching in place names/addresses — cannot semantically match "chicken" to "KFC"

## R-003: Multi-Query Merge and Deduplication

**Decision**: Fire all expanded queries in parallel using `Promise.allSettled`, merge successful results, deduplicate by Kakao place `id`, sort by `distance` (numeric, ascending).

**Rationale**:
- `Promise.allSettled` (not `Promise.all`) allows partial success — if one query fails, others still return results (per spec FR-012)
- Deduplication by `id` is reliable since Kakao assigns unique IDs to places
- API returns `distance` as a string in meters — parse to number for sorting
- Cap total results after deduplication (spec FR-008: ~45 results)

**Alternatives considered**:
- Sequential queries: slower, no benefit since they're independent
- `Promise.all`: fails entirely if any query fails — violates FR-012

## R-004: API Rate Limiting Considerations

**Decision**: Limit expanded terms to a maximum of 5 queries per search to stay within API rate limits and keep latency under 3 seconds.

**Rationale**:
- Kakao API allows up to 15 results per query. With 5 parallel queries, max raw results = 75, which after deduplication and 5km radius filtering will typically yield 30-45 unique results.
- Kakao's rate limit for the Local API is generous (documented as 100,000 requests/day for production keys), so 5 parallel queries per user search is well within limits.
- 5 parallel queries keeps total latency close to a single query's latency (~300-500ms).

**Alternatives considered**:
- No limit on expanded queries (could generate 10+ queries for broad categories): risk of slow searches and API throttling
- Single query with category filter: Kakao doesn't support subcategory filtering, so this doesn't solve the semantic gap

## R-005: Expansion Dictionary Design

**Decision**: Structure the mapping as a TypeScript `Record<string, string[]>` with bidirectional Korean/English matching, plus brand-name entries.

**Rationale**:
- User may search in Korean ("치킨") or English ("chicken") — both should trigger the same expansion
- Each entry maps a trigger keyword to up to 4-5 search terms (to stay within the 5-query limit)
- The original user query is always included as the first search term
- Matching is case-insensitive and checks if the user's query is a substring of any trigger keyword (or exact match)

**Initial categories** (10-15 per spec clarification):
1. chicken/치킨 → ["치킨", "KFC", "BBQ치킨", "교촌치킨", "BHC"]
2. pizza/피자 → ["피자", "도미노", "Pizza Hut", "파파존스"]
3. coffee/커피/카페 → ["카페", "스타벅스", "이디야", "투썸플레이스"]
4. burger/버거/햄버거 → ["버거", "맥도날드", "버거킹", "롯데리아"]
5. sushi/초밥/일식 → ["초밥", "스시", "일식", "회전초밥"]
6. korean bbq/고기/삼겹살 → ["삼겹살", "고기", "갈비", "한우"]
7. noodles/면/국수 → ["국수", "라멘", "칼국수", "파스타"]
8. chinese/중식/중국집 → ["중국집", "중식", "짜장면", "짬뽕"]
9. dessert/디저트 → ["디저트", "케이크", "베이커리", "마카롱"]
10. beer/맥주/술집 → ["맥주", "호프", "술집", "포차"]
11. vietnamese/베트남/쌀국수 → ["베트남", "쌀국수", "반미", "분짜"]
12. brunch/브런치 → ["브런치", "팬케이크", "와플", "토스트"]
