# Kakao Map Navigation Link in ChatPlaceCard

## Goal

Add a "길찾기" (directions) button to `ChatPlaceCard` so users can navigate directly to recommended places via Kakao Map.

## URL Format

```
https://map.kakao.com/link/to/{name},{lat},{lng}
```

Opens Kakao Map app on mobile (if installed) or web map with directions as fallback.

## Component Changes

### `ChatPlaceCard.tsx`

- Add `buildKakaoNavUrl(name, lat, lng)` helper that encodes the name and constructs the URL
- Add a navigation button (location pin icon) to the right side of the card
- Button uses `target="_blank"` and `rel="noopener noreferrer"`
- Button uses `e.stopPropagation()` / `e.preventDefault()` to avoid triggering the parent card link
- Only show the button when `lat` and `lng` are available on the `Restaurant` object

### Data Flow (unchanged)

```
discover/page.tsx
  → useWishlist() returns Restaurant[] (includes lat, lng)
  → placeMap = Map<kakaoPlaceId, Restaurant>
  → AssistantBubble receives placeMap
    → ChatPlaceCard receives full Restaurant (lat, lng already present)
```

No API route, LLM prompt, or parser changes needed.

## Files Modified

| File | Change |
|------|--------|
| `src/components/ChatPlaceCard.tsx` | Add nav URL helper + navigation button |
| `tests/unit/chat-place-card.test.tsx` | Add test for nav button rendering & URL |

## Trade-offs

- **Chosen**: Separate button for navigation, keeping existing card link for place detail
- **Rejected**: Replacing card link (loses place info access)
- **Rejected**: LLM-generated URLs (unreliable with 8B model)
