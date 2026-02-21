# Verify Build

Run all three verification gates in sequence, stopping on first failure.

## Workflow

1. **Type check**: `tsc --noEmit`
   - If fails: Report TypeScript errors and stop

2. **Build**: `pnpm build`
   - If fails: Report build errors and stop

3. **Test**: `pnpm test`
   - If fails: Report test failures and stop

4. **Report summary**:
   - All passed: "All gates passed. Ready to commit."
   - Any failed: Show which gate failed and suggest fixes

## Why all three gates?

Build passing does NOT mean tests pass. Deleted exports break test imports even when production code tree-shakes them away. Always verify: type check + build + tests.
