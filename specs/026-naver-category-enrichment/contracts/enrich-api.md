# API Contracts: Enrichment Endpoints

**Feature**: 026-naver-category-enrichment
**Date**: 2026-02-23

## Modified: `POST /api/import/enrich`

Existing endpoint — no interface changes. Internal behavior changes:
- Enrichment pipeline now uses 300m radius (was 100m)
- Name matching now strips Korean suffixes before comparison
- After name-based pass, runs coordinate-based category fallback for unmatched restaurants
- Updates `categorized_count` on batch in addition to `enriched_count`

**Request** (unchanged):
```json
{ "batchId": "uuid" }
```

**Response** (unchanged):
```json
{ "status": "started", "batchId": "uuid" }
```
Status: `202 Accepted`

---

## New: `POST /api/import/re-enrich`

Retroactive re-enrichment for ALL uncategorized restaurants belonging to the current user. Not tied to a specific batch.

**Request**:
```json
{}
```
No body required — operates on all restaurants with empty category for the authenticated user.

**Response** (success):
```json
{
  "status": "started",
  "restaurantCount": 42
}
```
Status: `202 Accepted`

**Response** (no restaurants to enrich):
```json
{
  "status": "no_action",
  "restaurantCount": 0
}
```
Status: `200 OK`

**Response** (unauthorized):
```json
{
  "error": "UNAUTHORIZED",
  "message": "로그인이 필요합니다."
}
```
Status: `401`

**Behavior**:
1. Query `restaurants` where `category = ''` AND `user_id = current user`
2. If none found, return `200` with `no_action`
3. Otherwise, fire-and-forget: run improved enrichment pipeline on all results
4. Return `202` immediately with count of restaurants being processed

---

## Internal: Kakao Category Search (new function, not an API route)

New function `searchByCategory()` in `src/lib/kakao.ts`:

**Parameters**:
```typescript
{
  categoryGroupCode: "FD6" | "CE7",
  x: string,      // longitude
  y: string,      // latitude
  radius?: number, // meters (default 50)
  sort?: "distance" | "accuracy",
  size?: number,
}
```

**Returns**: `Promise<KakaoSearchResponse>` (same structure as keyword search)

**Kakao API endpoint**: `GET https://dapi.kakao.com/v2/local/search/category`
