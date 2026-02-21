# API Contract: Viewport Search

This feature does not introduce new HTTP endpoints. All changes are client-side. This document describes the internal function contracts.

## Modified Function: `searchByKeyword`

**File**: `src/lib/kakao.ts`

### Current Signature
```typescript
searchByKeyword(params: {
  query: string;
  page?: number;
  size?: number;
  x?: string;
  y?: string;
  radius?: number;
  sort?: "accuracy" | "distance";
}): Promise<KakaoSearchResponse>
```

### Updated Signature
```typescript
searchByKeyword(params: {
  query: string;
  page?: number;
  size?: number;
  x?: string;
  y?: string;
  radius?: number;
  rect?: string;  // NEW: "left_x,left_y,right_x,right_y"
  sort?: "accuracy" | "distance";
}): Promise<KakaoSearchResponse>
```

**Constraint**: `rect` and `x/y/radius` are mutually exclusive per Kakao API docs. When `rect` is provided, `x`, `y`, and `radius` are ignored.

## New Function: `viewportSearch`

**File**: `src/lib/kakao.ts`

```typescript
viewportSearch(params: {
  query: string;
  bounds: Bounds;
  userLocation?: { lat: number; lng: number };
}): Promise<KakaoPlace[]>
```

**Behavior**:
1. Expand query via `getExpandedTerms(query)` → up to 5 terms
2. For each term, fetch ALL pages using `rect` parameter:
   - Page 1 → check `meta.is_end`
   - If not end, fetch page 2, then page 3 (max 3 pages, 15 per page = 45 per term)
3. Combine all results across terms
4. Deduplicate by `kakao_place_id`
5. Sort by distance from `userLocation` if provided
6. Cap at 300 results
7. Return `KakaoPlace[]`

**Error behavior**: Throws on network/API error. Caller handles error display.

## New Component Contract: "Search this area" Button

**File**: `src/app/search/page.tsx` (or extracted component)

### Props (if extracted)
```typescript
interface SearchThisAreaButtonProps {
  visible: boolean;
  isLoading: boolean;
  onClick: () => void;
}
```

### Visibility Logic
```
visible = currentQuery !== null
       && lastSearchedBounds !== null
       && currentBounds !== null
       && !boundsEqual(lastSearchedBounds, currentBounds)
```

### Positioning
Floating overlay on the map, centered horizontally, near the top. Does not overlap with search bar or bottom sheet.

## Modified Callback: `MapView.onBoundsChange`

No signature change. Already emits `Bounds` on map idle. Search page now stores these bounds in state and uses them for comparison.
