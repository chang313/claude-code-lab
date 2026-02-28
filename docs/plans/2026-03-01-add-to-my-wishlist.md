# Add to My Wishlist Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users save restaurants from a friend's profile to their own wishlist with one tap.

**Architecture:** Extend existing `RestaurantCard` with two new optional props (`onSaveToMyWishlist`, `isSavedToMyWishlist`). Add a new `useAddFromFriend` hook in `hooks.ts` that inserts a `Restaurant` directly (no `KakaoPlace` conversion). Wire it up in `UserProfileView` using `useRestaurantStatusMap` for batch "already saved" checks.

**Tech Stack:** React 19, TypeScript, Supabase client, existing SWR cache system, Vitest + @testing-library/react

---

### Task 1: Add `useAddFromFriend` hook

**Files:**
- Modify: `src/db/hooks.ts:184` (after `useAddRestaurant`, before `useRemoveRestaurant`)
- Test: `tests/unit/hooks.test.ts`

**Step 1: Write the failing test**

Add to `tests/unit/hooks.test.ts` — import `useAddFromFriend` alongside existing imports at line 82-87, then add a new describe block after the `useAddRestaurant` tests:

```typescript
// Add to imports at line 82:
import {
  useAddRestaurant,
  useAddFromFriend,
  useUpdateStarRating,
  useMarkAsVisited,
  useMoveToWishlist,
} from "@/db/hooks";

// Add new describe block after useAddRestaurant tests (after line 155):
describe("useAddFromFriend", () => {
  const friendRestaurant = {
    id: "kakao-789",
    name: "친구네 맛집",
    address: "서울 강남구 테헤란로 1",
    category: "음식점 > 한식",
    lat: 37.5,
    lng: 127.03,
    placeUrl: "https://place.map.kakao.com/kakao-789",
    starRating: 4,
    createdAt: "2025-01-01T00:00:00Z",
  };

  it("inserts friend's restaurant as wishlist item (star_rating null)", async () => {
    const { result } = renderHook(() => useAddFromFriend());

    let success = false;
    await act(async () => {
      success = await result.current.addFromFriend(friendRestaurant);
    });

    expect(success).toBe(true);
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].table).toBe("restaurants");
    expect(insertCalls[0].data).toEqual(
      expect.objectContaining({
        user_id: "user-1",
        kakao_place_id: "kakao-789",
        name: "친구네 맛집",
        address: "서울 강남구 테헤란로 1",
        category: "음식점 > 한식",
        lat: 37.5,
        lng: 127.03,
        place_url: "https://place.map.kakao.com/kakao-789",
        star_rating: null,
      }),
    );
    expect(invalidateCalls).toContain("restaurants");
  });

  it("returns false on duplicate (23505 constraint)", async () => {
    mockInsertResult = { error: { code: "23505", message: "duplicate" } };
    const { result } = renderHook(() => useAddFromFriend());

    let success = true;
    await act(async () => {
      success = await result.current.addFromFriend(friendRestaurant);
    });

    expect(success).toBe(false);
  });

  it("returns false when not authenticated", async () => {
    mockUser = null;
    const { result } = renderHook(() => useAddFromFriend());

    let success = true;
    await act(async () => {
      success = await result.current.addFromFriend(friendRestaurant);
    });

    expect(success).toBe(false);
    expect(insertCalls).toHaveLength(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/hooks.test.ts --reporter=verbose`
Expected: FAIL — `useAddFromFriend` is not exported from `@/db/hooks`

**Step 3: Write minimal implementation**

Add to `src/db/hooks.ts` after `useAddRestaurant` (line 184), before `useRemoveRestaurant`:

