# Quickstart: Optimistic Updates & Star Rating Bug Fix

**Feature**: 022-optimistic-updates
**Date**: 2026-02-22

## Prerequisites

1. **Database migration**: Apply the CHECK constraint fix in Supabase SQL Editor BEFORE testing:
   ```sql
   ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_star_rating_check;
   ALTER TABLE restaurants ADD CONSTRAINT restaurants_star_rating_check
     CHECK (star_rating IS NULL OR (star_rating >= 1 AND star_rating <= 5));
   ```

2. **Dev environment**: `pnpm install && pnpm dev`

## Verification Steps

### 1. Star Rating Bug Fix (P1)

1. Open the app at `http://localhost:3000`
2. Navigate to a visited restaurant
3. Tap the 4th star → verify it turns yellow
4. Tap the 5th star → verify it turns yellow
5. Refresh the page → verify the 5-star rating persists
6. Check the detail page → verify it shows 5 stars

### 2. Optimistic Updates (P2-P3)

1. Open browser DevTools → Network tab
2. Tap a star on a visited card → observe:
   - Stars change color INSTANTLY (before network response)
   - No loading spinner appears
   - Network request fires in background
3. Promote a wishlist item (tap a star on wishlist card) → observe:
   - Card moves from wishlist to visited section immediately
4. Delete a visited item → observe:
   - Card disappears immediately
5. Move a visited item to wishlist → observe:
   - Card moves sections immediately

### 3. Error Rollback

1. Simulate error: temporarily disable network (DevTools → Offline)
2. Tap a star → observe instant update
3. Wait for timeout → observe stars revert to previous value + error toast appears
4. Re-enable network → tap star again → should succeed

## Key Files Changed

| File | Change Type | What Changed |
|------|-------------|-------------|
| `src/lib/supabase/invalidate.ts` | Modified | Added `getCache()`, `setCache()`, `subscribeToCache()` |
| `src/lib/supabase/use-query.ts` | Modified | Subscribe to cache set events |
| `src/db/hooks.ts` | Modified | Optimistic update logic in 4 mutation hooks |
| `src/app/page.tsx` | Modified | Error handling for mutation callbacks |
| `src/app/restaurant/[id]/page.tsx` | Modified | Error handling for star update |
| `tests/unit/optimistic-updates.test.ts` | New | Optimistic update + rollback tests |

## Running Tests

```bash
pnpm test
```

Tests cover:
- Star rating 4/5 persistence
- Optimistic cache write → UI update
- Error rollback → cache restore
- Rapid successive mutations (last-write-wins)
