# Quickstart: Adjust Map Icons to Circular Shape

## Overview

Replace teardrop map markers with smaller circular ones (20×20px) in `MapView.tsx`. Single-file change, no dependencies or migrations.

## Prerequisites

- Local dev environment running (`pnpm dev`)
- Kakao Maps SDK loaded (verify map renders at `http://localhost:3000`)

## Implementation Steps

### Step 1: Add `Point` Type Declaration

In `MapView.tsx`, add `Point` to the `window.kakao.maps` type declaration:

```typescript
Point: new (x: number, y: number) => KakaoPoint;
```

Add the corresponding interface:

```typescript
interface KakaoPoint {
  _brand: "KakaoPoint";
}
```

### Step 2: Replace SVG Definitions

Replace the `MARKER_SVGS` constant with circular SVGs using a 20×20 viewBox:

- **Search** (red circle + white dot): `<circle cx="10" cy="10" r="9" fill="#E74C3C"/>` + inner `<circle r="3"/>`
- **Wishlist** (blue circle + white heart): Same outer circle in blue + scaled heart path
- **Visited** (orange circle + white star): Same outer circle in orange + scaled star path

### Step 3: Update Marker Size and Anchor

Change the `MarkerImage` constructor call:

```typescript
// Before:
new window.kakao.maps.Size(28, 40)

// After:
new window.kakao.maps.Size(20, 20)
```

Add anchor point option:

```typescript
const markerImage = new window.kakao.maps.MarkerImage(
  getMarkerIconSrc(m.markerType),
  new window.kakao.maps.Size(20, 20),
  { offset: new window.kakao.maps.Point(10, 10) }
);
```

### Step 4: Verify

1. Run `pnpm dev` and search for restaurants in a dense area
2. Confirm markers are circular, smaller, and colors match (red/blue/orange)
3. Confirm tap opens info window correctly
4. Run `tsc --noEmit` and `pnpm test` to ensure no regressions

## Files Modified

| File | Change |
|------|--------|
| `src/components/MapView.tsx` | SVG definitions, marker size, anchor point, Point type |

## Verification Commands

```bash
tsc --noEmit        # Type check
pnpm build          # Build check
pnpm test           # Unit tests
```
