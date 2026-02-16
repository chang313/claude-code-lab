# Research: Integrate Search & Map Tabs

**Date**: 2026-02-16 | **Branch**: `002-integrate-search-tabs`

## R1: Kakao Maps LatLngBounds for Auto-Fit

**Decision**: Use `kakao.maps.LatLngBounds` to compute bounding box of all result markers, then call `map.setBounds(bounds)` to auto-fit the map viewport.

**Rationale**: This is the standard Kakao Maps SDK approach for fitting multiple markers into view. The SDK provides `LatLngBounds.extend(LatLng)` to incrementally build the bounds, and `Map.setBounds(LatLngBounds)` to apply it. No additional libraries needed.

**Alternatives considered**:
- Manual zoom/center calculation: More complex, less accurate at edge cases, reinvents SDK functionality.
- Third-party fit-bounds utility: Unnecessary since Kakao SDK provides this natively.

**Implementation notes**:
- Add `LatLngBounds` to the `Window.kakao.maps` type declaration in MapView.tsx.
- Expose a new optional prop `fitBounds?: { lat: number; lng: number }[]` on MapView. When provided, compute LatLngBounds from the array and call `map.setBounds()`.

## R2: Bottom Sheet Without Library

**Decision**: Implement a custom draggable bottom sheet using CSS transforms and touch events. No external library.

**Rationale**: The bottom sheet needs only three states (hidden, peek, expanded). This is achievable with `touchstart`/`touchmove`/`touchend` events, CSS `transform: translateY()`, and `transition`. Adding a library (e.g., `react-spring`, `framer-motion`) would violate Constitution Principle V (Simplicity) since this is the only use case.

**Alternatives considered**:
- `framer-motion`: Full-featured animation library, but adds ~30KB to bundle for a single component. Violates Principle V.
- `@gorhom/bottom-sheet`: React Native library, not applicable to web.
- CSS-only snap points (`scroll-snap`): Insufficient for drag gesture control.

**Implementation notes**:
- Three snap positions: hidden (off-screen), peek (~30% of viewport showing 2-3 cards), expanded (~80% of viewport).
- Drag threshold: 50px movement decides whether to snap to next state.
- On desktop: mouse events as fallback (or simple scrollable panel at bottom).

## R3: SearchBar Trigger Change (Debounce → Explicit Submit)

**Decision**: Replace the current debounce-on-type behavior with explicit submit triggers: Enter key press and a visible search button tap.

**Rationale**: The spec requires search to trigger on Enter key or button press, not on every keystroke. This reduces unnecessary API calls, especially important when search results now also update the map. The debounce pattern is better suited for autocomplete/suggestions, not full search-with-map-update.

**Alternatives considered**:
- Keep debounce + add Enter/button: Would cause double-firing (debounce fires, then Enter fires). Confusing UX.
- Debounce with longer delay (1s+): Still fires unwanted searches mid-typing.

**Implementation notes**:
- Change SearchBar to use a `<form>` with `onSubmit` for Enter key handling.
- Add a search icon button inside the input field.
- Remove the `debounceMs` prop and `useEffect` debounce logic.
- New prop signature: `onSearch: (query: string) => void` (unchanged name, different trigger).

## R4: Map Route Removal Strategy

**Decision**: Delete the `/map` route entirely. No redirect.

**Rationale**: This is a personal app with no public URLs or SEO concern. The Map tab was only accessible via BottomNav, which will be updated simultaneously. No bookmarking or external linking to worry about.

**Alternatives considered**:
- Redirect `/map` → `/search`: Adds unnecessary middleware complexity for a non-public app.
- Keep `/map` as alias: Confusing to maintain two routes for the same page.
