# Quickstart: Naver Map Import

**Feature**: 017-naver-map-import
**Date**: 2026-02-22

## Prerequisites

1. Supabase migration applied (see `data-model.md` → Migration SQL)
2. Existing Kakao REST API key configured (`NEXT_PUBLIC_KAKAO_REST_KEY`)
3. Feature branch `017-naver-map-import` checked out

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  Client (React)                                  │
│                                                  │
│  /my/import page                                │
│  ├── ImportGuide (collapsible step-by-step)     │
│  ├── ShareLinkInput (paste + validate)          │
│  ├── ImportProgress (count/total indicator)      │
│  └── ImportHistory (list + undo)                │
│                                                  │
│  Hooks: useNaverImport, useImportHistory         │
└──────────┬──────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────┐
│  API Routes (Next.js)                            │
│                                                  │
│  POST /api/import/naver   → Proxy fetch from     │
│                              Naver (SSRF-safe)   │
│  POST /api/import/save    → Duplicate detect +   │
│                              bulk insert to DB   │
│  POST /api/import/enrich  → Trigger async Kakao  │
│                              enrichment          │
│  GET  /api/import/history → List import batches  │
│  DELETE /api/import/batch → Undo import batch    │
└──────────┬──────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────┐
│  Supabase (Postgres)                             │
│                                                  │
│  import_batches (new table)                      │
│  restaurants (+ import_batch_id column)          │
└─────────────────────────────────────────────────┘
```

## Implementation Order

### Phase 1: Core Import (P1)
1. **DB migration** — Create `import_batches` table, add `import_batch_id` to `restaurants`
2. **API route: `/api/import/naver`** — Server-side proxy for Naver bookmark fetch with URL validation
3. **Naver response parser** — Parse `bookmarkList`, validate fields, map to internal type
4. **Duplicate detection** — Haversine distance check against existing restaurants
5. **API route: `/api/import/save`** — Bulk insert with batch tracking
6. **Import UI page** — `/my/import` with paste input, progress indicator, result summary
7. **Step-by-step guide component** — Collapsible guide with instructions

### Phase 2: Enrichment (P2)
8. **Kakao enrichment service** — Sequential Kakao Local API lookups with throttling
9. **API route: `/api/import/enrich`** — Trigger enrichment, process in background
10. **Enrichment status** — Update restaurants progressively, invalidate cache

### Phase 3: History & Undo (P3)
11. **API route: `/api/import/history`** — List user's import batches
12. **API route: `/api/import/batch/{id}`** — Delete unrated restaurants from batch
13. **Import history UI** — Display past imports with undo button

## Key Patterns to Follow

- **Hooks pattern**: Follow `src/db/hooks.ts` — use `useSupabaseQuery` for reads, direct Supabase client for mutations, `invalidate()` after writes
- **API routes**: First API routes in this project — follow Next.js App Router convention at `src/app/api/import/naver/route.ts`
- **Error handling**: Return structured JSON errors with Korean user-facing messages
- **Supabase client**: Use `createClient()` from `@/lib/supabase/client` for client-side, `createClient()` from `@/lib/supabase/server` for API routes
- **Type safety**: Define `NaverBookmark` and `NaverBookmarkResponse` types in `src/types/index.ts`

## Testing Strategy

- **Unit tests**: Naver response parser, duplicate detection (Haversine), shareId validation, data mapping
- **Unit tests**: Kakao enrichment matching logic (name similarity + distance threshold)
- **Mock pattern**: Follow existing chainable Supabase mock pattern from `tests/unit/`
- **No E2E tests**: Project convention — all tests are unit tests in `tests/unit/`

## Files to Create

```
src/app/api/import/naver/route.ts     # Naver proxy endpoint
src/app/api/import/save/route.ts      # Bulk insert endpoint
src/app/api/import/enrich/route.ts    # Enrichment trigger
src/app/api/import/history/route.ts   # Import history
src/app/api/import/batch/[id]/route.ts # Batch undo
src/app/my/import/page.tsx            # Import UI page
src/components/ImportGuide.tsx        # Step-by-step guide
src/components/ImportProgress.tsx     # Progress indicator
src/components/ImportHistory.tsx      # History + undo
src/db/import-hooks.ts               # Client-side hooks
src/lib/naver.ts                     # Naver API parser + validation
src/lib/enrichment.ts                # Kakao enrichment logic
src/lib/haversine.ts                 # Distance calculation utility
tests/unit/naver-import.test.ts      # Parser + validation tests
tests/unit/haversine.test.ts         # Distance calculation tests
tests/unit/enrichment.test.ts        # Enrichment matching tests
tests/unit/import-hooks.test.ts      # Hook tests
```

## Files to Modify

```
src/types/index.ts                    # Add NaverBookmark types
src/components/UserProfileView.tsx    # Add "가져오기" button link
```
