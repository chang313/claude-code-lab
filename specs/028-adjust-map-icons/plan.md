# Implementation Plan: Adjust Map Icons to Circular Shape

**Branch**: `028-adjust-map-icons` | **Date**: 2026-02-23 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/028-adjust-map-icons/spec.md`

## Summary

Replace teardrop/pin map markers with smaller circular markers (20×20px) to reduce visual overlap in dense restaurant areas. All three marker types (search/wishlist/visited) retain their distinct colors and inner icons. The change is isolated to SVG definitions and marker image sizing in `MapView.tsx` — no data model, API, or logic changes.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16 (App Router), React 19, Kakao Maps SDK
**Storage**: N/A (no data model changes)
**Testing**: Vitest + @testing-library/react
**Target Platform**: Mobile-first web (all modern browsers)
**Project Type**: Web application (Next.js)
**Performance Goals**: No performance impact — SVG data URIs remain the same encoding, only content changes
**Constraints**: Markers must remain visually identifiable at 20×20px on mobile screens (min ~44px logical tap target via Kakao SDK's built-in hit area)
**Scale/Scope**: Single file change (MapView.tsx), ~20 lines modified

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Single-responsibility change; no dead code introduced |
| II. Testing Standards | PASS | Existing unit tests cover merge logic (unaffected); SVG constants are visual — tested via manual inspection |
| III. UX Consistency | PASS | Markers follow same color/icon scheme; circular shape is a consistent improvement across all types |
| IV. Performance | PASS | No bundle size change; SVG data URIs are similar size |
| V. Simplicity | PASS | Minimal change — only SVG strings and Size constructor args |

No violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/028-adjust-map-icons/
├── plan.md              # This file
├── research.md          # Phase 0: Kakao Maps marker anchor research
├── data-model.md        # Phase 1: N/A (no data changes)
├── quickstart.md        # Phase 1: Implementation quickstart
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
└── components/
    └── MapView.tsx        # MODIFY: SVG definitions + marker Size

tests/
└── unit/
    └── saved-markers-hooks.test.ts  # VERIFY: existing tests still pass (no changes needed)
```

**Structure Decision**: Single file modification in existing Next.js web app structure. No new files, directories, or dependencies needed.
