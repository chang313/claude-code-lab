# Implementation Plan: Fix Bottom Sheet Scroll

**Branch**: `017-fix-bottomsheet-scroll` | **Date**: 2026-02-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/017-fix-bottomsheet-scroll/spec.md`

## Summary

Fix the BottomSheet component so users can scroll through all search results. Four bugs compound to hide content: (1) sheet `height: "100%"` resolves to 100vh causing content to overflow below the visible area, (2) inner scroll container calculates height from 100vh instead of the visible sheet portion, (3) `handleTouchMove` always uses "peek" state as drag base causing jumps from "expanded", (4) BottomNav z-index (40) is higher than BottomSheet (30) obscuring content. Fix all four by switching to `dvh`-based height with flexbox layout, using `currentTranslateY` ref for drag base, and correcting z-index layering.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16 (App Router), React 19, Tailwind CSS 4
**Storage**: N/A — no data changes
**Testing**: Vitest + React Testing Library (unit tests in `tests/unit/`)
**Target Platform**: Mobile-first web app (iOS Safari, Android Chrome)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: 60fps drag interaction, no layout thrashing
**Constraints**: Must work with `dvh` units for mobile browsers with dynamic toolbars
**Scale/Scope**: 2 files modified (BottomSheet.tsx, BottomNav.tsx), 1 test file added

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Bug fix to existing component. No new modules or dead code. |
| II. Testing Standards | PASS | New unit test for BottomSheet scroll container sizing and drag base calculation. Test-first. |
| III. UX Consistency | PASS | Fixes broken interaction — restores expected mobile bottom sheet behavior. No design system changes. |
| IV. Performance | PASS | Fixes layout thrash from incorrect height calc. Drag uses ref (no re-renders). No bundle size increase. |
| V. Simplicity | PASS | Minimal changes to existing code. No new abstractions or dependencies. |

All gates pass. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/017-fix-bottomsheet-scroll/
├── spec.md
├── plan.md              # This file
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── BottomSheet.tsx    # MODIFY: fix height, scroll container, and drag calculation
│   └── BottomNav.tsx      # MODIFY: lower z-index from z-40 to z-20
├── app/
│   └── search/page.tsx    # NO CHANGE

tests/
└── unit/
    └── bottomsheet.test.tsx  # NEW: test drag base logic
```

**Structure Decision**: Existing Next.js App Router structure. Two component files modified, one test file added.

## Design: Bug Fixes

### Bug 1 & 2 — Sheet height and scroll container overflow viewport (P1 critical)

**Current**: `height: "100%"` on a `position: fixed` element resolves to 100vh. The inner scroll container uses `height: calc(100% - 2.5rem)` which also resolves to ~100vh. In expanded state (`translateY(20%)`), content extends far below the viewport, hiding behind the BottomNav.

**Fix**: Switch the sheet to flexbox layout:
- Outer div: `height: 100dvh`, `display: flex`, `flex-direction: column`
- Handle div: fixed height (unchanged)
- Scroll container: `flex: 1`, `overflow-y: auto`, `min-height: 0` (flex-shrink context), `pb-20` (80px for BottomNav)

Using `100dvh` accounts for mobile browser dynamic toolbars. Using flexbox with `flex-1` on the scroll container means it automatically fills exactly the remaining visible space — no explicit `calc()` needed. The `translateY` push-down is already handled by the transform, so the visible portion of the `100dvh` sheet is exactly the area between the sheet top and the viewport bottom.

### Bug 3 — Drag base always uses "peek" position (P2)

**Current**: `handleTouchMove` calls `getTranslateY("peek")` hardcoded, so dragging from "expanded" state snaps the visual to 70% before following the finger.

**Fix**: Use `currentTranslateY.current` (already maintained by the useEffect) as the drag base:
```
// Before (broken):
const pct = parseFloat(getTranslateY("peek"));
const baseY = (window.innerHeight * pct) / 100;

// After (fixed):
const baseY = currentTranslateY.current;
```

### Bug 4 — Z-index layering (P3)

**Current**: BottomNav `z-40` > BottomSheet `z-30`. Nav renders on top of sheet content.

**Fix**: Lower BottomNav to `z-20`. BottomSheet at `z-30` correctly overlays the nav when expanded. The sheet's bottom padding (`pb-20`) ensures scrollable content stops above where the nav sits.

## Complexity Tracking

No violations — table not applicable.
