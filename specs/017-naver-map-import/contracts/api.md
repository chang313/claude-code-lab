# API Contracts: Naver Map Import

**Feature**: 017-naver-map-import
**Date**: 2026-02-22

## POST /api/import/naver

Server-side proxy that fetches Naver bookmark data for a public share link.

### Request

```typescript
{
  shareId: string;  // Naver share folder ID (alphanumeric)
}
```

### Response — Success (200)

```typescript
{
  bookmarks: Array<{
    displayname: string;
    px: number;
    py: number;
    address: string;
  }>;
  totalCount: number;
  folderName: string | null;
}
```

### Response — Error (400)

```typescript
{
  error: "INVALID_SHARE_ID";
  message: "유효하지 않은 공유 링크입니다.";
}
```

### Response — Error (403)

```typescript
{
  error: "PRIVATE_FOLDER";
  message: "비공개 폴더입니다. 공개 설정 후 다시 시도해주세요.";
}
```

### Response — Error (502)

```typescript
{
  error: "NAVER_UNAVAILABLE";
  message: "네이버 서비스에 일시적으로 연결할 수 없습니다. 잠시 후 다시 시도해주세요.";
}
```

### Validation Rules

- `shareId` must be alphanumeric string (1-100 chars)
- URL constructed from shareId must match `pages.map.naver.com` domain
- Response must contain `bookmarkList` array

---

## POST /api/import/save

Bulk-inserts parsed Naver bookmarks into the user's wishlist with duplicate detection.

### Request

```typescript
{
  shareId: string;
  sourceName: string;
  bookmarks: Array<{
    name: string;
    lat: number;
    lng: number;
    address: string;
  }>;
}
```

### Response — Success (200)

```typescript
{
  batchId: string;
  importedCount: number;
  skippedCount: number;
  invalidCount: number;
  totalCount: number;
}
```

### Response — Error (401)

```typescript
{
  error: "UNAUTHORIZED";
  message: "로그인이 필요합니다.";
}
```

### Validation Rules

- User must be authenticated (Supabase auth session)
- Each bookmark must have non-empty name, valid lat (-90 to 90), valid lng (-180 to 180)
- Maximum 1000 bookmarks per request

---

## POST /api/import/enrich

Triggers background enrichment for a specific import batch. Called after save completes.

### Request

```typescript
{
  batchId: string;
}
```

### Response — Success (202 Accepted)

```typescript
{
  status: "started";
  batchId: string;
}
```

### Notes

- Enrichment runs asynchronously — response returns immediately
- Each restaurant in the batch is looked up via Kakao Local API
- Results are written directly to the `restaurants` table (category, kakao_place_id, place_url)
- Throttled at ~10 requests/second to stay safely within Kakao free-tier rate limits (~30 req/s)
- If enrichment fails partway, already-enriched restaurants keep their data; batch status set to "failed"
- Can be re-triggered for failed/pending batches — skips already-enriched restaurants (those with non-synthetic kakao_place_id)
- Updates `import_batches.enrichment_status` and `enriched_count` as it progresses

---

## GET /api/import/history

Returns the user's import history.

### Response — Success (200)

```typescript
{
  batches: Array<{
    id: string;
    sourceName: string;
    importedCount: number;
    skippedCount: number;
    invalidCount: number;
    enrichmentStatus: "pending" | "running" | "completed" | "failed";
    enrichedCount: number;
    createdAt: string;
  }>;
}
```

---

## DELETE /api/import/batch/{batchId}

Undo an import batch — removes all unrated restaurants from the batch.

### Response — Success (200)

```typescript
{
  removedCount: number;
  preservedCount: number;  // rated restaurants that were kept
}
```

### Response — Error (404)

```typescript
{
  error: "BATCH_NOT_FOUND";
  message: "가져오기 기록을 찾을 수 없습니다.";
}
```
