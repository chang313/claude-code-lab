# Data Model: Global Search Beyond Viewport

No data model changes required for this feature.

This feature modifies search behavior only (client-side logic in `src/lib/kakao.ts`). No new database tables, columns, indexes, or Supabase functions are needed. The existing `KakaoPlace` type and `KakaoSearchResponse` type remain unchanged.

## Constants Added

| Constant | Value | Location | Purpose |
|----------|-------|----------|---------|
| `LOCAL_MIN_RESULTS` | `5` | `src/lib/kakao.ts` | Threshold: if local search returns fewer results, fall back to global |
