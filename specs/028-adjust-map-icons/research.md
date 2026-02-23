# Research: Adjust Map Icons to Circular Shape

## R1: Kakao Maps MarkerImage Anchor Point Behavior

**Decision**: Use centered anchor point `(10, 10)` for 20×20px circular markers.

**Rationale**: The Kakao Maps `MarkerImage` constructor accepts an optional third argument for `options` including `offset` (anchor point). The current teardrop markers implicitly use the default anchor at bottom-center of the image, which places the pin tip on the coordinate. For circular markers, the anchor must be explicitly set to the center of the circle `(width/2, height/2)` so the marker visually sits on top of the coordinate.

The `MarkerImage` constructor signature:
```
new kakao.maps.MarkerImage(src, size, options?)
```
Where `options` can include:
- `offset`: `new kakao.maps.Point(x, y)` — the point in the image that corresponds to the marker's position on the map.

**Alternatives considered**:
- Keep default anchor (bottom-center): Would place the circle below the actual coordinate — incorrect for circles.
- Use `CustomOverlay` instead of `Marker`: More flexible but overkill for this change; requires manual click handling and z-index management.

## R2: Circular SVG Design at 20×20px

**Decision**: Use a simple `<circle>` element as the marker body with a scaled-down inner icon.

**Rationale**: At 20×20px, the viewBox is `0 0 20 20`. The outer circle fills most of the space (`r="9"` centered at `10,10`), leaving room for a 1px implicit border via the background. The inner icons scale proportionally:
- **Search**: White dot — `<circle cx="10" cy="10" r="3" fill="white"/>`
- **Wishlist**: White heart — scaled heart path centered at `(10, 10)`
- **Visited**: White star — scaled star path centered at `(10, 10)`

**Alternatives considered**:
- 24×24px size: Viable fallback if 20px proves too small during testing, but 20px is preferred for maximum density improvement.
- PNG sprites instead of SVG: Worse for high-DPI; SVG scales cleanly.
- Emoji markers: Inconsistent across platforms; not professional.

## R3: Tap Target Size on Mobile

**Decision**: Rely on Kakao Maps SDK's built-in marker hit testing, which uses the full marker image bounds regardless of visual content.

**Rationale**: The Kakao Maps SDK marker click events use the image's bounding box for hit detection. A 20×20px SVG image provides a 20×20px tap target. While this is below the iOS HIG recommended 44×44pt, in practice:
1. Map markers on all major map apps (Google Maps, Apple Maps, Naver Maps) use similar or smaller visual sizes.
2. The Kakao SDK's internal hit-testing may extend beyond the image bounds.
3. Users are accustomed to tapping small map elements and pinch-zooming for precision.

If tap reliability degrades, the fallback is to increase marker size to 24×24px without changing the circular shape.

**Alternatives considered**:
- Transparent padding in SVG (e.g., 44×44 viewBox with 20px visible circle): Wastes space and makes anchor calculation less intuitive.
- CustomOverlay with larger hit area: Overengineered for this change.

## R4: Marker Icon Cache Invalidation

**Decision**: No changes needed to the caching mechanism.

**Rationale**: The existing `markerIconCache` in `MapView.tsx` lazily builds base64 data URIs on first access. Since we're only changing the SVG content strings in `MARKER_SVGS`, the cache will naturally produce the new circular icons. The cache is a module-level singleton — no stale data risk since it initializes once per page load.

## R5: Impact on the `Point` Type Declaration

**Decision**: Add `Point` constructor to the `Window.kakao.maps` type declaration in `MapView.tsx`.

**Rationale**: The current global type declaration for `window.kakao.maps` does not include `Point`. To set the marker anchor offset, we need `new kakao.maps.Point(x, y)`. This requires adding the type to the existing `declare global` block.
