# Quickstart: Search Add & Sort

**Feature**: `013-search-add-sort`
**Date**: 2026-02-21

## What This Feature Does

1. **Star Rating on Add** — When tapping a map marker, the detail card now shows a 1-3 star selector. Users can rate the restaurant before adding it to their wishlist.
2. **Relevance Sort** — Search results (both keyword and viewport) are now sorted by relevance (best match) instead of distance. Distance labels remain visible as supplementary info.
3. **Add from Map** — Already works. No changes needed to existing marker detail card add flow.

## Files Modified

| File | Change |
|------|--------|
| `src/lib/kakao.ts` | `sort: "distance"` → `sort: "accuracy"` in smartSearch and viewportSearch. Update deduplicateAndSort to preserve insertion order. |
| `src/app/search/page.tsx` | Add `selectedRating` state. Render StarSelector in detail card. Pass rating to handleAdd. Reset rating on marker change. |
| `src/components/StarSelector.tsx` | New component: compact 1-3 star selector for inline use. |

## How to Test Locally

```bash
git checkout 013-search-add-sort
pnpm install
pnpm dev
```

1. Open http://localhost:3000/search
2. Search for "치킨" (chicken)
3. Verify results are sorted by relevance (best match first, not nearest first)
4. Verify distance labels still appear on each result
5. Tap a map marker → detail card appears
6. Verify star selector (1-3) is visible with default of 1
7. Select 3 stars → tap "+ 맛집 추가"
8. Go to 맛집 tab → verify restaurant appears with 3-star rating
9. Go back to search → tap same marker → verify "✓ 저장됨" state shows
10. Try "이 지역 검색" (viewport search) → verify results are also sorted by relevance

## Automated Tests

```bash
pnpm test                           # Run all tests
pnpm test tests/unit/search-sort    # Sort behavior tests
pnpm test tests/unit/star-selector  # Star selector tests
```

## No Database Migration Needed

This feature only changes client-side behavior. No Supabase SQL required.
