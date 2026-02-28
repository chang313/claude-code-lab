---
description: After /simplify review, extract shared patterns and verify test coverage completeness
---

# Post-Simplify Coverage

Run after reviewing `/simplify` agent output. Executes recommended refactorings and ensures test coverage for all code paths.

## Phase 1: Extract Shared Patterns

For each "extract shared" or "reduce duplication" finding from `/simplify`:

1. Identify shared logic across flagged functions (auth checks, inserts, error handling, cache invalidation)
2. Create a private `async` function (NOT a hook) accepting the common shape — callers become thin mappers
3. Update all call sites to delegate to the shared function
4. Run `tsc --noEmit` or `pnpm build` to verify types

## Phase 2: Verify Test Coverage

For each modified function, check these paths are tested:

### Error paths
- **Throw path**: Non-handled errors propagate (e.g., non-23505 DB errors). Assert with `expect(...).rejects.toEqual(...)`
- **Graceful failure**: Handled errors return expected value (e.g., `false` on duplicate 23505)
- **Auth failure**: Unauthenticated user returns early without mutation

### Side effect isolation
- **Success path**: Assert cache invalidation IS called (`expect(invalidateCalls).toContain(...)`)
- **Failure paths**: Assert cache invalidation is NOT called (`expect(invalidateCalls).toHaveLength(0)`)
- **No unnecessary side effects**: Verify only affected cache keys are invalidated

### Quick audit commands
```bash
# Count throw statements vs test assertions
grep -n "throw" $FILE | wc -l
grep -n "rejects\|toThrow" $TEST_FILE | wc -l

# Count invalidation calls vs test assertions
grep -n "invalidate" $FILE | wc -l
grep -n "invalidateCalls" $TEST_FILE | wc -l
```

## Phase 3: Commit & Report

1. Stage modified source + test files
2. Commit: `refactor: [helper name] + test coverage`
3. Report: helpers created, test assertions added, remaining gaps (if any)
