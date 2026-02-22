# cache-key-audit

Audit cache key consistency between `subscribe()` and `invalidate()`/`invalidateByPrefix()` calls across the codebase.

## Usage

```
/cache-key-audit
```

No arguments — scans entire `src/` tree.

## Task

Scan all files in `src/db/` and `src/lib/` for cache key usage and report mismatches between producers (`subscribe`) and consumers (`invalidate`/`invalidateByPrefix`).

1. **Collect `subscribe()` call sites:**
   - `grep -rn "subscribe(" src/` — extract key strings (static and template literal patterns)

2. **Collect `invalidate()` call sites:**
   - `grep -rn "\binvalidate(" src/` — extract exact key strings

3. **Collect `invalidateByPrefix()` call sites:**
   - `grep -rn "invalidateByPrefix(" src/` — extract prefix strings

4. **Cross-reference:**
   - For each `invalidateByPrefix(prefix)`: find all `subscribe(key)` where key starts with prefix
     - **WARN** if prefix matches 0 subscribers (dead invalidation)
   - For each `invalidate(key)`: find matching `subscribe(key)`
     - **WARN** if exact key has 0 subscribers
   - For dynamic keys (template literals): report as MANUAL REVIEW needed

5. **Report:**
   ```
   invalidateByPrefix("wishlisted-set:")
     Matching subscribers: NONE FOUND  ← WARNING: possible dead invalidation

   invalidateByPrefix("restaurant-status:")
     Matching subscribers: src/db/search-hooks.ts:45 (subscribe("restaurant-status:${...}"))

   invalidate("restaurants")
     Matching subscribers: src/db/hooks.ts:55 (subscribe("restaurants", ...))
   ```

## Background

The invalidation event bus in `src/lib/supabase/invalidate.ts` uses a home-grown pub/sub pattern. Dynamic cache keys are namespaced as `"<prefix>:<dynamic-id>"` and invalidated via `invalidateByPrefix(prefix)`. A mismatch between the subscribed key and the invalidation prefix causes silent cache staleness — no error is thrown, data just doesn't refresh.

Run this command when adding new cache key namespaces or refactoring the invalidation system.
