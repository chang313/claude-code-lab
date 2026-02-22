# Client Contracts: Wishlist Add Feedback & Search Status Sync

**Branch**: `020-list-add-notify`

## No New API Endpoints

This feature adds no new server-side endpoints. All changes are:
1. Client-side UI state (toast notification)
2. A bug fix in the client-side cache invalidation

## Existing API Used

### Supabase: Insert restaurant (already exists)

**Table**: `restaurants`
**Operation**: INSERT
**Called by**: `useAddRestaurant()` → `addRestaurant(place, starRating?)`

**Returns**: `boolean`
- `true` — insert succeeded; restaurant is now in the user's list
- `false` — unique constraint violation (already exists); treat as no-op

**Error handling contract** (new behavior added by this feature):
- `true` → show success toast: `{ message: "목록에 추가했어요", type: "success" }`
- `false` (duplicate) → no toast; button transitions to saved state (already in list)
- `throw` (network/other error) → show error toast: `{ message: "저장에 실패했어요. 다시 시도해주세요.", type: "error" }`

## Component Contracts

### `Toast` component

```typescript
// Props contract
interface ToastProps {
  message: string;          // Display text
  onDismiss: () => void;    // Called on auto-dismiss or user tap
  type: "success" | "error"; // Determines color (green | red)
  duration?: number;        // Auto-dismiss ms, default 3000
}

// Visual contract
// type="success" → green background (#16a34a or Tailwind bg-green-600)
// type="error"   → red background (#dc2626 or Tailwind bg-red-600)
// Position: absolute, bottom-36, centered horizontally, z-40
// Animation: animate-fade-in (existing class)
```

### `RestaurantCard` — `isAdding` prop

```typescript
// New optional prop
isAdding?: boolean

// Behavior:
// isAdding=true  → add button shows loading indicator, pointer-events-none
// isAdding=false → normal interactive state
// isAdding=undefined → same as false (backward compatible)
```

### `useRestaurantStatusMap` invalidation contract

```typescript
// After this feature: calling addRestaurant() MUST cause
// useRestaurantStatusMap to re-fetch its data.
//
// Verification: after addRestaurant(place) resolves,
// the Map returned by useRestaurantStatusMap(ids) MUST
// include place.id mapped to "wishlist" within 2 seconds.
```
