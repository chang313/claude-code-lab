# Quickstart: 025-optimistic-tab-updates

## What Changed

`useSupabaseQuery` now implements stale-while-revalidate: it only shows `isLoading = true` on the initial fetch. During background revalidation (triggered by cache invalidation after mutations), the existing data remains visible.

## Files Modified

1. `src/lib/supabase/use-query.ts` — Added `hasDataRef` to track whether data has been loaded at least once. `setIsLoading(true)` is now conditional on `!hasDataRef.current`.

## How to Verify

1. Open the 맛집 tab with some saved restaurants
2. Tap a star to change a rating → list should NOT flash "로딩 중..."
3. Tap "위시리스트로" → item should move instantly without loading flash
4. Tap a star on a wishlist item → item should move to visited without loading flash
5. Tap "삭제" → item should disappear without loading flash
6. Refresh the page → initial "로딩 중..." should still appear as expected

## Running Tests

```bash
pnpm test
```
