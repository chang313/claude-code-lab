# Research: Naver Import Category Auto-Enrichment

**Feature**: 026-naver-category-enrichment
**Date**: 2026-02-23

## R1: Kakao Category Search API for Coordinate-Based Fallback

**Decision**: Use Kakao Local API's `/v2/local/search/category` endpoint with category group codes `FD6` (음식점) and `CE7` (카페) for coordinate-based fallback.

**Rationale**: When name-based keyword search fails, the category search endpoint can find food establishments near given coordinates without requiring a name query. This provides category data even when the restaurant name is completely different between Naver and Kakao. The endpoint accepts `x`, `y`, `radius`, and `category_group_code` — exactly the parameters we need.

**Alternatives considered**:
- **Kakao keyword search with generic terms** (e.g., "음식점"): Rejected — returns branded/popular results, not the specific establishment at the coordinates. Less precise than category search.
- **Reverse geocoding + inference**: Rejected — Kakao's reverse geocoding returns address, not business category. Would require a second lookup.
- **Manual user assignment**: Out of scope per spec — the goal is automatic enrichment.

**API Details**:
- Endpoint: `GET https://dapi.kakao.com/v2/local/search/category`
- Required params: `category_group_code` (FD6 or CE7), `x` (longitude), `y` (latitude)
- Optional params: `radius` (meters, default 100), `sort` (distance/accuracy), `size`, `page`
- Auth: Same `Authorization: KakaoAK {key}` header as keyword search
- Response: Same `KakaoSearchResponse` structure with `documents` array of `KakaoPlace`

## R2: Name Normalization — Korean Restaurant Suffix Patterns

**Decision**: Extend `normalizeName()` to strip common Korean business suffixes before substring comparison. Target suffixes: `점`, `역점`, `지점`, `본점`, `직영점`, `강남점` (and similar location+점 patterns).

**Rationale**: The #1 cause of name mismatch is that Naver and Kakao encode branch/location differently. For example:
- Naver: "스타벅스 강남역점" vs Kakao: "스타벅스 강남대로점" → substring fails
- Naver: "맘스터치 강남" vs Kakao: "맘스터치 강남역점" → substring works one way but not reliably

Stripping the trailing `점` suffix pattern (anything ending with N characters + "점") normalizes both to the base name, dramatically increasing substring match success.

**Alternatives considered**:
- **Levenshtein/edit distance**: Rejected — expensive per comparison, Korean character distance is not meaningful (one Hangul character = 2-3 bytes, visual similarity ≠ byte similarity).
- **Jamo decomposition**: Rejected — over-engineering for this use case. Suffix stripping handles the dominant mismatch pattern.
- **Exact match only**: Rejected — current behavior, failing too many restaurants.

**Implementation**: Add a `stripSuffix()` step to `normalizeName()`:
```
Pattern: /(?:역점|지점|본점|직영점|.{1,4}점)$/
```
This strips "점" and common prefixed variants. Applied to both Naver and Kakao names before comparison.

## R3: Search Radius Expansion — 100m → 300m

**Decision**: Increase `MATCH_RADIUS_M` from 100 to 300 in both the Kakao API `radius` parameter and the Haversine distance filter.

**Rationale**: Naver bookmark coordinates are approximate — they represent the map pin the user saved, which can be offset from the actual building entrance that Kakao uses. Analysis of common cases shows 200-300m discrepancy is frequent for large complexes, malls, and buildings with multiple entrances.

**Alternatives considered**:
- **Progressive radius** (100m → 200m → 300m): Rejected — adds complexity and API calls for marginal benefit. Most misses at 100m are matches at 300m.
- **500m+ radius**: Rejected — too high risk of false positives in dense urban areas (Seoul, Busan). 300m is the sweet spot.
- **No radius in API, post-filter only**: Rejected — wastes API quota on irrelevant results.

**Risk mitigation**: The expanded 300m radius is used in conjunction with name matching (FR-002) — distance alone never triggers a match. The coordinate-based fallback (FR-003) uses a separate 50m radius to minimize false category assignment.

## R4: Coordinate Fallback — Category-Only Update

**Decision**: When coordinate fallback finds a nearby food establishment, update ONLY the `category` field. Do NOT update `kakao_place_id` or `place_url`.

**Rationale**: Coordinate-based matching without name confirmation has inherently lower confidence. Replacing the synthetic `kakao_place_id` with a potentially wrong Kakao place would:
- Link the user to the wrong Kakao Maps page
- Prevent future re-enrichment (the restaurant would no longer have a `naver_` prefix)
- Create data integrity issues if the matched restaurant is wrong

By updating only `category`, we get the primary benefit (proper grouping) without the risk of data corruption.

**Implementation**: The coordinate fallback uses a separate code path in `enrichBatch()` that calls a new `findCategoryByCoordinates()` function and performs a targeted `.update({ category })` instead of the full 3-field update.

## R5: Retroactive Re-Enrichment Strategy

**Decision**: Create a new API route `POST /api/import/re-enrich` that queries ALL restaurants with empty `category` (regardless of batch) and runs the improved enrichment pipeline on them.

**Rationale**: Existing restaurants imported before this feature have empty categories. FR-008 requires a one-time pass. The route:
1. Queries `restaurants` where `category = ''` and `user_id = current user`
2. Runs the same enrichment pipeline (expanded radius + suffix normalization + coordinate fallback)
3. Does NOT require a batch — operates across all user's restaurants
4. Is idempotent (only processes empty categories)

**Alternatives considered**:
- **Database migration/script**: Rejected — requires server-side Kakao API access; Supabase SQL Editor can't call external APIs.
- **Automatic on deploy**: Rejected — no server-side job runner in the current architecture. Would need a user-triggered action.
- **Batch-by-batch re-enrichment**: Rejected — restaurants from before the import feature (manually added) wouldn't be covered. A global empty-category scan is more comprehensive.
