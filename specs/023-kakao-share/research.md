# Research: KakaoTalk Share Feature (023)

## Decision 1: Kakao Share SDK vs. Maps SDK

**Decision**: Load the Kakao JS SDK (`https://developers.kakao.com/sdk/js/kakao.min.js`) as a separate script alongside the existing Maps SDK.

**Rationale**: The existing `KakaoScript.tsx` loads only `dapi.kakao.com/v2/maps/sdk.js` (Kakao Maps SDK), which does NOT include `Kakao.Share`. The KakaoTalk Share API is part of the Kakao JS SDK (unified platform SDK), which must be loaded separately. Both SDKs share the same app key (`NEXT_PUBLIC_KAKAO_JS_KEY`) and the same `window.Kakao` global — the JS SDK includes Maps; the Maps SDK does not include Share.

**Alternatives considered**:
- Using the unified JS SDK only (replacing the Maps SDK URL): Risky migration, could break map initialization without thorough testing. Defer to a separate cleanup task.
- Web Share API (`navigator.share()`): Platform-agnostic but does NOT open KakaoTalk specifically — rejected per requirements.

**Implementation**: Add a second `<script>` tag in `KakaoScript.tsx` (or a new `KakaoShareScript.tsx` component) that loads the Kakao JS SDK and calls `Kakao.init()` with the JS key.

---

## Decision 2: Share Trigger Method

**Decision**: Use `Kakao.Share.sendDefault()` for KakaoTalk sharing.

**Rationale**: `sendDefault()` opens the KakaoTalk share dialog with a structured Feed/Commerce card, allowing custom title, description, thumbnail, and link. It is the standard method for sharing from web apps. `sendScrap()` (which scrapes OG tags) would produce less reliable output since the app's OG tags may not be optimized for sharing.

**Alternatives considered**:
- `Kakao.Share.sendScrap()`: Scrapes Open Graph meta tags. Less control over message content — rejected for this reason.
- Custom URI scheme (`kakaolink://`): Low-level, platform-specific — `Kakao.Share` API wraps this more reliably.

---

## Decision 3: Fallback When Kakao Share Unavailable

**Decision**: Fall back to `navigator.clipboard.writeText()` + success toast.

**Rationale**: `Kakao.Share` may be unavailable if (a) the SDK script fails to load, (b) the user is on a desktop browser without KakaoTalk, or (c) the `Kakao` global is not yet initialized. In these cases, copying the URL to clipboard is the lowest-friction fallback — no additional UI overlay needed.

**Detection**: Check `typeof window.Kakao !== "undefined" && window.Kakao.Share` before calling. If falsy, fall back to clipboard.

**Alternatives considered**:
- Show a QR code: More complex, requires a QR library (violates Simplicity principle).
- Show a share URL input field: Acceptable but more UI surface than needed.

---

## Decision 4: Share Button Placement

**Decision**:
- **P1 (service share)**: Add an icon button to `TopBar.tsx` header, right side, alongside the existing notification bell.
- **P2 (profile share)**: Add a share button inside `ProfileHeader.tsx`, conditionally rendered when `isOwnProfile === true`.

**Rationale**: TopBar is always visible and is the natural home for a service-level action. `ProfileHeader` already receives `isOwnProfile` from both `/my/page.tsx` (always true) and `/users/[id]/page.tsx` (compares `currentUserId === id`), so conditionally showing the share button there requires zero new prop drilling.

---

## Decision 5: Share Message Content (Korean)

**Service share message**:
```
title: "맛집 리스트"
description: "친구의 맛집을 함께 저장하고 공유해보세요!"
imageUrl: [app OG image or static asset]
webUrl: "https://claude-code-lab.vercel.app"
mobileWebUrl: "https://claude-code-lab.vercel.app"
```

**Profile share message** (dynamic):
```
title: "${profileName}님의 맛집 리스트"
description: "저장된 맛집 ${count}개 · 같이 둘러보세요!"
imageUrl: [app OG image or static asset]
webUrl: "https://claude-code-lab.vercel.app/users/${userId}"
mobileWebUrl: "https://claude-code-lab.vercel.app/users/${userId}"
```

**Rationale**: Korean content aligns with the KakaoTalk user base. Profile count makes the share more personal and enticing.

---

## Decision 6: No New API Routes Needed

**Decision**: This is a fully client-side feature. No backend API routes are required.

**Rationale**: The Kakao Share SDK runs entirely in the browser. The shared links point to existing public pages (`/` or `/users/[id]`) that are already accessible. No server-side processing is required.

---

## Key Codebase Findings

| Finding | File | Implication |
|---------|------|-------------|
| Maps SDK loaded via script injection | `src/components/KakaoScript.tsx` | Extend to also load Kakao JS SDK |
| Header component | `src/components/TopBar.tsx` | Add share icon button here |
| `isOwnProfile` already propagated | `src/components/ProfileHeader.tsx` | Conditionally show profile share button |
| Toast component ready | `src/components/Toast.tsx` | Use for clipboard fallback success message |
| No clipboard utility exists | — | Implement inline in `kakao-share.ts` |
| Auth via `createClient().auth.getUser()` | Multiple pages | Use same pattern for guest redirect |
