# Kakao Map Navigation Link Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "길찾기" navigation button to `ChatPlaceCard` so users can open Kakao Map directions to recommended places.

**Architecture:** Add a `buildKakaoNavUrl` helper that constructs `https://map.kakao.com/link/to/{name},{lat},{lng}`. Add a navigation button to the existing `ChatPlaceCard` component that links to this URL. The `Restaurant` type already carries `lat`/`lng`, so no data flow changes are needed.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Vitest + React Testing Library

---

### Task 1: Add test for navigation URL helper

**Files:**
- Modify: `tests/unit/chat-place-card.test.tsx`

**Step 1: Write the failing test for `buildKakaoNavUrl`**

Add this import and test block at the bottom of the existing test file:

```tsx
import { buildKakaoNavUrl } from "@/components/ChatPlaceCard";

describe("buildKakaoNavUrl", () => {
  it("constructs navigation URL with encoded name", () => {
    const url = buildKakaoNavUrl("맛있는 치킨", 37.5, 127.05);
    expect(url).toBe(
      "https://map.kakao.com/link/to/맛있는 치킨,37.5,127.05",
    );
  });

  it("encodes special characters in name", () => {
    const url = buildKakaoNavUrl("Bob's Burger & Grill", 37.123, 127.456);
    expect(url).toBe(
      "https://map.kakao.com/link/to/Bob's Burger & Grill,37.123,127.456",
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/chat-place-card.test.tsx`
Expected: FAIL — `buildKakaoNavUrl` is not exported from `ChatPlaceCard`

---

### Task 2: Implement `buildKakaoNavUrl` helper

**Files:**
- Modify: `src/components/ChatPlaceCard.tsx`

**Step 1: Add the exported helper function**

Add after the `renderStars` function (line 16), before the component:

```tsx
export function buildKakaoNavUrl(name: string, lat: number, lng: number): string {
  return `https://map.kakao.com/link/to/${name},${lat},${lng}`;
}
```

**Step 2: Run the `buildKakaoNavUrl` tests to verify they pass**

Run: `pnpm vitest run tests/unit/chat-place-card.test.tsx`
Expected: All `buildKakaoNavUrl` tests PASS

**Step 3: Commit**

```bash
git add src/components/ChatPlaceCard.tsx tests/unit/chat-place-card.test.tsx
git commit -m "feat: add buildKakaoNavUrl helper for Kakao Map directions"
```

---

### Task 3: Add test for navigation button in ChatPlaceCard

**Files:**
- Modify: `tests/unit/chat-place-card.test.tsx`

**Step 1: Write the failing tests for the navigation button**

Add these tests inside the existing `describe("ChatPlaceCard")` block:

```tsx
  it("renders navigation button with correct Kakao Map URL", () => {
    render(<ChatPlaceCard place={visited} />);
    const navLink = screen.getByRole("link", { name: /길찾기/ });
    expect(navLink.getAttribute("href")).toBe(
      "https://map.kakao.com/link/to/맛있는 치킨,37.5,127.05",
    );
    expect(navLink.getAttribute("target")).toBe("_blank");
  });

  it("renders navigation button even without placeUrl", () => {
    render(<ChatPlaceCard place={wishlisted} />);
    const navLink = screen.getByRole("link", { name: /길찾기/ });
    expect(navLink.getAttribute("href")).toBe(
      "https://map.kakao.com/link/to/스시 오마카세,37.5,127.05",
    );
  });
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/unit/chat-place-card.test.tsx`
Expected: FAIL — no link with name "길찾기" found

---

### Task 4: Implement navigation button in ChatPlaceCard

**Files:**
- Modify: `src/components/ChatPlaceCard.tsx`

**Step 1: Add the navigation button to the card layout**

Replace the existing card JSX (the `<div className="my-2 ...">` block, lines 20-41) with:

```tsx
  const navUrl = buildKakaoNavUrl(place.name, place.lat, place.lng);

  const card = (
    <div className="my-2 bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-semibold text-sm text-gray-900 truncate">
            {place.name}
          </h4>
          <p className="text-xs text-gray-500">{getSubcategory(place.category)}</p>
          <p className="text-xs text-gray-400 truncate">{place.address}</p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {place.starRating !== null ? (
            <span className="text-xs text-yellow-500">
              {renderStars(place.starRating)}
            </span>
          ) : (
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
              위시리스트
            </span>
          )}
          <a
            href={navUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-blue-500 hover:text-blue-700 p-1"
            aria-label="길찾기"
            title="길찾기"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
```

Key changes from original:
- Right side changed from `text-right` to `flex items-center gap-2` to accommodate the button
- Added an `<a>` with a map pin SVG icon (Heroicons `MapPinIcon` inline), `aria-label="길찾기"`, and `e.stopPropagation()`

**Step 2: Run all ChatPlaceCard tests**

Run: `pnpm vitest run tests/unit/chat-place-card.test.tsx`
Expected: ALL PASS

**Step 3: Run the existing "links to place URL when available" test specifically**

Verify the existing place URL link test still passes (since we now have two links in the DOM, the test uses `getByRole("link")` which may need to become `getAllByRole`). If it breaks, update the test to use `screen.getAllByRole("link")` and check the first link.

**Step 4: Commit**

```bash
git add src/components/ChatPlaceCard.tsx tests/unit/chat-place-card.test.tsx
git commit -m "feat: add Kakao Map navigation button to ChatPlaceCard"
```

---

### Task 5: Fix existing test if needed + full verification

**Files:**
- Possibly modify: `tests/unit/chat-place-card.test.tsx`

**Step 1: Run the full test suite**

Run: `pnpm vitest run`
Expected: ALL PASS

**Step 2: If the "links to place URL" test broke (multiple links), fix it**

Update the existing test from:
```tsx
const link = screen.getByRole("link");
```
to:
```tsx
const links = screen.getAllByRole("link");
const placeLink = links.find(l => l.getAttribute("href")?.includes("place.map.kakao.com"));
expect(placeLink).toBeTruthy();
expect(placeLink!.getAttribute("href")).toBe("https://place.map.kakao.com/kakao-1");
expect(placeLink!.getAttribute("target")).toBe("_blank");
```

**Step 3: Run type check and build**

Run: `pnpm build`
Expected: Build succeeds

**Step 4: Commit if any fixes were needed**

```bash
git add tests/unit/chat-place-card.test.tsx
git commit -m "test: fix ChatPlaceCard test for multiple links"
```

---

### Task 6: Final verification

**Step 1: Run all three verification gates**

Run: `tsc --noEmit && pnpm build && pnpm vitest run`
Expected: All pass

**Step 2: Visual check (optional)**

Start dev server: `pnpm dev`
Navigate to `/discover`, send a message to the AI agent, verify:
- Place cards show a map pin icon on the right
- Tapping the pin opens Kakao Map with directions
- Tapping the card body still opens the place detail page
