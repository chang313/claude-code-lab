# Quickstart: Wishlist Add Feedback & Search Status Sync

**Branch**: `020-list-add-notify`

## Setup

```bash
# Clone or navigate to worktree
cd /Users/parkchanghyeon/github/020-list-add-notify

# Install dependencies (already installed if worktree was set up with /worktree-setup)
pnpm install

# Copy env vars (if not already present)
cp .env.example .env.local  # fill in Supabase + Kakao keys

# Start dev server
pnpm dev
```

## No Database Migration Required

This feature requires **no schema changes**. The existing `restaurants` table and RLS policies are sufficient.

## What Changes

### 1. `src/components/Toast.tsx` (new file, replaces ErrorToast.tsx)

Extend `ErrorToast.tsx` into a typed `Toast.tsx`:
- Add `type: "success" | "error"` prop
- Switch background color based on type
- All other behavior unchanged (auto-dismiss, click-dismiss, position)

### 2. `src/db/hooks.ts` — Fix invalidation

Locate `invalidateRestaurants()` and add the cache key(s) from `useRestaurantStatusMap`.

Read `src/db/search-hooks.ts` first to find the exact key pattern.

### 3. `src/app/search/page.tsx` — Wire up feedback

```typescript
// Add state
const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
const [addingId, setAddingId] = useState<string | null>(null);

// Update handleAddToWishlist
const handleAddToWishlist = async (place: KakaoPlace) => {
  setAddingId(place.id);
  try {
    const added = await addRestaurant(place);
    if (added) {
      setToast({ message: "목록에 추가했어요", type: "success" });
    }
    // added=false (duplicate) → already saved, no toast needed
  } catch {
    setToast({ message: "저장에 실패했어요. 다시 시도해주세요.", type: "error" });
  } finally {
    setAddingId(null);
    setSelectedPlace(null);
  }
};

// Render Toast
{toast && (
  <Toast
    message={toast.message}
    type={toast.type}
    onDismiss={() => setToast(null)}
  />
)}

// Pass isAdding to RestaurantCard
<RestaurantCard
  isAdding={addingId === place.id}
  ...
/>
```

### 4. `src/components/RestaurantCard.tsx` — isAdding prop

Add `isAdding?: boolean` to props. When `true`, disable the add button:
```tsx
<button
  onClick={onAddToWishlist}
  disabled={isAdding}
  className={`... ${isAdding ? "opacity-50 pointer-events-none" : ""}`}
>
  {isAdding ? "..." : "+ 추가"}
</button>
```

### 5. Update ErrorToast imports

Search for all `ErrorToast` imports and update to `Toast` with `type="error"`:
```bash
grep -r "ErrorToast" src/
```

## Verification

```bash
# Type check
pnpm build

# Unit tests
pnpm test

# Manual test checklist:
# 1. Search for a restaurant
# 2. Tap "+ 추가" → green toast appears "목록에 추가했어요"
# 3. Toast auto-dismisses after ~3 seconds
# 4. Restaurant card shows "♡ 저장됨" immediately after adding
# 5. Reload page → card still shows "♡ 저장됨" (persisted)
# 6. Simulate network error → red toast appears
```
