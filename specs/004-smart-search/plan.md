# Implementation Plan: Smart Search

**Branch**: `004-smart-search` | **Date**: 2026-02-17 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-smart-search/spec.md`

## Summary

Enhance the restaurant search to return semantically related results (e.g., "chicken" → KFC) and sort by distance from the user's current location. Uses Kakao API's native `sort=distance`, `radius`, and coordinate parameters combined with a static expansion dictionary that maps food categories to related search terms. Multiple parallel API queries are merged, deduplicated, and displayed with distance labels.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 15 (App Router), React 19, Tailwind CSS 4, Kakao Local REST API
**Storage**: N/A (no database changes — entirely client-side)
**Testing**: Manual testing + visual verification (existing project has no test framework set up)
**Target Platform**: Mobile-first web (modern browsers with Geolocation API)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Combined search completes within 3 seconds (SC-004); loading feedback within 200ms (Constitution III)
**Constraints**: Max 5 parallel API queries per search; 5km radius; 45 result cap
**Scale/Scope**: 12 food category expansions initially; single user, client-side only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | New modules have single responsibility; typed interfaces; no dead code |
| II. Testing Standards | PARTIAL | Project lacks test framework — tests will be manual verification against acceptance scenarios. Constitution requires tests before implementation but no test runner exists. |
| III. UX Consistency | PASS | Loading states within 200ms; distance labels follow existing card design; actionable empty states |
| IV. Performance | PASS | Parallel queries keep latency near single-query; API-side radius filtering; 45 result cap |
| V. Simplicity | PASS | Static dictionary (no ML/AI); native API params (no client-side distance calc); zero new dependencies |

**Gate result**: PASS with note on testing. Test-first approach will use manual acceptance test scenarios defined in spec. No new test framework introduced (Principle V — simplicity).

## Project Structure

### Documentation (this feature)

```text
specs/004-smart-search/
├── plan.md              # This file
├── research.md          # Phase 0: Kakao API research + expansion strategy
├── data-model.md        # Phase 1: Entity definitions
├── quickstart.md        # Phase 1: Build sequence
├── contracts/           # Phase 1: Module interface contracts
│   └── smart-search-api.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── kakao.ts                  # MODIFY: add radius/sort params + smartSearch function
│   ├── search-expansions.ts      # NEW: expansion dictionary + lookup
│   └── format-distance.ts        # NEW: distance formatting utility
├── app/
│   └── search/
│       └── page.tsx              # MODIFY: use smartSearch, pass coords, distance display
└── components/
    └── RestaurantCard.tsx         # MODIFY: add optional distance prop
```

**Structure Decision**: Existing Next.js App Router structure. New files follow established `src/lib/` pattern for utilities. No structural changes needed.

## Complexity Tracking

No constitution violations to justify. All design choices align with simplicity principle:
- Static dictionary instead of ML model
- Native API parameters instead of client-side computation
- Zero new dependencies
- 2 new files, 3 modified files
