# Research: Eliminate Loading Flash on Wishlist Tab Mutations

## Root Cause Analysis

### Decision: Fix loading state in `useSupabaseQuery` using stale-while-revalidate pattern

**Rationale**: The current `useSupabaseQuery` hook sets `isLoading = true` at the start of every `execute()` call (line 17 of `use-query.ts`). This includes revalidation calls triggered by `invalidateRestaurants()` in mutation hooks' `finally` blocks. When `isLoading` becomes true, the wishlist page (`page.tsx` line 41) renders "로딩 중..." instead of the list content, causing a visible flash even though optimistic data is already available via `subscribeToCache`.

**Fix**: Only set `isLoading = true` when `data` is `undefined` (initial load). During revalidation (data already exists), keep `isLoading = false` and let the existing data remain visible while the background fetch completes.

**Alternatives considered**:
1. **Per-mutation `isRevalidating` flag**: Would require every consumer to handle two loading states. Rejected for unnecessary complexity — the page doesn't need to know about background revalidation.
2. **Remove `invalidateRestaurants()` from mutation hooks**: Would prevent data consistency after mutations. Rejected — revalidation ensures server state is reflected.
3. **Add skeleton/shimmer instead of full loading screen**: Would reduce visual disruption but not eliminate it. Rejected — stale-while-revalidate completely removes the flash with less code.

## Implementation Approach

### Decision: Modify `setIsLoading(true)` to be conditional on data absence

**Rationale**: The simplest possible fix. One line change: replace `setIsLoading(true)` with a conditional that only sets loading when there's no existing data. This naturally handles:
- Initial load: `data` is `undefined` → `isLoading = true` → shows "로딩 중..."
- Revalidation: `data` exists → `isLoading` stays `false` → list stays visible
- Error during revalidation: existing data remains, error toast shows

**Code pattern**:
```typescript
// Before (current):
setIsLoading(true);

// After (fix):
if (data === undefined) setIsLoading(true);
```

Note: We need to use a ref to track whether we've ever loaded data, since `data` inside the `execute` callback may be stale due to closure semantics. The ref approach (`hasDataRef`) ensures the check is always against the latest state.

### Decision: Use `useRef` to track "has loaded" state

**Rationale**: The `execute` function is memoized via `useCallback` with `deps`. Inside the callback, `data` from `useState` would be a stale closure value. A ref (`hasDataRef.current`) always reflects the latest value. Set it to `true` after the first successful fetch, and check it before setting `isLoading`.

**Alternatives considered**:
1. **Use `data` state directly**: Would be stale in the callback closure. Rejected.
2. **Use `useReducer`**: Overkill for tracking a boolean flag. Rejected.
