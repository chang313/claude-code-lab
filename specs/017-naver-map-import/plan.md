# Implementation Plan: Naver Map Import

**Branch**: `017-naver-map-import` | **Date**: 2026-02-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/017-naver-map-import/spec.md`

## Summary

Import restaurants from Naver Map's 찜 리스트 into the app's wishlist via public share link. A server-side API route proxies the fetch from Naver's undocumented bookmark endpoint, parses the response, performs duplicate detection via Haversine distance, and bulk-inserts into Supabase. Asynchronous enrichment cross-references each imported place against Kakao Local API to fill in category and Kakao place data. Import batches are tracked for history and batch undo.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16 (App Router), React 19, Supabase (@supabase/ssr), Kakao Local REST API, Tailwind CSS 4
**Storage**: Supabase Postgres with RLS — new `import_batches` table + `import_batch_id` FK on `restaurants`
**Testing**: Vitest + React Testing Library (unit tests only, no E2E)
**Target Platform**: Mobile-first web (responsive, works on all modern browsers)
**Project Type**: Web application (single Next.js project with API routes)
**Performance Goals**: Import of 100 bookmarks in <60s; enrichment of 500 bookmarks in <5 min background
**Constraints**: Naver API undocumented (may break); Kakao rate limit ~30 req/s; max 1,000 bookmarks per Naver folder
**Scale/Scope**: Single user per import session; typical import: 50-200 bookmarks

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Single responsibility: separate modules for Naver parsing, enrichment, import hooks, API routes |
| II. Testing Standards | PASS | Unit tests for parser, haversine, enrichment matching, hooks. Tests written before implementation. |
| III. UX Consistency | PASS | Korean error messages, loading/progress states, consistent with existing mobile-first UI |
| IV. Performance | PASS | Import <60s for 100 items; enrichment async; partial index for batch lookups |
| V. Simplicity | PASS | No new dependencies; reuses existing Kakao API client; simple API routes over Edge Functions |

**Pre-Phase 0 Gate**: PASSED — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/017-naver-map-import/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.md           # REST API contracts
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   └── import/
│   │       ├── naver/route.ts        # Proxy fetch from Naver
│   │       ├── save/route.ts         # Bulk insert with duplicate detection
│   │       ├── enrich/route.ts       # Trigger async Kakao enrichment
│   │       ├── history/route.ts      # List import batches
│   │       └── batch/[id]/route.ts   # Batch undo (DELETE)
│   └── my/
│       └── import/
│           └── page.tsx              # Import UI page
├── components/
│   ├── ImportGuide.tsx               # Step-by-step Naver guide
│   ├── ImportProgress.tsx            # Progress indicator
│   └── ImportHistory.tsx             # History list + undo
├── db/
│   └── import-hooks.ts              # Client-side import hooks
├── lib/
│   ├── naver.ts                     # Naver parser + shareId validation
│   ├── enrichment.ts                # Kakao cross-reference logic
│   └── haversine.ts                 # Distance calculation utility
└── types/
    └── index.ts                     # + NaverBookmark types

tests/
└── unit/
    ├── naver-import.test.ts          # Parser + validation
    ├── haversine.test.ts             # Distance calculation
    ├── enrichment.test.ts            # Enrichment matching
    └── import-hooks.test.ts          # Hook tests
```

**Structure Decision**: Follows the existing single Next.js project structure. API routes are new to this project (first feature to use them), placed at `src/app/api/import/` following Next.js App Router convention. Client hooks follow the existing `src/db/*.ts` pattern. Utility libraries follow `src/lib/*.ts` pattern.

## Constitution Re-Check (Post-Design)

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Clear separation: naver.ts (parsing), haversine.ts (math), enrichment.ts (matching), import-hooks.ts (state) |
| II. Testing Standards | PASS | 4 test files covering parser, distance, enrichment, hooks. TDD approach per constitution. |
| III. UX Consistency | PASS | Import page follows existing layout pattern (max-w-lg, px-4, pb-24). Korean strings throughout. |
| IV. Performance | PASS | Haversine pre-filter reduces comparison set. Enrichment throttled. Partial DB index for batch ops. |
| V. Simplicity | PASS | No new npm dependencies. Reuses existing Supabase client + Kakao API. Standard Next.js API routes. |

**Post-Design Gate**: PASSED — no violations.

## Complexity Tracking

> No constitution violations requiring justification. All complexity is essential to the feature requirements.
