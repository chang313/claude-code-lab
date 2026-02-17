# Implementation Plan: Remove Map Tab

**Branch**: `005-remove-map-tab` | **Date**: 2026-02-17 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-remove-map-tab/spec.md`

## Summary

Remove the standalone Map tab from the bottom navigation and delete its associated page/code. Add a redirect from `/map` to `/search` for backward compatibility. The Search page already provides full map functionality (full-screen map, markers, bottom sheet results).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 15 (App Router), React 19, Tailwind CSS 4
**Storage**: N/A (no data changes)
**Testing**: Manual verification + build check
**Target Platform**: Mobile-first web (responsive)
**Project Type**: Web (Next.js App Router — single project)
**Performance Goals**: No regression from current behavior
**Constraints**: Must preserve Search page functionality, must redirect `/map` to `/search`
**Scale/Scope**: 3 files modified, 2 files deleted, 1 file created

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Dead code removal (FR-004), single responsibility maintained |
| II. Testing Standards | PASS | Build verification sufficient for deletion feature; no new logic introduced |
| III. UX Consistency | PASS | Navigation remains consistent; 3-tab layout is standard mobile pattern |
| IV. Performance | PASS | Removing code reduces bundle size; no new code paths |
| V. Simplicity | PASS | Pure subtraction — simplest possible change |

## Project Structure

### Documentation (this feature)

```text
specs/005-remove-map-tab/
├── spec.md
├── plan.md              # This file
├── tasks.md             # Task list
└── checklists/
    └── requirements.md
```

### Source Code Changes

```text
src/
├── app/
│   ├── map/
│   │   └── page.tsx         # DELETE — standalone Map page
│   └── search/
│       └── page.tsx         # NO CHANGES — already has full map
├── components/
│   ├── BottomNav.tsx        # MODIFY — remove Map tab entry
│   └── MapView.tsx          # NO CHANGES — still used by Search
└── lib/
    └── kakao.ts             # MODIFY — remove searchByBounds (dead code)

next.config.ts               # MODIFY — add /map → /search redirect
```

## Complexity Tracking

No constitution violations. Pure deletion feature — no new abstractions or dependencies.
