# Quickstart: Naver Import Category Auto-Enrichment

**Feature**: 026-naver-category-enrichment
**Date**: 2026-02-23

## Prerequisites

- Node.js 18+, pnpm
- Kakao Developer App with REST API key (already configured)
- Supabase project with existing `restaurants` and `import_batches` tables

## Setup

```bash
# From feature worktree
cd ../026-naver-category-enrichment
pnpm install
cp .env.example .env.local  # fill in Kakao & Supabase keys
```

## Database Migration

Before starting development, apply the schema change in Supabase Dashboard > SQL Editor:

```sql
ALTER TABLE import_batches
  ADD COLUMN categorized_count integer NOT NULL DEFAULT 0;

UPDATE import_batches
  SET categorized_count = enriched_count;

CREATE INDEX idx_restaurants_empty_category
  ON restaurants(user_id)
  WHERE category = '';
```

## Development

```bash
pnpm dev  # Start Next.js dev server at http://localhost:3000
```

## Testing

```bash
pnpm test                           # Run all unit tests
pnpm test tests/unit/enrichment     # Run enrichment-specific tests
```

## Key Files to Modify

| File | Change |
|------|--------|
| `src/lib/enrichment.ts` | Expand radius, improve name matching, add category fallback |
| `src/lib/kakao.ts` | Add `searchByCategory()` function |
| `src/app/api/import/enrich/route.ts` | Update batch stats (categorized_count) |
| `src/app/api/import/re-enrich/route.ts` | New retroactive re-enrichment endpoint |
| `src/components/ImportHistory.tsx` | Show categorization stats |
| `src/db/import-hooks.ts` | Add `useRetroactiveEnrich` hook |
| `tests/unit/enrichment.test.ts` | Extend with new matching + fallback tests |

## Verification

After implementation, verify with `/verify-build`:
1. `tsc --noEmit` (or `pnpm build` as primary type-check)
2. `pnpm build`
3. `pnpm test`

## Manual Testing

1. Import a Naver bookmark folder with 10+ restaurants
2. Wait for enrichment to complete (check import history)
3. Verify: most restaurants should have categories (not "기타")
4. Check import history shows "카테고리 18/20" style stats
5. Test retroactive: navigate to import page, trigger re-enrichment for old imports
