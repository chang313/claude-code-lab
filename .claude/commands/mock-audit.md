# mock-audit

Audit `vi.mock()` blocks in the test suite to ensure all real module exports are covered by every mock factory.

## Usage

```
/mock-audit <module-path-fragment>
```

**Examples:**
```
/mock-audit invalidate
/mock-audit supabase/client
/mock-audit hooks
```

## Task

Given `$ARGUMENTS` (a partial module path), find all real exports from the matching source file and compare them against every `vi.mock()` block targeting that module across the test suite.

1. **Find the source module:**
   - Search `src/` for files matching the fragment (e.g., `src/lib/supabase/invalidate.ts`)
   - Extract all exported symbols: grep for `^export (function|const|class|type|interface|async)` and named re-exports

2. **Find all test mock blocks:**
   - `grep -rn "vi.mock.*<fragment>" tests/`
   - For each match, read the surrounding mock factory (lines between the matching `vi.mock(` and its closing `}))`)
   - Extract property names defined in the factory object

3. **Diff per test file:**
   - For each test file: `real_exports - mock_exports = MISSING`
   - Report:
     ```
     tests/unit/import-hooks.test.ts
       vi.mock("@/lib/supabase/invalidate")
       MISSING: invalidateByPrefix
       PRESENT: invalidate, subscribe, invalidateAll
     ```

4. **Severity assessment:**
   - **CRITICAL**: missing export is called by code this test imports
   - **WARNING**: missing export exists in real module but test file's imports don't reach it

5. **Offer fix:** For each CRITICAL gap, show the one-line addition needed in the mock factory.

## Background

`vi.mock()` completely replaces the module — any export the code under test calls that is missing from the factory is `undefined`. This causes silent failures: the test may pass while the production code path crashes, or mock tracking arrays receive no entries.

Run this command after adding any new export to a heavily-mocked module before committing.