```typescript
export function useAddFromFriend() {
  const addFromFriend = async (
    restaurant: Restaurant,
  ): Promise<boolean> => {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.from("restaurants").insert({
      user_id: user.id,
      kakao_place_id: restaurant.id,
      name: restaurant.name,
      address: restaurant.address,
      category: restaurant.category,
      lat: restaurant.lat,
      lng: restaurant.lng,
      place_url: restaurant.placeUrl ?? null,
      star_rating: null,
    });

    if (error) {
      if (error.code === "23505") return false;
      throw error;
    }

    invalidateRestaurants();
    return true;
  };
  return { addFromFriend };
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/hooks.test.ts --reporter=verbose`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/db/hooks.ts tests/unit/hooks.test.ts
git commit -m "feat: add useAddFromFriend hook for saving friend's restaurants"
```

---

### Task 2: Add save button to RestaurantCard

**Files:**
- Modify: `src/components/RestaurantCard.tsx:5-25` (props interface) and `:132-178` (action sections)
- Test: `tests/unit/restaurant-card-save.test.tsx` (new file)

**Step 1: Write the failing test**

Create `tests/unit/restaurant-card-save.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RestaurantCard from "@/components/RestaurantCard";

const baseRestaurant = {
  id: "kakao-123",
  name: "테스트 맛집",
  address: "서울 강남구",
  category: "음식점 > 한식",
  starRating: 4,
};

