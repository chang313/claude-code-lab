# Contracts: Change Star Rating Scale to 5

No new API contracts needed. This feature modifies only the valid value range for the existing `star_rating` field.

## Existing Endpoints Affected

All existing Supabase client calls that read/write `star_rating` continue to work unchanged. The only change is at the TypeScript type layer — the union type widens from `1 | 2 | 3` to `1 | 2 | 3 | 4 | 5`.

No REST endpoint signatures, request/response shapes, or Supabase RPC functions change.
