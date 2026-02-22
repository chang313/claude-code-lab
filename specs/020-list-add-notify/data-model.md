# Data Model: Wishlist Add Feedback & Search Status Sync

**Branch**: `020-list-add-notify` | **Phase**: 1

## Schema Changes

**None.** No new tables, columns, or indexes required. The existing `restaurants` table already supports all requirements:

- Unique constraint `(user_id, kakao_place_id)` prevents duplicates (FR-008)
- `star_rating IS NULL` discriminates wishlist entries (existing semantics)
- `useAddRestaurant()` already returns `false` on duplicate insert

## Client-Side State Changes

### Toast State (in `search/page.tsx`)

```typescript
// New state:
const [toast, setToast] = useState<{
  message: string;
  type: "success" | "error";
} | null>(null);

// Usage:
setToast({ message: "목록에 추가했어요", type: "success" });
setToast({ message: "저장에 실패했어요. 다시 시도해주세요.", type: "error" });
setToast(null); // on dismiss
```

### Per-Card Loading State (in `search/page.tsx`)

```typescript
// New state:
const [addingId, setAddingId] = useState<string | null>(null);

// Prevents duplicate taps:
setAddingId(place.id);
await addRestaurant(place);
setAddingId(null);
```

## Query Cache Invalidation Fix

### Current (broken) `invalidateRestaurants()` in `src/db/hooks.ts`

```typescript
function invalidateRestaurants() {
  invalidate(RESTAURANTS_KEY);
  invalidate(VISITED_KEY);
  invalidate(WISHLIST_KEY);
  // ❌ Missing: STATUS_MAP_KEY or per-id status keys
}
```

### Updated `invalidateRestaurants()`

The exact key(s) used by `useRestaurantStatusMap` must be added. Based on the hook naming pattern (`wishlisted:${id}`), the invalidation should also call `invalidate` on the status-map keys. The fix will be confirmed by reading `search-hooks.ts` before implementation.

## Component Interface Changes

### `Toast.tsx` (renamed from `ErrorToast.tsx`)

```typescript
interface ToastProps {
  message: string;
  onDismiss: () => void;
  type: "success" | "error";  // NEW — was always "error"
  duration?: number;          // unchanged, default 3000
}
```

### `RestaurantCard.tsx` — search-result variant

```typescript
interface RestaurantCardProps {
  // ... existing props ...
  isAdding?: boolean;  // NEW — disables add button during in-flight request
}
```

No migration SQL required.
