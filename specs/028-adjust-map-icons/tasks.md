# Tasks: Adjust Map Icons to Circular Shape

**Input**: Design documents from `/specs/028-adjust-map-icons/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: Not explicitly requested in spec. Existing unit tests (`tests/unit/saved-markers-hooks.test.ts`) cover merge logic and are unaffected by this visual change.

**Organization**: Tasks are grouped by user story. Since all three stories are satisfied by changes to the same file (`src/components/MapView.tsx`), the stories are implemented sequentially with each building on the previous.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Type Declaration)

**Purpose**: Add the `KakaoPoint` type needed for marker anchor positioning

- [x] T001 Add `KakaoPoint` interface and `Point` constructor to the `declare global` block in `src/components/MapView.tsx`

**Details for T001**:
- Add `interface KakaoPoint { _brand: "KakaoPoint"; }` alongside existing Kakao interfaces
- Add `Point: new (x: number, y: number) => KakaoPoint;` to the `window.kakao.maps` type declaration
- Update the `MarkerImage` constructor type to accept an optional third `options` parameter: `MarkerImage: new (src: string, size: KakaoSize, options?: { offset: KakaoPoint }) => KakaoMarkerImage;`

---

## Phase 2: User Story 1 - Distinguish Nearby Restaurants (Priority: P1) 🎯 MVP

**Goal**: Replace teardrop markers with smaller circular markers so nearby restaurants are visually distinguishable

**Independent Test**: Search for restaurants in a dense area (e.g., 강남역 맛집) and verify markers are circular, smaller, and don't overlap as much as before

### Implementation for User Story 1

- [x] T002 [US1] Replace `MARKER_SVGS.search` with circular SVG (20×20 viewBox, red circle `#E74C3C` + white dot) in `src/components/MapView.tsx`
- [x] T003 [US1] Replace `MARKER_SVGS.wishlist` with circular SVG (20×20 viewBox, blue circle `#3498DB` + white heart) in `src/components/MapView.tsx`
- [x] T004 [US1] Replace `MARKER_SVGS.visited` with circular SVG (20×20 viewBox, orange circle `#F39C12` + white star) in `src/components/MapView.tsx`
- [x] T005 [US1] Update `MarkerImage` constructor: change `Size(28, 40)` to `Size(20, 20)` and add `offset: Point(10, 10)` anchor in `src/components/MapView.tsx`

**Details for T002-T004**:
- Each SVG uses viewBox `0 0 20 20`
- Outer circle: `<circle cx="10" cy="10" r="9" fill="COLOR"/>`
- Inner icons scaled to fit inside 9px radius:
  - Search: `<circle cx="10" cy="10" r="3" fill="white"/>`
  - Wishlist: Scaled heart path centered at (10, 10)
  - Visited: Scaled star path centered at (10, 10)
- Keep the `.join("")` array pattern and `btoa()` encoding — no change to encoding approach

**Details for T005**:
- In the `markers.forEach` loop (~line 200), update the MarkerImage creation:
  ```
  const markerImage = new window.kakao.maps.MarkerImage(
    getMarkerIconSrc(m.markerType),
    new window.kakao.maps.Size(20, 20),
    { offset: new window.kakao.maps.Point(10, 10) }
  );
  ```
- This centers the circle on the geographic coordinate instead of bottom-anchoring a teardrop

**Checkpoint**: Markers should now render as small colored circles on the map. US1 acceptance scenarios testable.

---

## Phase 3: User Story 2 - Identify Marker Types at a Glance (Priority: P2)

**Goal**: Verify all three marker types remain visually distinct with their unique colors and inner icons

**Independent Test**: Load a map with search, wishlist, and visited markers present — verify red/dot, blue/heart, orange/star are all recognizable

### Implementation for User Story 2

> US2 is fully satisfied by the T002–T004 SVG replacements in Phase 2. No additional code changes needed — the three marker types retain their distinct colors (#E74C3C, #3498DB, #F39C12) and inner icons (dot, heart, star) in the new circular design.

- [x] T006 [US2] Visual verification: confirm all three marker types are distinguishable on the map (red/dot for search, blue/heart for wishlist, orange/star for visited)

**Checkpoint**: All three marker types visually distinct. US2 acceptance scenarios testable.

---

## Phase 4: User Story 3 - Tap Circular Marker to View Details (Priority: P2)

**Goal**: Verify that tapping circular markers still opens info windows correctly

**Independent Test**: Tap markers on mobile/desktop and verify info windows open with correct restaurant name and status

### Implementation for User Story 3

> US3 is fully satisfied by T005 (anchor point update). The `MarkerImage` with centered anchor ensures click events fire correctly. Info window content (`statusHtml`, `infoContent`) is unchanged.

- [x] T007 [US3] Interaction verification: confirm tapping a circular marker opens the info window with correct restaurant name and status

**Checkpoint**: Marker tap interaction works correctly. US3 acceptance scenarios testable.

---

## Phase 5: Polish & Verification

**Purpose**: Final validation across all stories

- [x] T008 Run `tsc --noEmit` to verify TypeScript compilation passes
- [x] T009 Run `pnpm build` to verify production build succeeds
- [x] T010 Run `pnpm test` to verify existing unit tests pass (merge-markers, isInViewport)
- [x] T011 Clear `markerIconCache` concern: verify no stale cache by hard-refreshing browser after code change

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — add type declarations first
- **US1 (Phase 2)**: Depends on Phase 1 (needs `KakaoPoint` type for T005)
- **US2 (Phase 3)**: Depends on Phase 2 (visual verification of T002-T004 output)
- **US3 (Phase 4)**: Depends on Phase 2 (interaction verification of T005 output)
- **Polish (Phase 5)**: Depends on all previous phases

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Setup — core implementation
- **User Story 2 (P2)**: Verification only — no code beyond US1 changes
- **User Story 3 (P2)**: Verification only — no code beyond US1 changes

### Within Each Phase

- T002, T003, T004 are independent SVG replacements in the same file but different constant keys — they CANNOT run in parallel (same file edits)
- T005 depends on T002-T004 being complete (needs the circular SVGs to render correctly with the new size)
- T008, T009, T010 can run sequentially as a single verification pass

### Parallel Opportunities

- Limited parallelism due to single-file scope
- T006 and T007 (visual/interaction verification) can run in parallel after Phase 2
- T008-T010 run sequentially (verification gates: type check → build → test)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Add `KakaoPoint` type (T001)
2. Complete Phase 2: Replace SVGs + update size/anchor (T002-T005)
3. **STOP and VALIDATE**: Visual check on local dev — markers are circular and distinguishable
4. Ready to deploy after verification (Phase 5)

### Full Delivery (Recommended — feature is small)

1. T001 → T002 → T003 → T004 → T005 (sequential, same file)
2. T006 + T007 (visual + interaction verification)
3. T008 → T009 → T010 → T011 (verification gates)
4. Done — commit and push

---

## Notes

- All code changes are in a single file: `src/components/MapView.tsx`
- No new files, dependencies, migrations, or API changes
- Verification tasks (T006, T007) are manual visual/interaction checks
- If 20×20px markers prove too small during verification, fallback to 24×24px (update SVG viewBox to `0 0 24 24`, circle `r="11"` center `(12,12)`, Size/Point to `24,24`/`12,12`)
- Commit after T005 (all code changes) then after T010 (verification passes)
