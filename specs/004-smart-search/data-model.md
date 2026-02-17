# Data Model: Smart Search

## Entities

### SearchExpansionEntry

A single entry in the expansion dictionary mapping trigger keywords to related search terms.

| Field | Type | Description |
|-------|------|-------------|
| triggers | string[] | Keywords that activate this expansion (Korean + English, case-insensitive). E.g., ["chicken", "치킨"] |
| terms | string[] | Search terms to query the API with (max 5). E.g., ["치킨", "KFC", "BBQ치킨", "교촌치킨", "BHC"] |

**Rules**:
- A user query matches an entry if it equals or is a substring of any trigger (case-insensitive)
- If multiple entries match, use the first (most specific) match
- If no entry matches, the original query is used as-is (fallback to standard keyword search)
- The original user query is always included in the search terms (prepended if not already present)

### EnhancedKakaoPlace (extends existing KakaoPlace)

Extends the existing `KakaoPlace` type with parsed distance information.

| Field | Type | Description |
|-------|------|-------------|
| ...KakaoPlace fields | | All existing fields preserved |
| distance | string | Distance in meters from user (provided by Kakao API when x,y sent) |
| distanceLabel | string | Formatted display string: "350m" or "1.2km" |

**Rules**:
- `distance` is raw meters string from API (e.g., "1234")
- `distanceLabel` is computed: < 1000m → "{n}m", ≥ 1000m → "{n.n}km"
- When user location unavailable, both fields are empty/undefined

### SearchCoordinates

User's current position used as search reference point.

| Field | Type | Description |
|-------|------|-------------|
| x | string | Longitude (Kakao API format) |
| y | string | Latitude (Kakao API format) |

**Rules**:
- Obtained from browser Geolocation API
- Undefined when permission denied or unavailable
- Used as center point for all Kakao API queries
- Not updated after initial search (position at search time)

## Relationships

```
User Search Query
  ↓ (matches trigger)
SearchExpansionEntry
  ↓ (produces terms[])
Multiple Kakao API Calls (parallel, with x/y/radius/sort=distance)
  ↓ (merge + deduplicate by id)
EnhancedKakaoPlace[] (sorted by distance ascending)
```

## No Database Changes

This feature is entirely client-side. No Supabase schema changes required.
- Expansion dictionary: static TypeScript module
- Distance data: comes from Kakao API response (not persisted)
- User coordinates: from browser Geolocation (not persisted)
