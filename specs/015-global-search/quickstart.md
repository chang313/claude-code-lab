# Quickstart: Global Search Beyond Viewport

## What Changed

`smartSearch` now uses a **local-first with global fallback** strategy instead of always restricting results to a 5km radius.

## How It Works

1. User types a query → `smartSearch` is called
2. If user has location: search within 5km radius first
3. If 5+ results found locally → return them (same as before)
4. If <5 results found locally → re-search nationwide (no radius) → return global results
5. Map auto-fits to show all results (existing `fitBounds` behavior)

## Testing Locally

```bash
pnpm dev
```

1. **Specific query (global fallback)**: Search "산토리니" — should show results from Gangneung or wherever that restaurant exists, map pans there
2. **Generic query (local results)**: Search "치킨" — should show nearby chicken restaurants, map stays local
3. **Viewport re-search**: After global search moves map, pan slightly → "이 지역 검색" button should appear and work

## Key Files

| File | Change |
|------|--------|
| `src/lib/kakao.ts` | `smartSearch` fallback logic, `searchAllTerms` helper |
| `src/app/search/page.tsx` | Updated empty result message |
| `tests/unit/search-sort.test.ts` | Global fallback test cases |
