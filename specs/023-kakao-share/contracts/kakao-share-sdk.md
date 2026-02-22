# Contract: Kakao Share SDK Interface (023)

## Overview

This feature uses the **Kakao JS SDK** (`Kakao.Share`) for KakaoTalk sharing. No new REST API routes are created — the integration is entirely client-side.

## SDK Loading

**Script URL**: `https://developers.kakao.com/sdk/js/kakao.min.js`
**Initialization**: `Kakao.init(process.env.NEXT_PUBLIC_KAKAO_JS_KEY)` — call once after script loads.
**Guard**: `Kakao.isInitialized()` — check before calling `Kakao.Share`.

**Note**: This is separate from the Maps SDK (`dapi.kakao.com/v2/maps/sdk.js`). Both are loaded; both use the same `NEXT_PUBLIC_KAKAO_JS_KEY`.

## `kakao-share.ts` Internal API

### `shareService()`

Shares the service homepage via KakaoTalk. Falls back to clipboard if SDK unavailable.

```typescript
type ShareResult = { method: "kakao" | "clipboard" | "error"; error?: string };

function shareService(): Promise<ShareResult>
```

**Behavior**:
1. Check `window.Kakao?.Share` — if available, call `Kakao.Share.sendDefault(SERVICE_MESSAGE)`.
2. If unavailable, call `navigator.clipboard.writeText(SERVICE_URL)` and return `{ method: "clipboard" }`.
3. On any error, return `{ method: "error", error: message }`.

### `shareProfile(userId: string, displayName: string, wishlistCount: number)`

Shares a specific user's profile page. Falls back to clipboard.

```typescript
function shareProfile(
  userId: string,
  displayName: string,
  wishlistCount: number
): Promise<ShareResult>
```

**Behavior**: Same as `shareService()` but with dynamic `ProfileShareMessage`.

## Kakao Share SDK Message Schema

```typescript
// Passed to Kakao.Share.sendDefault()
interface KakaoFeedMessage {
  objectType: "feed";
  content: {
    title: string;
    description: string;
    imageUrl: string;
    link: {
      webUrl: string;
      mobileWebUrl: string;
    };
  };
  buttons: Array<{
    title: string;
    link: {
      webUrl: string;
      mobileWebUrl: string;
    };
  }>;
}
```

## `ShareButton` Component API

```typescript
interface ShareButtonProps {
  type: "service" | "profile";
  // Required only when type === "profile":
  userId?: string;
  displayName?: string;
  wishlistCount?: number;
  // Callback to display toast result:
  onResult: (result: { message: string; type: "success" | "error" }) => void;
}
```

## Availability Check

```typescript
function isKakaoShareAvailable(): boolean {
  return typeof window !== "undefined" &&
    typeof window.Kakao !== "undefined" &&
    typeof window.Kakao.Share !== "undefined";
}
```

## Guest Redirect Contract

When the share button is tapped by an unauthenticated user, the calling component handles the redirect (not `ShareButton` itself):

1. Component checks auth state on mount via `createClient().auth.getUser()`.
2. If no session, `router.push("/login")` on button click — share logic is never invoked.
3. `ShareButton` is only rendered after auth check; it does not contain redirect logic.

## Error Handling

| Scenario | Behavior |
|----------|----------|
| SDK not loaded | Clipboard fallback, success toast "링크가 복사되었습니다" |
| Kakao not initialized | Clipboard fallback |
| User cancels KakaoTalk dialog | No action (Kakao SDK handles silently) |
| Clipboard write fails | Error toast "링크 복사에 실패했습니다" |
| Profile userId missing | Console error, button disabled |
