# Quickstart: KakaoTalk Share Feature (023)

## Prerequisites

- Node.js 20+, pnpm installed
- Kakao Developer Console: JS key already registered (same key used for Maps/OAuth)
- `NEXT_PUBLIC_KAKAO_JS_KEY` set in `.env.local`

## Local Dev Setup

```bash
cd ../023-kakao-share   # enter the feature worktree
pnpm install            # dependencies already installed
pnpm dev                # start dev server at localhost:3000
```

## No Database Migration Required

This feature adds no new tables. Skip the Supabase SQL Editor step.

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/kakao-share.ts` | Share SDK wrapper (`shareService`, `shareProfile`) |
| `src/components/ShareButton.tsx` | Reusable share button with fallback |
| `tests/unit/kakao-share.test.ts` | Unit tests for share utility |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/KakaoScript.tsx` | Also load Kakao JS SDK (`developers.kakao.com/sdk/js/kakao.min.js`) and call `Kakao.init()` |
| `src/components/TopBar.tsx` | Add share icon button (P1 — service share) |
| `src/components/ProfileHeader.tsx` | Add share button when `isOwnProfile === true` (P2 — profile share) |

## Testing the Share Flow Locally

1. Open `http://localhost:3000` and log in.
2. Tap the share button in the header → KakaoTalk share dialog should open (on mobile) or clipboard fallback should trigger (on desktop Chrome).
3. Verify clipboard fallback: Open DevTools → disable the Kakao script → tap share → toast "링크가 복사되었습니다" should appear.
4. Navigate to `/my` → tap the profile share button → verify the shared URL is `http://localhost:3000/users/{your-id}`.

## Key Environment Variables

| Variable | Used For |
|----------|----------|
| `NEXT_PUBLIC_KAKAO_JS_KEY` | Kakao JS SDK init (same key as Maps) |

No new environment variables are required.

## Vercel Deployment Checklist

- [ ] `NEXT_PUBLIC_KAKAO_JS_KEY` already set in Vercel — no change needed
- [ ] No new OAuth redirect URIs required (share is client-to-client, no server callback)
- [ ] No DB migration needed
- [ ] Run `/verify-build` before PR
