# component-replace

Trace all import sites of a component being replaced and guide migration to the new component.

## Usage

```
/component-replace <OldComponent> <NewComponent>
```

**Example:**
```
/component-replace ErrorToast Toast
```

## Task

Given `$ARGUMENTS` formatted as `"<OldName> <NewName>"`:

1. **Locate source files:**
   - Find `src/components/<OldName>.tsx` — read its props interface
   - Find `src/components/<NewName>.tsx` — read its props interface

2. **Find all import sites of OldName:**
   - `grep -rn "from.*<OldName>\|import.*<OldName>" src/`
   - List each file and line number

3. **Prop diff:**
   - Compare old vs new props interface
   - Identify: SAME props, REMOVED props, ADDED props (with defaults if any)
   - Print mapping table:
     ```
     OldComponent prop  →  NewComponent prop  (action)
     message            →  message            (no change)
     onDismiss          →  onDismiss          (no change)
     (none)             →  type               (ADD: "error" for error variant)
     ```

4. **Per-file migration plan:**
   - For each import site, show:
     - Current import line and replacement line
     - Props that need to be added/changed at each call site
     - Whether OldName can be removed from that file

5. **Apply changes** (confirm with user first):
   - Update each import
   - Add required new props at each call site
   - Report which files were changed

6. **Deprecation check:**
   - After all sites migrated, confirm 0 remaining imports of OldName
   - Offer to delete `src/components/<OldName>.tsx`

## Background

Component replacement is a recurring pattern in this codebase (e.g., `ErrorToast` → `Toast`, adding `isAdding` prop to `RestaurantCard`). Manual grep of import sites is error-prone — easy to miss a call site that passes build via tree-shaking but accumulates as dead code.
