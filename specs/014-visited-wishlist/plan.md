# Implementation Plan: Visited & Wishlist Split

**Branch**: `014-visited-wishlist` | **Date**: 2026-02-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/014-visited-wishlist/spec.md`

## Summary

Split the single restaurant list into two groups — "맛집 리스트" (visited, rated 1-3 stars) and "위시 리스트" (wishlist, no rating). The approach uses nullable `star_rating` as the single source of truth: `NULL` = wishlist, `1-3` = visited. No new database columns needed; existing data (all rated) automatically becomes "visited." UI changes: two-section main tab, dual add buttons on search, distinct saved indicators (♡/★).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16 (App Router), React 19, Tailwind CSS 4, @supabase/ssr
**Storage**: Supabase Postgres with RLS (table: `restaurants`)
**Testing**: Vitest (unit tests in `tests/unit/`)
**Target Platform**: Mobile-first web (responsive)
**Project Type**: Web application (Next.js monolith)
**Performance Goals**: UI updates < 2 seconds (SC-005), LCP < 2.5s (Constitution IV)
**Constraints**: No new dependencies, no new tables, backward-compatible migration
**Scale/Scope**: ~10 files modified, 2 new hooks, 1 DB migration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Single responsibility maintained — hooks split by concern, no dead code |
| II. Testing Standards | PASS | Unit tests for all new hooks and component variants planned |
| III. UX Consistency | PASS | Reuses existing CategoryAccordion, StarRating, RestaurantCard components |
| IV. Performance | PASS | No new queries — existing queries gain WHERE filter (faster, not slower) |
| V. Simplicity | PASS | Nullable column approach = simplest possible. No new tables/columns |

**Post-Phase 1 re-check**: PASS — No violations introduced. Data model uses single nullable column (simplest). No new dependencies added.

## Project Structure

### Documentation (this feature)

```text
specs/014-visited-wishlist/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0: design decisions
├── data-model.md        # Phase 1: schema changes + migration SQL
├── quickstart.md        # Phase 1: implementation guide
├── contracts/
│   └── supabase-queries.md  # Phase 1: hook → query mapping
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (files to modify)

```text
src/
├── types/
│   └── index.ts              # Restaurant.starRating: number | null
├── db/
│   ├── hooks.ts              # Split queries, new hooks, default null
│   ├── recommendation-hooks.ts  # Accept → wishlist (star_rating: null)
│   └── profile-hooks.ts      # Filtered profile queries
├── components/
│   ├── StarRating.tsx         # Handle null value (empty star affordance)
│   ├── RestaurantCard.tsx     # Conditional stars, ♡/★ indicators
│   └── CategoryAccordion.tsx  # No changes needed
├── app/
│   ├── page.tsx              # Two-section layout (맛집 리스트 + 위시 리스트)
│   └── search/
│       └── page.tsx          # Dual add buttons, status indicators
├── components/
│   └── UserProfileView.tsx   # Two-section layout for profiles
└── lib/
    └── subcategory.ts        # No changes needed

tests/
└── unit/
    ├── hooks.test.ts              # New: visited/wishlist query tests
    └── recommendation-hooks.test.ts  # Updated: star_rating: null
```

**Structure Decision**: Existing Next.js App Router structure. No new directories needed — all changes are modifications to existing files plus new test files.

## Design Decisions

### 1. Nullable `star_rating` as List Discriminator

The `star_rating` column becomes nullable:
- `NULL` → "위시 리스트" (wishlist)
- `1-3` → "맛집 리스트" (visited)

This avoids a separate `visited` boolean (which could get out of sync) and requires zero data migration since all existing rows have ratings.

See [research.md](research.md) for full rationale and alternatives.

### 2. Query Filtering

All existing queries that fetch "all restaurants" become two filtered queries:

```typescript
// Visited (맛집 리스트):
.not("star_rating", "is", null)
.order("star_rating", { ascending: false })
.order("created_at", { ascending: false })

// Wishlist (위시 리스트):
.is("star_rating", null)
.order("created_at", { ascending: false })
```

### 3. Component Reuse Strategy

No new components needed. Existing components gain conditional behavior:

| Component | Visited Card | Wishlist Card | Search Result |
|-----------|-------------|---------------|---------------|
| StarRating | Filled stars, editable | Gray stars, tappable (promotes) | Not shown |
| Action buttons | 추천, 삭제, ↩위시리스트 | 삭제 | +/★ dual buttons |
| Saved indicator | N/A | N/A | ♡ or ★ |

### 4. Main Page Layout

```
┌─────────────────────────┐
│ 맛집 리스트 (12)         │  ← Section header with count
│ ┌─ 한식 (5) ──────────┐ │
│ │ RestaurantCard ★★★  │ │  ← Visited cards with stars
│ │ RestaurantCard ★★   │ │
│ └─────────────────────┘ │
│ ┌─ 일식 (3) ──────────┐ │
│ │ ...                  │ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ 위시 리스트 (5)          │  ← Section header with count
│ ┌─ 카페 (2) ──────────┐ │
│ │ RestaurantCard ☆☆☆  │ │  ← Wishlist cards with empty stars
│ │ RestaurantCard ☆☆☆  │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

### 5. Search Result Buttons

```
┌──────────────────────────────┐
│ Restaurant Name              │
│ Category · 1.2km             │
│                    [★] [+]   │  ← ★ = add as visited, + = add to wishlist
└──────────────────────────────┘

After saving:
┌──────────────────────────────┐
│ Restaurant Name              │
│ Category · 1.2km             │
│                    ♡ 저장됨   │  ← or ★ 저장됨
└──────────────────────────────┘
```

## Complexity Tracking

> No constitution violations — no entries needed.

## Generated Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Research | [research.md](research.md) | 5 design decisions with rationale |
| Data Model | [data-model.md](data-model.md) | Schema change + migration SQL + rollback |
| Contracts | [contracts/supabase-queries.md](contracts/supabase-queries.md) | Hook → query mapping for all operations |
| Quickstart | [quickstart.md](quickstart.md) | Implementation order + key files |
