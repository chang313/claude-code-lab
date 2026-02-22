# Implementation Plan: KakaoTalk Share Feature

**Branch**: `023-kakao-share` | **Date**: 2026-02-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/023-kakao-share/spec.md`

## Summary

Add KakaoTalk sharing to the restaurant wishlist service. Users can share the service homepage via a button in the app header (P1) and share their own wishlist/profile page from their profile (P2). Sharing uses the Kakao JS SDK (`Kakao.Share.sendDefault()`), with a clipboard fallback when the SDK is unavailable. All share messages are in Korean. No new database tables or API routes are required.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Kakao JS SDK (`developers.kakao.com/sdk/js/kakao.min.js`), Next.js 16 (App Router), React 19
**Storage**: None (stateless feature — no DB changes)
**Testing**: Vitest + React Testing Library (unit tests only, per project convention)
**Target Platform**: Mobile web (KakaoTalk users on iOS/Android browsers)
**Performance Goals**: Share dialog opens within 1 second of button tap (SDK already loaded at page init)
**Constraints**: Bundle size increase from Kakao JS SDK (~70KB minified, ~25KB gzipped) — justified as a feature requirement. Constitution Principle IV: requires PR justification.
**Scale/Scope**: Client-side only. 2 modified components, 2 new source files, 1 new test file.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | ✅ Pass | `kakao-share.ts` has single responsibility; no dead code |
| II. Testing Standards | ✅ Pass | Unit tests written before implementation; `shareService` and `shareProfile` are pure functions mockable in Vitest |
| III. UX Consistency | ✅ Pass | Uses existing `Toast` component; share button follows existing icon-button pattern from TopBar |
| IV. Performance Requirements | ⚠️ Justified | Kakao JS SDK adds ~25KB gzipped to bundle. Justified: required for KakaoTalk Share API. Document in PR. |
| V. Simplicity | ✅ Pass | Direct SDK call; no abstraction layers; no new dependencies beyond required SDK |

**Complexity Tracking** (Principle IV bundle size):

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| ~25KB gzipped Kakao JS SDK | KakaoTalk Share requires it | No alternative client SDK exists; Web Share API doesn't open KakaoTalk specifically |

## Project Structure

### Documentation (this feature)

```text
specs/023-kakao-share/
├── plan.md              ← This file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── kakao-share-sdk.md  ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code Changes

```text
src/
├── lib/
│   └── kakao-share.ts          NEW — Share SDK wrapper (shareService, shareProfile, isKakaoShareAvailable)
├── components/
│   ├── KakaoScript.tsx         MODIFY — also load Kakao JS SDK + call Kakao.init()
│   ├── TopBar.tsx              MODIFY — add share icon button (P1 service share)
│   ├── ProfileHeader.tsx       MODIFY — add share button when isOwnProfile === true (P2 profile share)
│   └── ShareButton.tsx         NEW — reusable button that calls kakao-share.ts and shows Toast

tests/unit/
└── kakao-share.test.ts         NEW — unit tests for shareService, shareProfile, isKakaoShareAvailable
```

**Structure Decision**: Follows existing Next.js web app pattern (Option 2 from template, single repo). No new directories — new files fit naturally into `src/lib/` and `src/components/`.

## Implementation Phases

### Phase 1: SDK Loading & Core Utility

**Goal**: Load the Kakao JS SDK and expose typed share functions. Tests written first.

**Test-first** (`tests/unit/kakao-share.test.ts`):
- `isKakaoShareAvailable()` returns false when `window.Kakao` is undefined
- `shareService()` calls `Kakao.Share.sendDefault()` with correct Korean message when SDK available
- `shareService()` falls back to `navigator.clipboard.writeText()` when SDK unavailable
- `shareProfile()` constructs correct dynamic title/description from userId, name, count
- `shareProfile()` falls back to clipboard with profile URL when SDK unavailable

