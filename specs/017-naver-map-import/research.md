# Research: Naver Map Import

**Feature**: 017-naver-map-import
**Date**: 2026-02-22

## R-001: Naver Bookmark API Endpoint & Response Shape

**Decision**: Use Naver's undocumented public share bookmark API at `pages.map.naver.com`.

**Rationale**: No official Naver API exists for user bookmarks. The public share endpoint works without authentication for folders the user has set to "공개" (public). Community-documented and widely used.

**API flow**:
1. User shares a folder → produces a URL containing a `shareId`
2. Fetch folders: `GET https://pages.map.naver.com/save-pages/api/maps-bookmark/v3/folders?start=0&limit=20&sort=lastUseTime&folderType=all` (requires Naver session cookies — NOT used in our flow)
3. Fetch public bookmarks: `GET https://pages.map.naver.com/save-pages/api/maps-bookmark/v3/shares/{shareId}/bookmarks?start=0&limit=5000&sort=lastUseTime` (NO auth required for public folders)

**Response shape** (from community research):
```json
{
  "bookmarkList": [
    {
      "displayname": "장소명",
      "px": 127.0276,
      "py": 37.4979,
      "address": "서울특별시 강남구 ...",
      "name": "장소명"
    }
  ]
}
```

Key fields: `displayname` (place name), `px` (longitude), `py` (latitude), `address` (street address). Additional fields may include closure status but this is not guaranteed.

**Alternatives considered**:
- Naver Cloud Platform Maps API: Only provides geocoding/directions, not user bookmarks
- Web scraping: Fragile, ethically questionable, blocked by bot detection
- Chrome extension: High maintenance burden, out of scope

**Risks**: Undocumented API can break without notice. Mitigation: validate response shape at parse time, show graceful degradation message.

---

## R-002: Share Link URL Format & shareId Extraction

**Decision**: Extract `shareId` from user-pasted URL or raw shareId string.

**Rationale**: The share link format from Naver Map uses a short URL (`naver.me/xxx`) that redirects to a page containing the shareId. However, users may also directly copy the shareId from the folder API or share link.

**Known URL patterns**:
- Direct: `https://naver.me/{shortCode}` — requires following redirect to extract shareId
- Full: the share page embeds the shareId in the URL path or API call

**Approach**: Accept the shareId directly (guide users to copy it) rather than following redirect chains from short URLs. This is simpler and avoids CORS/redirect issues.

**Alternatives considered**:
- Follow naver.me redirects server-side: Adds complexity, redirect chain may change
- Regex extraction from various URL formats: Fragile across format changes

---

## R-003: Kakao Local API for Enrichment

**Decision**: Use Kakao Local keyword search endpoint for cross-referencing.

**Rationale**: The app already uses `searchByKeyword` in `src/lib/kakao.ts`. For enrichment, search by restaurant name with coordinates (x/y) to find the closest match.

**Endpoint**: `GET https://dapi.kakao.com/v2/local/search/keyword?query={name}&x={lng}&y={lat}&radius=100&sort=accuracy`

**Match criteria**:
- Distance: match must be within 100m of Naver coordinates
- Name: Kakao result's `place_name` must be a substring match or have high similarity to Naver's `displayname`

**Rate limits**: Kakao REST API allows ~30 req/sec for free tier. For 500 bookmarks: ~17 seconds with no throttling. With 100ms delay between requests: ~50 seconds. Background processing makes this acceptable.

**Alternatives considered**:
- Kakao category search: Doesn't take a name, returns too many results
- Batch lookup: Kakao has no batch API — must be sequential
- Skip enrichment entirely: Categories are important for the app's grouping UX

---

## R-004: Duplicate Detection Strategy

**Decision**: Use name + coordinate proximity (Haversine distance < 50m) for duplicate detection.

**Rationale**: Naver bookmarks don't have Kakao place IDs, so exact ID matching is impossible. Name + proximity is the most reliable heuristic. 50m threshold accounts for slight coordinate differences between Naver and Kakao for the same physical location.

**Implementation**: Query existing restaurants for the user, compute Haversine distance in application code. For large lists, pre-filter by bounding box (lat ± 0.001, lng ± 0.001 ≈ ~111m) to reduce comparison set.

**Alternatives considered**:
- Name-only matching: Too many false positives (common chain names)
- Exact coordinate matching: Different sources report slightly different coordinates
- PostGIS spatial query: Adds dependency; simple Haversine is sufficient at this scale

---

## R-005: Server-Side Fetch Architecture

**Decision**: Use a Next.js API route (`/api/import/naver`) as a server-side proxy to fetch from Naver's endpoint.

**Rationale**: Client-side fetch to `pages.map.naver.com` would be blocked by CORS. A server-side route acts as a proxy, validates the URL domain pattern (SSRF prevention), fetches the data, and returns it to the client.

**Flow**:
1. Client sends `POST /api/import/naver` with `{ shareId: string }`
2. API route validates shareId format (alphanumeric, reasonable length)
3. API route constructs the Naver URL and fetches
4. API route validates response shape (has `bookmarkList` array)
5. Returns parsed bookmarks to client

**Alternatives considered**:
- Direct client fetch: Blocked by CORS
- Supabase Edge Function: Additional infrastructure; Next.js API route is simpler
- Server Action: Possible but API route is more explicit and testable

---

## R-006: Import Batch Tracking Schema

**Decision**: Add an `import_batches` table and a nullable `import_batch_id` FK to the `restaurants` table.

**Rationale**: FR-011 requires batch tracking for history and undo. A separate table cleanly separates import metadata (source, timestamp, count) from restaurant data. The FK on restaurants enables batch undo via `DELETE WHERE import_batch_id = ?`.

**Schema**:
- `import_batches`: id (uuid), user_id (FK), source_name (text), imported_count (int), created_at (timestamptz)
- `restaurants`: add `import_batch_id` (uuid, nullable, FK to import_batches)

The nullable FK means existing restaurants (added via search) have `NULL` for `import_batch_id`, maintaining backward compatibility.

**Alternatives considered**:
- Tags/labels on restaurants: More generic but overengineered for this use case
- Separate import history table with restaurant ID array: Denormalized, hard to undo
- Timestamp-based grouping: Imprecise, doesn't handle concurrent imports
