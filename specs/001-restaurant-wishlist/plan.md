# Implementation Plan: Restaurant Wishlist

**Branch**: `001-restaurant-wishlist` | **Date**: 2026-02-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-restaurant-wishlist/spec.md`

## Summary

A mobile-responsive web application for saving a personal restaurant
wishlist. Users search restaurants by name or discover them on an
interactive map, save them with a star rating (1–3), add menu item
memos, and browse saved restaurants grouped by menu item. Built with
Next.js, Kakao Maps/Local APIs, Dexie.js for offline-capable local
persistence, and Tailwind CSS for responsive mobile-first UI.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 15 (App Router), React 19, Tailwind CSS 4, Kakao Maps SDK, Kakao Local REST API, Dexie.js 4 (IndexedDB)
**Storage**: IndexedDB via Dexie.js (client-side only, no backend)
**Testing**: Vitest (unit), Playwright (E2E), React Testing Library (component)
**Target Platform**: Mobile web (responsive, browser-based, all devices)
**Project Type**: Single project (client-only web app, no backend)
**Performance Goals**: LCP < 2.5s, interaction feedback < 200ms, offline wishlist browsing
**Constraints**: Offline-capable for saved data, Kakao API key required for search/map, no server-side persistence
**Scale/Scope**: Single user, personal use, ~100–500 saved restaurants

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Code Quality | ESLint + Prettier configured; TypeScript strict mode; all public functions typed | PASS |
| II. Testing Standards | Vitest for unit (TDD), Playwright for E2E acceptance scenarios; tests before implementation | PASS |
| III. UX Consistency | Single design system via Tailwind CSS; loading/error states in all async flows; WCAG 2.1 AA | PASS |
| IV. Performance | LCP < 2.5s target; IndexedDB queries indexed on star rating + createdAt; bundle monitored | PASS |
| V. Simplicity | No backend (client-only); no auth; no abstraction layers beyond Dexie; single project structure | PASS |

All gates pass. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/001-restaurant-wishlist/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (internal module contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── app/                 # Next.js App Router pages
│   ├── layout.tsx       # Root layout (nav, providers)
│   ├── page.tsx         # Home / wishlist view
│   ├── search/
│   │   └── page.tsx     # Restaurant search page
│   ├── map/
│   │   └── page.tsx     # Map discovery page
│   ├── restaurant/
│   │   └── [id]/
│   │       └── page.tsx # Restaurant detail + menu items
│   └── by-menu/
│       ├── page.tsx     # Menu item list view
│       └── [menu]/
│           └── page.tsx # Restaurants for a specific menu
├── components/          # Shared UI components
│   ├── RestaurantCard.tsx
│   ├── StarRating.tsx
│   ├── SearchBar.tsx
│   ├── MenuItemList.tsx
│   ├── MapView.tsx
│   └── OfflineBanner.tsx
├── db/                  # Dexie.js database layer
│   ├── index.ts         # Database instance + schema
│   └── hooks.ts         # React hooks for DB operations
├── lib/                 # Utilities and API clients
│   ├── kakao.ts         # Kakao Local API client
│   └── normalize.ts     # Text normalization (case-insensitive)
└── types/               # Shared TypeScript types
    └── index.ts

tests/
├── unit/                # Vitest unit tests
├── integration/         # Vitest integration tests (DB layer)
└── e2e/                 # Playwright E2E tests
```

**Structure Decision**: Single project (client-only Next.js app). No
backend directory needed since all data persists in IndexedDB and
restaurant search uses Kakao APIs directly from the client.

## Complexity Tracking

> No constitution violations. Table intentionally left empty.
