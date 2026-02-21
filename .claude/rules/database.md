# Database Rules (Supabase / PostgREST)

## Migrations
- Supabase has no auto-migration runner — apply all schema changes manually via Supabase Dashboard > SQL Editor before deploying.
- Migration SQL lives in `specs/NNN-feature-name/data-model.md` under a "Migration SQL" section.

## Query Patterns
- FK join disambiguation: when a table has two FKs to the same target, use `!constraint_name` notation: `profiles!follows_follower_id_fkey(*)`. Default pattern: `<table>_<column>_fkey`.
- Self-joins require `.rpc()` — PostgREST can't express them. Wrap in a `SECURITY DEFINER` Postgres function.

## Schema Patterns
- Partial unique index (`CREATE UNIQUE INDEX ... WHERE status = 'pending'`) prevents duplicate active records while allowing re-creation after resolution.
- Snapshot pattern: store denormalized data (name, category, address) inline in referencing table when the source row may be deleted — avoids FK breakage.
