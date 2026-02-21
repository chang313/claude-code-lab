# Implementation Plan: Integrate Search & Map Tabs

**Branch**: `002-integrate-search-tabs` | **Date**: 2026-02-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-integrate-search-tabs/spec.md`

## Summary

Combine the separate Search (`/search`) and Map (`/map`) tabs into a single unified Search tab. The new page displays a search bar over a full-screen Kakao Map, with search results shown as map markers and in a draggable bottom sheet. The existing SearchBar, MapView, and RestaurantCard components will be modified and composed together. The Map tab will be removed from BottomNav, and the `/map` route deleted.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 15 (App Router), React 19, Tailwind CSS 4, Kakao Maps SDK, Kakao Local REST API
**Storage**: Supabase Postgres with RLS (via `@supabase/ssr`)
**Testing**: Vitest (unit), Playwright (e2e), Testing Library (component)
**Target Platform**: Mobile-first web (responsive)
**Project Type**: Web (Next.js App Router, single app)
**Performance Goals**: Search results visible within 2s of query submit; page interactive within 3s
**Constraints**: Must work with Kakao Maps `autoload=false`; mobile-first layout
**Scale/Scope**: Single page rewrite; modifies ~5 existing files, creates ~2 new components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Single responsibility maintained; SearchBar, MapView, BottomSheet are separate components |
| II. Testing Standards | PASS | Tests will be written before implementation (TDD per constitution); unit tests for components, integration for search+map flow |
| III. UX Consistency | PASS | Reuses existing component library (RestaurantCard, SearchBar); loading states within 200ms; consistent navigation patterns |
| IV. Performance | PASS | LCP target 2.5s; no new dependencies introduced; map lazy-loads via existing SDK mechanism |
| V. Simplicity | PASS | No new dependencies; reuses existing components; bottom sheet is a simple CSS/touch component, no library needed |
| Quality Gates | PASS | Pre-commit linting, PR tests, accessibility maintained |

No violations. Gate passes.

## Project Structure

### Documentation (this feature)

```text
specs/002-integrate-search-tabs/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/           # Phase 1 output (N/A — no new API endpoints)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── search/
│   │   └── page.tsx           # REWRITE — unified search + map page
│   └── map/
│       └── page.tsx           # DELETE — merged into /search
├── components/
│   ├── SearchBar.tsx          # MODIFY — add Enter key + button trigger (replace debounce)
│   ├── MapView.tsx            # MODIFY — add LatLngBounds auto-fit, make onBoundsChange optional
│   ├── BottomSheet.tsx        # CREATE — draggable bottom sheet overlay
│   ├── BottomNav.tsx          # MODIFY — remove Map tab
│   └── RestaurantCard.tsx     # NO CHANGE
├── lib/
│   └── kakao.ts               # NO CHANGE
├── db/
│   └── search-hooks.ts        # NO CHANGE
└── types/
    └── index.ts               # NO CHANGE
```

**Structure Decision**: Single Next.js app. No new directories needed. The feature modifies existing pages/components and adds one new component (BottomSheet).

## Constitution Re-Check (Post Phase 1 Design)

All principles still PASS after design phase:
- **No new dependencies** introduced (Principle V: Simplicity)
- **No new abstractions** beyond BottomSheet (which has a concrete, immediate use case)
- **LatLngBounds auto-fit** uses existing Kakao Maps SDK capability (no external library)
- **Bottom sheet** implemented with native touch events + CSS (no animation library)
- **Data model unchanged** — no new database tables or API endpoints
- **Bundle size impact**: Minimal — one new component (~2KB), modifications to existing components

## Complexity Tracking

No violations to justify. All design choices follow the simplest path.