**Implementation** (`src/lib/kakao-share.ts`):
```
export const SERVICE_URL = "https://claude-code-lab.vercel.app"

export function isKakaoShareAvailable(): boolean

export async function shareService(): Promise<ShareResult>
  → calls Kakao.Share.sendDefault(SERVICE_MESSAGE)
  → fallback: navigator.clipboard.writeText(SERVICE_URL)

export async function shareProfile(userId, displayName, wishlistCount): Promise<ShareResult>
  → calls Kakao.Share.sendDefault(buildProfileMessage(...))
  → fallback: navigator.clipboard.writeText(`${SERVICE_URL}/users/${userId}`)
```

**Modify** (`src/components/KakaoScript.tsx`):
- Add second `<script>` injection for `https://developers.kakao.com/sdk/js/kakao.min.js`
- After load: `if (!Kakao.isInitialized()) Kakao.init(NEXT_PUBLIC_KAKAO_JS_KEY)`
- Guard against double-init (idempotent)

### Phase 2: ShareButton Component

**Goal**: Reusable button component. Handles auth check, loading state, and toast feedback.

**Implementation** (`src/components/ShareButton.tsx`):
```
Props: { type: "service" | "profile", userId?, displayName?, wishlistCount?, onResult }
- On click: check auth via createClient().auth.getUser()
  - No session → router.push("/login")
  - Has session → call shareService() or shareProfile()
- Show spinner during in-flight (pointer-events-none)
- Call onResult({ message, type }) with Korean toast text
```

**Toast messages**:
- Kakao SDK share triggered: no toast (SDK dialog handles feedback)
- Clipboard fallback success: `"링크가 복사되었습니다"` (success)
- Clipboard failure: `"링크 복사에 실패했습니다"` (error)

### Phase 3: Header Integration (P1)

**Goal**: Place share button in `TopBar.tsx` header.

**Modify** (`src/components/TopBar.tsx`):
- Add `ShareButton` between the app title and the notification bell
- Use a share icon (SVG, matches existing bell icon style)
- `onResult` sets local toast state in TopBar
- TopBar renders `Toast` when toast state is set

### Phase 4: Profile Integration (P2)

**Goal**: Place share button in `ProfileHeader.tsx` for own profile only.

**Modify** (`src/components/ProfileHeader.tsx`):
- Render `<ShareButton type="profile" ... />` only when `isOwnProfile === true`
- Pass `userId`, `displayName`, `wishlistCount` from existing profile data
- `onResult` sets local toast state in ProfileHeader
- ProfileHeader renders `Toast` when toast state is set

**Note**: `wishlistCount` must be available in `ProfileHeader`. Check whether `UserProfileWithCounts` is already passed — if not, thread the prop from `UserProfileView`.

### Phase 5: Verification

```bash
cd ../023-kakao-share
pnpm test                        # All unit tests pass
pnpm build                       # No TypeScript errors, no bundle warnings beyond expected
tsc --noEmit || pnpm build       # Type check
```

Manual verification checklist:
- [ ] Header share button visible when logged in
- [ ] Header share button visible when logged out; tap → redirects to `/login`
- [ ] KakaoTalk dialog opens on mobile
- [ ] Desktop: clipboard fallback fires, toast appears
- [ ] Profile share button visible on `/my`, not visible on `/users/[other-id]`
- [ ] Profile share message includes correct name and restaurant count

## Dependency Map

```
Phase 1 (SDK + utility)
  ↓
Phase 2 (ShareButton component)
  ↓                    ↓
Phase 3 (TopBar P1)   Phase 4 (ProfileHeader P2)
  ↓                    ↓
Phase 5 (Verification — both branches)
```

Phases 3 and 4 can be developed in parallel once Phase 2 is complete.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Kakao JS SDK conflicts with Maps SDK (both set `window.Kakao`) | Load Maps SDK first; load Kakao JS SDK second; both use same key. Guard with `Kakao.isInitialized()`. |
| SDK not loaded when share button tapped (race condition) | Clipboard fallback handles this case gracefully |
| `wishlistCount` not available in ProfileHeader | Thread from `UserProfileWithCounts` — already fetched by `useProfile` hook |
| Share link pointing to `/` requires auth (redirect to login) | Documented behavior; acceptable for invite flow |