describe("RestaurantCard save-to-my-wishlist button", () => {
  it("renders save button when onSaveToMyWishlist provided and not saved", () => {
    const onSave = vi.fn();
    render(
      <RestaurantCard
        restaurant={baseRestaurant}
        variant="visited"
        onSaveToMyWishlist={onSave}
        isSavedToMyWishlist={false}
      />,
    );

    const btn = screen.getByRole("button", { name: /위시리스트에 추가/ });
    expect(btn).toBeDefined();
    expect(btn.textContent).toContain("내 위시리스트에 추가");
  });

  it("renders saved indicator when isSavedToMyWishlist is true", () => {
    render(
      <RestaurantCard
        restaurant={baseRestaurant}
        variant="visited"
        onSaveToMyWishlist={() => {}}
        isSavedToMyWishlist={true}
      />,
    );

    expect(screen.getByText("♡ 저장됨")).toBeDefined();
    expect(screen.queryByRole("button", { name: /위시리스트에 추가/ })).toBeNull();
  });

  it("calls onSaveToMyWishlist when button clicked", () => {
    const onSave = vi.fn();
    render(
      <RestaurantCard
        restaurant={baseRestaurant}
        variant="visited"
        onSaveToMyWishlist={onSave}
        isSavedToMyWishlist={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /위시리스트에 추가/ }));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("shows loading state when isAdding is true", () => {
    render(
      <RestaurantCard
        restaurant={baseRestaurant}
        variant="visited"
        onSaveToMyWishlist={() => {}}
        isSavedToMyWishlist={false}
        isAdding={true}
      />,
    );

    const btn = screen.getByRole("button", { name: /위시리스트에 추가/ });
    expect(btn.hasAttribute("disabled")).toBe(true);
  });

  it("works on wishlist variant too", () => {
    const onSave = vi.fn();
    render(
      <RestaurantCard
        restaurant={{ ...baseRestaurant, starRating: null }}
        variant="wishlist"
        onSaveToMyWishlist={onSave}
        isSavedToMyWishlist={false}
      />,
    );

    expect(screen.getByRole("button", { name: /위시리스트에 추가/ })).toBeDefined();
  });

  it("does not render save button when onSaveToMyWishlist not provided", () => {
    render(
      <RestaurantCard
        restaurant={baseRestaurant}
        variant="visited"
      />,
    );

    expect(screen.queryByRole("button", { name: /위시리스트에 추가/ })).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/restaurant-card-save.test.tsx --reporter=verbose`
Expected: FAIL — props don't exist yet, no save button rendered

**Step 3: Write minimal implementation**

Modify `src/components/RestaurantCard.tsx`:

A. Add two new props to `RestaurantCardProps` interface (after line 24):

```typescript
  onSaveToMyWishlist?: () => void;
  isSavedToMyWishlist?: boolean;
```

B. Destructure them in the component function (after line 40, `onMoveToWishlist`):

```typescript
  onSaveToMyWishlist,
  isSavedToMyWishlist,
```

C. Add a new section for the save button. Insert after the wishlist card actions block (after line 178, before the closing `</div>` of the flex container):

```tsx
        {/* Save to my wishlist (other user's profile) */}
        {onSaveToMyWishlist && (
          isSavedToMyWishlist ? (
            <span className="text-sm font-medium text-pink-500">♡ 저장됨</span>
          ) : (
            <button
              onClick={onSaveToMyWishlist}
              disabled={isAdding}
              className={`px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors${isAdding ? " opacity-50 pointer-events-none" : ""}`}
              aria-label={`${restaurant.name} 내 위시리스트에 추가`}
            >
              {isAdding ? "…" : "+ 내 위시리스트에 추가"}
            </button>
          )
        )}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/restaurant-card-save.test.tsx --reporter=verbose`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/components/RestaurantCard.tsx tests/unit/restaurant-card-save.test.tsx
git commit -m "feat: add save-to-my-wishlist button on RestaurantCard"
```

---

### Task 3: Wire up UserProfileView

**Files:**
- Modify: `src/components/UserProfileView.tsx`

**Step 1: Add imports and hooks**

Add imports at top of `UserProfileView.tsx`:

```typescript
import { useState } from "react";
import { useRestaurantStatusMap } from "@/db/search-hooks";
import { useAddFromFriend } from "@/db/hooks";
import Toast from "@/components/Toast";
```

**Step 2: Add state and hook calls inside the component**

After the existing `listsLoading` / `visitedCount` / `wishlistCount` / `bothEmpty` declarations (after line 29), add:

```typescript
  // Collect all place IDs from friend's restaurants for batch saved-check
  const allPlaceIds = isOwnProfile
    ? []
    : [
        ...visitedGroups.flatMap((g) => g.restaurants.map((r) => r.id)),
        ...wishlistGroups.flatMap((g) => g.restaurants.map((r) => r.id)),
      ];
  const savedStatusMap = useRestaurantStatusMap(allPlaceIds);
  const { addFromFriend } = useAddFromFriend();
  const [addingId, setAddingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const handleSaveToMyWishlist = async (restaurant: Restaurant) => {
    if (addingId) return; // prevent double-tap
    setAddingId(restaurant.id);
    try {
      const success = await addFromFriend(restaurant);
      if (success) {
        setToast({ message: "내 위시리스트에 추가되었습니다", type: "success" });
      } else {
        setToast({ message: "이미 저장된 맛집입니다", type: "success" });
      }
    } catch {
      setToast({ message: "추가에 실패했습니다", type: "error" });
    } finally {
      setAddingId(null);
    }
  };
```

Also add `Restaurant` to the import from types (update the existing profile-hooks import or add a separate import):

```typescript
import type { Restaurant } from "@/types";
```

**Step 3: Pass props to RestaurantCard in visited section**

Replace the visited `RestaurantCard` rendering (lines 108-113):

```tsx
                        <RestaurantCard
                          key={restaurant.id}
                          restaurant={restaurant}
                          variant="visited"
                          {...(!isOwnProfile && {
                            onSaveToMyWishlist: () => handleSaveToMyWishlist(restaurant),
                            isSavedToMyWishlist: savedStatusMap.has(restaurant.id),
                            isAdding: addingId === restaurant.id,
                          })}
                        />
```

**Step 4: Pass props to RestaurantCard in wishlist section**

Replace the wishlist `RestaurantCard` rendering (lines 149-154):

```tsx
                        <RestaurantCard
                          key={restaurant.id}
                          restaurant={restaurant}
                          variant="wishlist"
                          {...(!isOwnProfile && {
                            onSaveToMyWishlist: () => handleSaveToMyWishlist(restaurant),
                            isSavedToMyWishlist: savedStatusMap.has(restaurant.id),
                            isAdding: addingId === restaurant.id,
                          })}
                        />
```

**Step 5: Add Toast at end of component JSX**

Before the final closing `</div>` of the component return (line 164), add:

```tsx
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
```

**Step 6: Run type check and build**

Run: `pnpm build`
Expected: Build succeeds with no type errors

**Step 7: Commit**

```bash
git add src/components/UserProfileView.tsx
git commit -m "feat: wire up add-to-my-wishlist in friend profile view"
```

---

### Task 4: Run full verification

**Step 1: Type check**

Run: `tsc --noEmit`
Expected: No errors

**Step 2: Build**

Run: `pnpm build`
Expected: Build succeeds

**Step 3: Run all tests**

Run: `pnpm test`
Expected: All tests pass

**Step 4: Commit if any fixes were needed**

If any fixes were made, commit them:

```bash
git add -A
git commit -m "fix: address verification issues"
```
